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
  workzone: string
}

interface RpcResponse {
  id: number
  result?: { content: string; cost: number }
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

const SYSTEM = `Tu es un employé virtuel KoaTeam. Tu travailles dans une zone de travail dédiée.
Réponds UNIQUEMENT par un objet JSON, sans autre texte :
- {"action":"tool","tool":"write_file","args":{"path":"...","content":"..."}} pour écrire un fichier
- {"action":"tool","tool":"read_file","args":{"path":"..."}} pour lire un fichier
- {"action":"tool","tool":"list_files","args":{}} pour lister la zone de travail
- {"action":"final","report":"..."} quand la mission est terminée (rapport bref).`

function runTool(workzone: string, tool: string, args: Record<string, string>): string {
  // Garde-fou zone de travail : aucun chemin ne peut sortir du dossier de mission
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
  const MAX_STEPS = 8

  for (let step = 0; step < MAX_STEPS; step++) {
    notify('stats', { rss: process.memoryUsage().rss })
    const res = await rpc('llm.complete', { missionId: mission.id, model: mission.model, system: SYSTEM, messages })

    if (res.error === 'budget_exceeded') {
      notify('report', { status: 'paused_budget', report: `Budget de mission épuisé à l'étape ${step + 1} — pause propre.` })
      process.exit(0)
    }
    if (res.error || !res.result) {
      notify('report', { status: 'failed', report: `Erreur LLM : ${res.error ?? 'réponse vide'}` })
      process.exit(1)
    }

    messages.push({ role: 'assistant', content: res.result.content })

    let parsed: { action: string; tool?: string; args?: Record<string, string>; report?: string }
    try {
      parsed = JSON.parse(res.result.content)
    } catch {
      messages.push({ role: 'user', content: 'Réponse invalide : réponds uniquement en JSON conforme au protocole.' })
      continue
    }

    if (parsed.action === 'final') {
      notify('report', { status: 'done', report: parsed.report ?? '' })
      process.exit(0)
    }
    if (parsed.action === 'tool' && parsed.tool) {
      let output: string
      try {
        output = runTool(mission.workzone, parsed.tool, parsed.args ?? {})
      } catch (e) {
        output = `ERREUR outil : ${(e as Error).message}`
      }
      messages.push({ role: 'user', content: `Résultat de ${parsed.tool} : ${output}` })
    }
  }

  notify('report', { status: 'failed', report: `Limite de ${MAX_STEPS} étapes atteinte sans rapport final.` })
  process.exit(1)
}
