// API locale du démon : HTTP (état, actions) + WebSocket (poussée de
// changements vers l'UI). Écoute uniquement sur 127.0.0.1.

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { WebSocketServer, WebSocket } from 'ws'
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
}

export function createApi(ctx: ApiContext) {
  const { store, runner, foundation } = ctx

  const state = () => {
    const ws = store.getWorkspace()
    if (!ws) {
      return {
        workspace: null, employees: [], tasks: [], inbox: [],
        totals: { consumption: 0, allocation: 0, release: 0, topup: 0 },
        ledger: [], messages: [],
        settings: settingsView(),
      }
    }
    const employees = store.listEmployees(ws.id).map((e) => ({
      ...e, spent: store.spentByEmployee(e.id),
    }))
    const tasks = store.listTasks(ws.id)
      .filter((t) => !t.parent_id)
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
      settings: settingsView(),
    }
  }

  const settingsView = () => ({
    anthropicConfigured: ctx.providers.has('anthropic'),
    ritualTickMinutes: Number(store.settingGet('ritual_tick_minutes') ?? 60),
    morningReportTime: store.settingGet('morning_report_time') ?? '09:00',
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
        return json(res, 200, {
          rss: process.memoryUsage().rss,
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
        const b = await readBody(req)
        const ws = foundation.sign({
          ceoIndex: Number(b.ceoIndex ?? 0),
          traits: Array.isArray(b.traits) ? (b.traits as number[]) : undefined,
          name: b.name ? String(b.name) : undefined,
          mission: b.mission ? String(b.mission) : undefined,
          budget: b.budget !== undefined ? Number(b.budget) : undefined,
          departments: Array.isArray(b.departments) ? (b.departments as string[]) : undefined,
        })
        return json(res, 200, { workspaceId: ws.id })
      }

      // --- réglages ---
      if (req.method === 'GET' && path === '/settings') return json(res, 200, settingsView())
      if (req.method === 'POST' && path === '/settings') {
        const b = await readBody(req)
        if (typeof b.anthropic_api_key === 'string') {
          // M2 : stockée dans la base locale ; trousseau système prévu en M5
          const key = b.anthropic_api_key.trim()
          store.settingSet('anthropic_api_key', key)
          applyAnthropicKey(ctx.providers, key || null)
        }
        if (b.ritual_tick_minutes !== undefined) {
          store.settingSet('ritual_tick_minutes', String(Math.max(1, Number(b.ritual_tick_minutes))))
        }
        if (typeof b.morning_report_time === 'string' && /^\d{2}:\d{2}$/.test(b.morning_report_time)) {
          store.settingSet('morning_report_time', b.morning_report_time)
        }
        if (b.budget_amount !== undefined) {
          const ws = store.getWorkspace()
          if (ws) store.updateWorkspace(ws.id, { budget_amount: Number(b.budget_amount) })
        }
        return json(res, 200, settingsView())
      }

      if (req.method === 'POST' && path === '/tasks') {
        const b = await readBody(req)
        const ws = store.getWorkspace()
        if (!ws) return json(res, 409, { error: 'aucun workspace — fondez d’abord l’entreprise' })
        const budget = Number(b.budget ?? 0.05)
        const task = store.createTask({
          workspace_id: ws.id,
          title: String(b.title ?? 'Sans titre'),
          description: String(b.description ?? ''),
          objectives: (b.objectives as [string, boolean][]) ?? [],
          status: 'open',
          budget_allocated: budget,
        })
        store.ledgerAppend({ workspace_id: ws.id, type: 'allocation', amount: budget, task_id: task.id })
        runner.submitTask(task.id)
        return json(res, 200, { id: task.id })
      }

      const taskAction = path.match(/^\/tasks\/([\w-]+)\/(archive|reopen|topup)$/)
      if (req.method === 'POST' && taskAction) {
        const [, id, action] = taskAction
        const task = store.getTask(id)
        const ws = store.getWorkspace()
        if (!task || !ws) return json(res, 404, { error: 'tâche inconnue' })

        if (action === 'archive') {
          const remaining = task.budget_allocated - store.spentOnTask(id)
          if (remaining > 0) {
            store.ledgerAppend({ workspace_id: ws.id, type: 'release', amount: remaining, task_id: id })
          }
          store.updateTask(id, { status: 'archived' })
        }
        if (action === 'reopen') {
          runner.resumeTask(id)
        }
        if (action === 'topup') {
          const b = await readBody(req)
          const amount = Number(b.amount ?? 0.05)
          store.ledgerAppend({ workspace_id: ws.id, type: 'topup', amount, task_id: id })
          store.updateTask(id, { budget_allocated: task.budget_allocated + amount })
          runner.resumeTask(id)
        }
        return json(res, 200, { ok: true })
      }

      const inboxAction = path.match(/^\/inbox\/([\w-]+)\/resolve$/)
      if (req.method === 'POST' && inboxAction) {
        store.inboxResolve(inboxAction[1])
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
