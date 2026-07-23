// API locale du démon : HTTP (état, actions) + WebSocket (poussée de
// changements vers l'UI). Écoute uniquement sur 127.0.0.1.

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { WebSocketServer, WebSocket } from 'ws'
import type { CliAgent } from './cliAgents.js'
import type { Foundation } from './foundation.js'
import type { InterventionRunner } from './interventions.js'
import { applyAnthropicKey } from './providers.js'
import type { Provider } from './providers.js'
import type { Store } from './store.js'

export interface ApiContext {
  store: Store
  runner: InterventionRunner
  foundation: Foundation
  providers: Map<string, Provider>
  startedAt: number
  peakRss: () => number
  watchdogAlerts: () => number
  cliAgents: () => CliAgent[]
  redetectCli: () => Promise<CliAgent[]>
}

export function createApi(ctx: ApiContext) {
  const { store, runner, foundation } = ctx

  const state = () => {
    const ws = store.getWorkspace()
    if (!ws) {
      return {
        workspace: null, employees: [], tasks: [], inbox: [],
        totals: { consumption: 0, allocation: 0, release: 0, topup: 0 },
        ledger: [], messages: [], questions: [],
        settings: settingsView(),
      }
    }
    const employees = store.listEmployees(ws.id).map((e) => ({
      ...e, spent: store.spentByEmployee(e.id),
    }))
    // L'état courant ne transporte pas tout l'historique : les tâches
    // archivées au-delà des 10 dernières en sortent (sinon la réponse — et
    // le tas V8 du démon — grossit sans borne ; trouvé par la nightly 200).
    const allMain = store.listTasks(ws.id).filter((t) => !t.parent_id)
    const archived = allMain.filter((t) => t.status === 'archived')
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 10)
    const tasks = [...allMain.filter((t) => t.status !== 'archived'), ...archived]
      .map((t) => ({
        ...t,
        spent: store.spentOnTask(t.id),
        subtasks: store.subtasksOf(t.id).map((s) => ({ ...s })),
      }))
    return {
      workspace: ws,
      employees,
      tasks,
      inbox: store.inboxList(ws.id),
      totals: store.ledgerTotals(ws.id),
      ledger: store.ledgerRecent(ws.id),
      messages: store.messagesRecent(ws.id),
      questions: store.questionsAll(ws.id),
      settings: settingsView(),
    }
  }

  const settingsView = () => ({
    anthropicConfigured: ctx.providers.has('anthropic'),
    ritualTickMinutes: Number(store.settingGet('ritual_tick_minutes') ?? 60),
    morningReportTime: store.settingGet('morning_report_time') ?? '09:00',
    cliAgents: ctx.cliAgents(),
  })

  const json = (res: ServerResponse, code: number, body: unknown) => {
    res.statusCode = code
    res.setHeader('content-type', 'application/json')
    res.setHeader('access-control-allow-origin', '*')
    res.setHeader('access-control-allow-headers', 'content-type')
    res.end(JSON.stringify(body))
  }

  const readBody = (req: IncomingMessage): Promise<Record<string, unknown>> =>
    new Promise((resolve) => {
      let b = ''
      req.on('data', (c) => (b += c))
      req.on('end', () => {
        try { resolve(JSON.parse(b || '{}')) } catch { resolve({}) }
      })
    })

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const path = url.pathname
    if (req.method === 'OPTIONS') {
      res.setHeader('access-control-allow-origin', '*')
      res.setHeader('access-control-allow-methods', 'GET,POST')
      res.setHeader('access-control-allow-headers', 'content-type')
      res.end()
      return
    }

    try {
      if (req.method === 'GET' && path === '/status') {
        const mem = process.memoryUsage()
        return json(res, 200, {
          rss: mem.rss,
          heapUsed: mem.heapUsed,
          heapTotal: mem.heapTotal,
          external: mem.external,
          arrayBuffers: mem.arrayBuffers,
          peakRss: ctx.peakRss(),
          watchdogAlerts: ctx.watchdogAlerts(),
          interventionsDone: runner.interventionsDone,
          workerPeakRss: runner.lastWorkerRss,
          uptimeMs: Date.now() - ctx.startedAt,
        })
      }
      if (req.method === 'GET' && path === '/state') return json(res, 200, state())
      if (req.method === 'GET' && path === '/traces') {
        const ws = store.getWorkspace()
        return json(res, 200, ws ? store.tracesRecent(ws.id) : [])
      }

      // --- fondation (cabinet de recrutement) ---
      if (req.method === 'GET' && path === '/foundation') {
        return json(res, 200, { greeting: foundation.greeting(), hasWorkspace: !!store.getWorkspace() })
      }
      if (req.method === 'POST' && path === '/foundation/message') {
        const b = await readBody(req)
        return json(res, 200, foundation.message(String(b.text ?? '')))
      }
      if (req.method === 'POST' && path === '/foundation/sign') {
        if (store.getWorkspace()) return json(res, 409, { error: 'un workspace existe déjà (multi-workspaces : V2)' })
        const b = await readBody(req)
        const ws = foundation.sign({
          ceoIndex: Number(b.ceoIndex ?? 0),
          traits: Array.isArray(b.traits) ? (b.traits as number[]) : undefined,
          name: b.name ? String(b.name) : undefined,
          mission: b.mission ? String(b.mission) : undefined,
          budget: b.budget !== undefined ? Number(b.budget) : undefined,
          departments: Array.isArray(b.departments) ? (b.departments as string[]) : undefined,
        })
        broadcast()
        return json(res, 200, { workspaceId: ws.id })
      }

      // --- réglages ---
      if (req.method === 'GET' && path === '/settings') return json(res, 200, settingsView())
      if (req.method === 'POST' && path === '/settings') {
        const b = await readBody(req)
        if (b.redetect_cli) {
          await ctx.redetectCli()
        }
        if (typeof b.anthropic_api_key === 'string') {
          // M2 : stockée dans la base locale ; trousseau système prévu en M5
          const key = b.anthropic_api_key.trim()
          store.settingSet('anthropic_api_key', key)
          applyAnthropicKey(ctx.providers, key || null)
        }
        if (b.ritual_tick_minutes !== undefined) {
          const tick = Number(b.ritual_tick_minutes)
          // NaN stocké = ronde managériale morte : on ignore les valeurs invalides
          if (Number.isFinite(tick) && tick >= 1) {
            store.settingSet('ritual_tick_minutes', String(Math.round(tick)))
          }
        }
        if (typeof b.morning_report_time === 'string' && /^\d{2}:\d{2}$/.test(b.morning_report_time)) {
          store.settingSet('morning_report_time', b.morning_report_time)
        }
        if (b.budget_amount !== undefined) {
          const budget = Number(b.budget_amount)
          const ws = store.getWorkspace()
          if (ws && Number.isFinite(budget) && budget > 0) {
            store.updateWorkspace(ws.id, { budget_amount: budget })
          }
        }
        broadcast()
        return json(res, 200, settingsView())
      }

      if (req.method === 'POST' && path === '/tasks') {
        const b = await readBody(req)
        const ws = store.getWorkspace()
        if (!ws) return json(res, 409, { error: 'aucun workspace — fondez d’abord l’entreprise' })
        const title = String(b.title ?? '').trim().slice(0, 200)
        if (!title) return json(res, 400, { error: 'titre requis' })
        const budget = Number(b.budget ?? 0.05)
        if (!Number.isFinite(budget) || budget <= 0) return json(res, 400, { error: 'budget invalide (doit être > 0)' })
        const task = store.createTask({
          workspace_id: ws.id,
          title,
          description: String(b.description ?? '').slice(0, 4000),
          objectives: (b.objectives as [string, boolean][]) ?? [],
          status: 'open',
          budget_allocated: budget,
        })
        store.ledgerAppend({ workspace_id: ws.id, type: 'allocation', amount: budget, task_id: task.id })
        runner.submitTask(task.id)
        broadcast()
        return json(res, 200, { id: task.id })
      }

      const taskAction = path.match(/^\/tasks\/([\w-]+)\/(archive|reopen|topup)$/)
      if (req.method === 'POST' && taskAction) {
        const [, id, action] = taskAction
        const task = store.getTask(id)
        const ws = store.getWorkspace()
        if (!task || !ws) return json(res, 404, { error: 'tâche inconnue' })

        if (action === 'archive') {
          // Garde anti-double archivage : une seule restitution possible
          if (!['done', 'paused_budget', 'open'].includes(task.status)) {
            return json(res, 409, { error: `archivage impossible depuis l'état ${task.status}` })
          }
          const remaining = task.budget_allocated - store.spentOnTask(id)
          if (remaining > 0) {
            store.ledgerAppend({ workspace_id: ws.id, type: 'release', amount: remaining, task_id: id })
          }
          store.updateTask(id, { status: 'archived' })
          // Fin de contrat des CDD recrutés pour cette tâche (décision 11)
          runner.onTaskArchived(id)
        }
        if (action === 'reopen') {
          if (!['done', 'paused_budget'].includes(task.status)) {
            return json(res, 409, { error: `réouverture impossible depuis l'état ${task.status}` })
          }
          runner.resumeTask(id)
        }
        if (action === 'topup') {
          const b = await readBody(req)
          const amount = Number(b.amount ?? 0.05)
          if (!Number.isFinite(amount) || amount <= 0) {
            return json(res, 400, { error: 'rallonge invalide (doit être > 0)' })
          }
          store.ledgerAppend({ workspace_id: ws.id, type: 'topup', amount, task_id: id })
          store.updateTask(id, { budget_allocated: task.budget_allocated + amount })
          runner.resumeTask(id)
        }
        broadcast()
        return json(res, 200, { ok: true })
      }

      const inboxAction = path.match(/^\/inbox\/([\w-]+)\/resolve$/)
      if (req.method === 'POST' && inboxAction) {
        store.inboxResolve(inboxAction[1])
        broadcast()
        return json(res, 200, { ok: true })
      }

      // Réveil d'un employé archivé (décision 11 : archivage réveillable)
      const wakeAction = path.match(/^\/employees\/([\w-]+)\/wake$/)
      if (req.method === 'POST' && wakeAction) {
        const emp = store.getEmployee(wakeAction[1])
        if (!emp) return json(res, 404, { error: 'employé inconnu' })
        if (emp.status !== 'archived') return json(res, 409, { error: 'déjà en poste' })
        store.wakeEmployee(emp.id)
        broadcast()
        return json(res, 200, { ok: true })
      }

      // Réponse du propriétaire à une question escaladée (SPEC-V1 §3.5)
      const questionAction = path.match(/^\/questions\/([\w-]+)\/answer$/)
      if (req.method === 'POST' && questionAction) {
        const b = await readBody(req)
        const answer = String(b.answer ?? '').trim()
        if (!answer) return json(res, 400, { error: 'réponse vide' })
        const q = store.questionGet(questionAction[1])
        if (!q) return json(res, 404, { error: 'question inconnue' })
        if (q.status === 'answered') return json(res, 409, { error: 'déjà répondue' })
        runner.answerQuestion(q.id, answer)
        broadcast()
        return json(res, 200, { ok: true })
      }

      return json(res, 404, { error: 'not found' })
    } catch (e) {
      return json(res, 500, { error: String(e) })
    }
  })

  // WebSocket : l'UI s'abonne, le démon pousse un signal à chaque changement
  const wss = new WebSocketServer({ server })
  const broadcast = () => {
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) client.send('{"type":"change"}')
    }
  }

  return { server, broadcast }
}
