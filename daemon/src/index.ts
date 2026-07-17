// Démon KoaTeam (SPEC-V1 §5.2/§5.3) — le seul processus qui tourne 24/7.
// Minimal par contrat : file de missions, proxy comptable LLM, watchdog mémoire.
// Les employés « dorment » (état sur disque) ; chaque mission = un worker
// éphémère spawné puis tué — la RAM revient au niveau de repos à chaque fois.
//
// Ce même binaire relancé avec --worker devient le worker : indispensable
// pour l'empaquetage sidecar Tauri (un seul exécutable embarqué).

import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { Ledger } from './ledger.js'
import { costOf } from './pricing.js'
import { buildRegistry } from './providers.js'

// Pas de top-level await : le fichier doit rester bundlable en CJS
// (esbuild → @yao-pkg/pkg → binaire sidecar unique pour Tauri).
if (process.argv.includes('--worker')) {
  import('./worker.js').then((m) => m.runWorker())
} else {
  main()
}

interface Mission {
  id: string
  goal: string
  model: string
  budget: number
  status: 'queued' | 'running' | 'done' | 'paused_budget' | 'failed'
  report?: string
  cost?: number
  workerPeakRss?: number
}

function main(): void {
  const PORT = Number(process.env.KOATEAM_PORT ?? 4750)
  const DATA_DIR = process.env.KOATEAM_DATA ?? join(tmpdir(), 'koateam-spike')
  const WATCHDOG_LIMIT = Number(process.env.KOATEAM_RSS_LIMIT ?? 300 * 1024 * 1024)

  const ledger = new Ledger(DATA_DIR)
  const providers = buildRegistry()
  const missions = new Map<string, Mission>()
  const queue: Mission[] = []
  let running = false
  let missionsDone = 0
  let peakRss = 0
  let watchdogAlerts = 0

  // Ronde technique du démon (SPEC-V1 §3.7) : du code, pas du LLM, coût zéro.
  setInterval(() => {
    const rss = process.memoryUsage().rss
    peakRss = Math.max(peakRss, rss)
    if (rss > WATCHDOG_LIMIT) {
      watchdogAlerts++
      console.error(`[watchdog] RSS ${(rss / 1e6).toFixed(0)} Mo > limite — un vrai démon se redémarrerait proprement ici (état 100 % sur disque)`)
    }
  }, 1000).unref()

  function providerFor(model: string) {
    const name = model.startsWith('mock') ? 'mock' : model.startsWith('claude') ? 'anthropic' : 'local'
    const p = providers.get(name)
    if (!p) throw new Error(`provider indisponible : ${name} (clé API absente ?)`)
    return p
  }

  function runNext(): void {
    if (running) return
    const mission = queue.shift()
    if (!mission) return
    running = true
    mission.status = 'running'

    // En dev : node dist/index.js --worker · empaqueté (SEA) : ./daemon --worker
    // (dans un binaire SEA, argv[1] n'est pas un script — on ne le repasse pas)
    const script = process.argv[1]
    const args = [...(script?.match(/\.(c|m)?js$/) ? [script] : []), '--worker']
    const child = spawn(process.execPath, args, {
      env: {
        ...process.env,
        KOATEAM_MISSION: JSON.stringify({
          id: mission.id,
          goal: mission.goal,
          model: mission.model,
          workzone: join(DATA_DIR, 'workzones', mission.id),
        }),
      },
      stdio: ['pipe', 'pipe', 'inherit'],
    })

    const rl = createInterface({ input: child.stdout })
    rl.on('line', (line) => {
      let msg: { id?: number; method: string; params: Record<string, unknown> }
      try {
        msg = JSON.parse(line)
      } catch {
        return
      }

      if (msg.method === 'stats') {
        mission.workerPeakRss = Math.max(mission.workerPeakRss ?? 0, Number(msg.params.rss))
        return
      }

      if (msg.method === 'report') {
        mission.status = msg.params.status as Mission['status']
        mission.report = String(msg.params.report)
        return
      }

      if (msg.method === 'llm.complete' && msg.id !== undefined) {
        const { missionId, model, system, messages } = msg.params as {
          missionId: string; model: string; system: string
          messages: { role: 'user' | 'assistant'; content: string }[]
        }
        // Garde-fou budgétaire DUR, vérifié AVANT l'appel (SPEC-V1 §3.6)
        if (ledger.spentOn(missionId) >= mission.budget) {
          child.stdin.write(JSON.stringify({ id: msg.id, error: 'budget_exceeded' }) + '\n')
          return
        }
        providerFor(model)
          .complete(model, system, messages)
          .then((res) => {
            const cost = costOf(model, res.inputTokens, res.outputTokens)
            ledger.append({
              type: 'consumption', amount: cost, missionId,
              detail: { model, inputTokens: res.inputTokens, outputTokens: res.outputTokens },
            })
            child.stdin.write(JSON.stringify({ id: msg.id, result: { content: res.content, cost } }) + '\n')
          })
          .catch((e) => {
            child.stdin.write(JSON.stringify({ id: msg.id, error: String(e) }) + '\n')
          })
      }
    })

    child.on('exit', () => {
      if (mission.status === 'running') mission.status = 'failed'
      mission.cost = ledger.spentOn(mission.id)
      missionsDone++
      running = false
      runNext() // le worker est mort, sa RAM est rendue à l'OS — mission suivante
    })
  }

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    res.setHeader('content-type', 'application/json')

    if (req.method === 'GET' && url.pathname === '/status') {
      res.end(JSON.stringify({
        rss: process.memoryUsage().rss,
        peakRss,
        watchdogAlerts,
        missionsDone,
        running,
        queued: queue.length,
        totals: ledger.totals(),
      }))
      return
    }
    if (req.method === 'GET' && url.pathname === '/missions') {
      res.end(JSON.stringify([...missions.values()]))
      return
    }
    if (req.method === 'GET' && url.pathname === '/ledger') {
      res.end(JSON.stringify(ledger.all()))
      return
    }
    if (req.method === 'POST' && url.pathname === '/mission') {
      let body = ''
      req.on('data', (c) => (body += c))
      req.on('end', () => {
        const { goal, model = 'mock-fast', budget = 0.05 } = JSON.parse(body || '{}')
        const mission: Mission = {
          id: `m${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          goal, model, budget, status: 'queued',
        }
        missions.set(mission.id, mission)
        ledger.append({ type: 'allocation', amount: budget, missionId: mission.id })
        queue.push(mission)
        runNext()
        res.end(JSON.stringify({ id: mission.id }))
      })
      return
    }
    res.statusCode = 404
    res.end(JSON.stringify({ error: 'not found' }))
  })

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[koateam-daemon] écoute sur http://127.0.0.1:${PORT} · données : ${DATA_DIR}`)
    console.log(`[koateam-daemon] providers : ${[...providers.keys()].join(', ')}`)
  })
}
