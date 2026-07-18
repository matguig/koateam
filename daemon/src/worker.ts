// Worker éphémère (SPEC-V1 §5.2) : un processus par intervention, tué à la fin.
// Il ne détient AUCUNE clé API : chaque complétion LLM passe par le démon
// (RPC JSON sur stdio), qui vérifie le budget avant l'appel et comptabilise après.
// Le prompt système (identité, caractère, protocole) est construit par le démon.

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, normalize } from 'node:path'
import { createInterface } from 'node:readline'
import type { ChatMessage } from './providers.js'

interface Mission {
  id: string
  goal: string
  model: string
  role: 'ceo' | 'specialist' | 'ronde' | 'manager' | 'review' | 'farewell'
  system: string
  workzone: string
}

interface RpcResponse {
  id: number
  result?: Record<string, unknown> & { content?: string }
  error?: string
}

const pending = new Map<number, (r: RpcResponse) => void>()
let nextId = 1

function rpc(method: string, params: unknown): Promise<RpcResponse> {
  const id = nextId++
  process.stdout.write(JSON.stringify({ id, method, params }) + '\n')
  return new Promise((resolve) => pending.set(id, resolve))
}

function notify(method: string, params: unknown): void {
  process.stdout.write(JSON.stringify({ method, params }) + '\n')
}

function runTool(workzone: string, tool: string, args: Record<string, string>): string {
  const safe = (p: string) => {
    const full = normalize(join(workzone, p))
    if (!full.startsWith(normalize(workzone))) throw new Error('chemin hors zone de travail')
    return full
  }
  switch (tool) {
    case 'write_file':
      writeFileSync(safe(args.path), args.content, 'utf8')
      return `OK · ${args.path} écrit (${args.content.length} caractères)`
    case 'read_file':
      return readFileSync(safe(args.path), 'utf8').slice(0, 4000)
    case 'list_files':
      return readdirSync(workzone).join('\n') || '(vide)'
    default:
      return `outil inconnu : ${tool}`
  }
}

export async function runWorker(): Promise<void> {
  const mission: Mission = JSON.parse(process.env.KOATEAM_MISSION ?? '{}')
  mkdirSync(mission.workzone, { recursive: true })

  const rl = createInterface({ input: process.stdin })
  rl.on('line', (line) => {
    try {
      const msg = JSON.parse(line) as RpcResponse
      pending.get(msg.id)?.(msg)
      pending.delete(msg.id)
    } catch { /* ligne non-RPC ignorée */ }
  })

  const messages: ChatMessage[] = [{ role: 'user', content: mission.goal }]
  const MAX_STEPS = 12

  for (let step = 0; step < MAX_STEPS; step++) {
    notify('stats', { rss: process.memoryUsage().rss })
    const res = await rpc('llm.complete', { model: mission.model, system: mission.system, messages })

    if (res.error === 'budget_exceeded') {
      notify('report', { status: 'paused_budget', report: `Budget épuisé à l'étape ${step + 1} — pause propre.` })
      process.exit(0)
    }
    if (res.error || !res.result?.content) {
      notify('report', { status: 'failed', report: `Erreur LLM : ${res.error ?? 'réponse vide'}` })
      process.exit(1)
    }

    const content = String(res.result.content)
    messages.push({ role: 'assistant', content })

    let parsed: { action: string; tool?: string; args?: Record<string, string>; report?: string }
    try {
      // tolère un modèle qui entoure le JSON de texte ou de ```
      const match = content.match(/\{[\s\S]*\}/)
      parsed = JSON.parse(match ? match[0] : content)
    } catch {
      messages.push({ role: 'user', content: 'Réponse invalide : réponds uniquement par un objet JSON conforme au protocole.' })
      continue
    }

    if (parsed.action === 'final') {
      notify('report', { status: 'done', report: parsed.report ?? '' })
      process.exit(0)
    }

    // Spécialiste : escalade d'une question — l'intervention s'arrête proprement,
    // la hiérarchie prend le relais (SPEC-V1 §3.5)
    if (parsed.action === 'ask' && mission.role === 'specialist') {
      notify('report', { status: 'blocked', report: parsed.args?.question ?? 'Question sans texte' })
      process.exit(0)
    }

    // Manager : répondre à la question d'un subordonné, ou l'escalader
    if (mission.role === 'manager') {
      if (parsed.action === 'answer') {
        notify('report', { status: 'answered', report: parsed.args?.answer ?? '' })
        process.exit(0)
      }
      if (parsed.action === 'escalate') {
        notify('report', { status: 'escalated', report: parsed.args?.reason ?? '' })
        process.exit(0)
      }
    }

    // Manager en revue : approuver le livrable d'un subordonné, ou le rejeter
    if (mission.role === 'review') {
      if (parsed.action === 'approve') {
        notify('report', { status: 'approved', report: parsed.args?.comment ?? 'Validé.' })
        process.exit(0)
      }
      if (parsed.action === 'reject') {
        notify('report', { status: 'rejected', report: parsed.args?.feedback ?? 'À retravailler.' })
        process.exit(0)
      }
    }

    // CEO : embauche d'un spécialiste (arbitrage coût/modèle)
    if (parsed.action === 'hire' && mission.role === 'ceo') {
      const r = await rpc('org.hire', parsed.args ?? {})
      messages.push({
        role: 'user',
        content: r.error ? `ERREUR embauche : ${r.error}` : `OK, ${r.result?.name} embauché(e) (${r.result?.model}).`,
      })
      continue
    }

    if (parsed.action === 'create_subtask' && mission.role === 'ceo') {
      const r = await rpc('task.create_subtask', parsed.args ?? {})
      messages.push({ role: 'user', content: r.error ? `ERREUR : ${r.error}` : `OK, sous-tâche créée et assignée à ${r.result?.assignee ?? '?'}.` })
      continue
    }

    if (parsed.action === 'tool' && parsed.tool) {
      let output: string
      try {
        output = runTool(mission.workzone, parsed.tool, parsed.args ?? {})
      } catch (e) {
        output = `ERREUR outil : ${(e as Error).message}`
      }
      notify('event', { kind: 'outil', text: `${parsed.tool} → ${output.slice(0, 120)}` })
      messages.push({ role: 'user', content: `Résultat de ${parsed.tool} : ${output}` })
      continue
    }

    messages.push({ role: 'user', content: `Action « ${parsed.action} » non autorisée pour ton rôle. Actions valides listées dans tes instructions.` })
  }

  notify('report', { status: 'failed', report: `Limite de ${MAX_STEPS} étapes atteinte sans rapport final.` })
  process.exit(1)
}
