// Démon KoaTeam (SPEC-V1 §5.2/§5.3) — le seul processus qui tourne 24/7.
// Minimal par contrat : SQLite, file d'interventions, proxy comptable LLM,
// watchdog mémoire, API locale (HTTP + WebSocket).
//
// Ce même binaire relancé avec --worker devient le worker éphémère :
// indispensable pour l'empaquetage sidecar Tauri (un seul exécutable).

import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openDb } from './db.js'
import { Foundation } from './foundation.js'
import { InterventionRunner } from './interventions.js'
import { buildRegistry } from './providers.js'
import { RitualScheduler } from './rituals.js'
import { ensureSeeded } from './seed.js'
import { createApi } from './server.js'
import { Store } from './store.js'

// Pas de top-level await : le fichier doit rester bundlable en CJS
// (esbuild → binaire SEA sidecar unique).
if (process.argv.includes('--worker')) {
  import('./worker.js').then((m) => m.runWorker())
} else {
  main()
}

function main(): void {
  const PORT = Number(process.env.KOATEAM_PORT ?? 4750)
  const DATA_DIR = process.env.KOATEAM_DATA ?? join(tmpdir(), 'koateam-data')
  const WATCHDOG_LIMIT = Number(process.env.KOATEAM_RSS_LIMIT ?? 300 * 1024 * 1024)

  const db = openDb(DATA_DIR)
  const store = new Store(db)
  // Sans workspace, l'app démarre sur la fondation (cabinet de recrutement).
  // KOATEAM_SEED=demo amorce l'entreprise de démonstration (tests, endurance).
  if (process.env.KOATEAM_SEED === 'demo') ensureSeeded(store)
  const providers = buildRegistry(store.settingGet('anthropic_api_key'))

  let peakRss = 0
  let watchdogAlerts = 0

  const runner = new InterventionRunner(store, providers, DATA_DIR, () => api.broadcast())
  // Gamme de modèles à l'embauche (SPEC-V1 §3.2) : vrais modèles Claude dès
  // que la clé Anthropic est configurée — sonnet pour la direction, haiku
  // pour l'exécution — sinon provider de démonstration.
  const foundation = new Foundation(store, () =>
    providers.has('anthropic')
      ? { ceo: 'claude-sonnet-5', head: 'claude-haiku-4-5-20251001', specialist: 'claude-haiku-4-5-20251001' }
      : { ceo: 'mock-fast', head: 'mock-fast', specialist: 'mock-fast' },
  )
  const rituals = new RitualScheduler(store, runner, () => api.broadcast())
  const api = createApi({
    store, runner, foundation, providers, startedAt: Date.now(),
    peakRss: () => peakRss,
    watchdogAlerts: () => watchdogAlerts,
  })
  rituals.start()

  // Récupération au démarrage : un kill/crash en pleine tâche ne doit rien
  // perdre — les tâches interrompues repartent (l'état est 100 % SQLite).
  const wsBoot = store.getWorkspace()
  if (wsBoot) {
    for (const t of store.listTasks(wsBoot.id).filter((t) => !t.parent_id)) {
      if (['planning', 'in_progress'].includes(t.status)) {
        console.log(`[recovery] reprise de « ${t.title} » (interrompue en ${t.status})`)
        runner.resumeTask(t.id)
      }
    }
  }

  // Ronde technique du démon (SPEC-V1 §3.7) : du code, pas du LLM, coût zéro.
  setInterval(() => {
    const rss = process.memoryUsage().rss
    peakRss = Math.max(peakRss, rss)
    if (rss > WATCHDOG_LIMIT) {
      watchdogAlerts++
      console.error(`[watchdog] RSS ${(rss / 1e6).toFixed(0)} Mo > limite — redémarrage propre requis (état 100 % SQLite)`)
    }
  }, 1000).unref()

  api.server.listen(PORT, '127.0.0.1', () => {
    const ws = store.getWorkspace()
    console.log(`[koateam-daemon] http+ws sur 127.0.0.1:${PORT} · données : ${DATA_DIR}`)
    console.log(`[koateam-daemon] ${ws ? `workspace « ${ws.name} »` : 'aucun workspace (fondation en attente)'} · providers : ${[...providers.keys()].join(', ')}`)
  })
}
