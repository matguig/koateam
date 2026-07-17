// Worker éphémère (SPEC-V1 §5.2) : un processus par intervention, tué à la fin.
// Il ne détient AUCUNE clé API : chaque complétion LLM passe par le démon
// (RPC JSON sur stdio), qui vérifie le budget avant l'appel et comptabilise après.

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, normalize } from 'node:path'
import { createInterface } from 'node:readline'
import type { ChatMessage } from './providers.js'

interface Mission {
  id: string
  goal: string
  model: string
  role: 'ceo' | 'specialist' | 'ronde'
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

const SYSTEM_SPECIALIST = `Tu es un employé virtuel KoaTeam. Tu travailles dans une zone de travail dédiée.
Réponds UNIQUEMENT par un objet JSON, sans autre texte :
- {"action":"tool","tool":"write_file","args":{"path":"...","content":"..."}} pour écrire un fichier
- {"action":"tool","tool":"read_file","args":{"path":"..."}} pour lire un fichier
- {"action":"tool","tool":"list_files","args":{}} pour lister la zone de travail
- {"action":"final","report":"..."} quand la mission est terminée (rapport bref).`

const SYSTEM_CEO = `RÔLE : CEO. Tu es le CEO virtuel d'un workspace KoaTeam. On te confie une tâche :
évalue-la, découpe-la en sous-tâches et assigne chacune à un département.
Réponds UNIQUEMENT par un objet JSON, sans autre texte :
- {"action":"create_subtask","args":{"title":"...","department":"Marketing|Dev"}} pour déléguer une sous-tâche
- {"action":"final","report":"..."} quand la décomposition est complète (note d'évaluation : complexité, % du budget).`

const SYSTEM_RONDE = `RÔLE : RONDE. Tu es le CEO virtuel : c'est ta ronde de suivi périodique.
On te donne l'état de l'entreprise ; produis un court rapport de situation pour le propriétaire.
Réponds UNIQUEMENT par : {"action":"final","report":"..."}`

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
  const system = mission.role === 'ceo' ? SYSTEM_CEO : mission.role === 'ronde' ? SYSTEM_RONDE : SYSTEM_SPECIALIST

  const rl = createInterface({ input: process.stdin })
  rl.on('line', (line) => {
    try {
      const msg = JSON.parse(line) as RpcResponse
      pending.get(msg.id)?.(msg)
      pending.delete(msg.id)
    } catch { /* ligne non-RPC ignorée */ }
  })

  const messages: ChatMessage[] = [{ role: 'user', content: mission.goal }]
  const MAX_STEPS = 10

  for (let step = 0; step < MAX_STEPS; step++) {
    notify('stats', { rss: process.memoryUsage().rss })
    const res = await rpc('llm.complete', { model: mission.model, system, messages })

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
      parsed = JSON.parse(content)
    } catch {
      messages.push({ role: 'user', content: 'Réponse invalide : réponds uniquement en JSON conforme au protocole.' })
      continue
    }

    if (parsed.action === 'final') {
      notify('report', { status: 'done', report: parsed.report ?? '' })
      process.exit(0)
    }
    if (parsed.action === 'create_subtask' && mission.role === 'ceo') {
      const r = await rpc('task.create_subtask', parsed.args ?? {})
      messages.push({ role: 'user', content: r.error ? `ERREUR : ${r.error}` : `OK, sous-tâche créée (${r.result?.subtaskId}).` })
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
    }
  }

  notify('report', { status: 'failed', report: `Limite de ${MAX_STEPS} étapes atteinte sans rapport final.` })
  process.exit(1)
}
