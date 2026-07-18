// Agents CLI locaux (brainstorming §5.2 « bring-your-own-CLI ») : si Claude
// Code ou Codex est installé sur la machine, KoaTeam les détecte et peut les
// embaucher comme employés — la CLI est pilotée en mode headless, cloisonnée
// dans la zone de travail de la tâche.

import { execFile, spawn } from 'node:child_process'

export interface CliAgent {
  /** identifiant utilisé comme « modèle » de l'employé */
  id: 'claude-code' | 'codex'
  label: string
  bin: string
  found: boolean
  version: string | null
}

export interface CliResult {
  ok: boolean
  report: string
  costUsd: number
  events: { kind: string; text: string }[]
}

const CANDIDATES: Omit<CliAgent, 'found' | 'version'>[] = [
  { id: 'claude-code', label: 'Claude Code (CLI locale)', bin: 'claude' },
  { id: 'codex', label: 'Codex (CLI locale)', bin: 'codex' },
]

function probe(bin: string): Promise<string | null> {
  return new Promise((resolve) => {
    const child = execFile(bin, ['--version'], { timeout: 5000 }, (err, stdout) => {
      resolve(err ? null : (stdout.trim().split('\n')[0] || 'version inconnue'))
    })
    child.on('error', () => resolve(null))
  })
}

/** Détection au démarrage (et re-détection à la demande depuis les réglages). */
export async function detectCliAgents(): Promise<CliAgent[]> {
  return Promise.all(
    CANDIDATES.map(async (c) => {
      const version = await probe(c.bin)
      return { ...c, found: version !== null, version }
    }),
  )
}

export function isCliModel(model: string): model is CliAgent['id'] {
  return model === 'claude-code' || model === 'codex'
}

/**
 * Exécute une intervention via la CLI, cloisonnée dans la zone de travail.
 * - Claude Code : mode headless `-p --output-format json`, outils fichiers
 *   uniquement (pas de shell sans votre accord — décision 15 de la spec),
 *   coût réel remonté par la CLI et imputé au ledger.
 * - Codex : `exec` en sandbox workspace-write, coût non exposé (0).
 */
export function runCliAgent(
  id: CliAgent['id'],
  prompt: string,
  workzone: string,
  timeoutMs = 10 * 60_000,
): Promise<CliResult> {
  const events: CliResult['events'] = []
  const [bin, args] =
    id === 'claude-code'
      ? ['claude', [
          '-p', prompt,
          '--output-format', 'json',
          '--allowedTools', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'LS',
        ]] as const
      : ['codex', ['exec', '--sandbox', 'workspace-write', '--skip-git-repo-check', prompt]] as const

  events.push({ kind: 'cli', text: `${bin} lancé en headless dans la zone de travail` })

  return new Promise((resolve) => {
    const child = spawn(bin, args as unknown as string[], {
      cwd: workzone,
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let out = ''
    let err = ''
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      child.kill('SIGKILL')
      events.push({ kind: 'cli', text: `délai dépassé (${Math.round(timeoutMs / 60000)} min) — processus tué` })
      resolve({ ok: false, report: 'Agent CLI interrompu : délai dépassé.', costUsd: 0, events })
    }, timeoutMs)

    child.stdout.on('data', (c) => { out += c })
    child.stderr.on('data', (c) => { err += c })
    child.on('error', (e) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve({ ok: false, report: `Impossible de lancer ${bin} : ${e.message}`, costUsd: 0, events })
    })
    child.on('exit', (code) => {
      if (settled) return
      settled = true
      clearTimeout(timer)

      if (id === 'claude-code') {
        try {
          const parsed = JSON.parse(out.trim().split('\n').filter(Boolean).at(-1) ?? '{}') as {
            subtype?: string; result?: string; total_cost_usd?: number
            num_turns?: number; usage?: { input_tokens?: number; output_tokens?: number }
          }
          const cost = Number(parsed.total_cost_usd ?? 0)
          events.push({ kind: 'cli', text: `${parsed.num_turns ?? '?'} tour(s) · coût rapporté par la CLI : ${cost.toFixed(4)} $` })
          resolve({
            ok: code === 0 && parsed.subtype === 'success',
            report: (parsed.result ?? '').slice(0, 2000) || `Sortie vide (code ${code}). ${err.slice(0, 300)}`,
            costUsd: Number.isFinite(cost) ? cost : 0,
            events,
          })
          return
        } catch {
          resolve({ ok: false, report: `Sortie CLI illisible (code ${code}) : ${(out || err).slice(0, 400)}`, costUsd: 0, events })
          return
        }
      }

      // codex : sortie texte, pas de coût structuré
      const text = out.trim().slice(-2000)
      resolve({
        ok: code === 0,
        report: text || `Sortie vide (code ${code}). ${err.slice(0, 300)}`,
        costUsd: 0,
        events,
      })
    })
  })
}
