// Contexte de données de l'app : branché sur le démon quand il répond
// (état réel + WebSocket), sinon repli transparent sur les données de démo.
// Les entités du démon sont projetées dans les formes attendues par les écrans.

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Employee, JournalEntry, Task, TaskStatus } from '../types'
import { EMPLOYEES as DEMO_EMPLOYEES, JOURNAL as DEMO_JOURNAL, TASKS as DEMO_TASKS } from './mock'
import {
  actions, fetchState, fetchTraces, subscribe,
  type DaemonInboxItem, type DaemonState, type DaemonTrace,
} from './live'

const MODEL_LABELS: Record<string, string> = {
  'mock-fast': 'Mock · 0,80 $/Mtok',
  'claude-sonnet-5': 'Sonnet · 3,00 $/Mtok',
  'claude-haiku-4-5-20251001': 'Haiku · 0,80 $/Mtok',
  'local-free': 'Local · 0,00 $/Mtok',
}

const MAIN_STATUS: Record<string, TaskStatus> = {
  open: 'todo', planning: 'doing', in_progress: 'doing',
  paused_budget: 'paused', done: 'review', archived: 'done', cancelled: 'todo',
}
const SUB_STATUS: Record<string, TaskStatus> = {
  todo: 'todo', in_progress: 'doing', review: 'review',
  done_confirmed: 'done', paused_budget: 'paused',
}
const LEDGER_LABELS: Record<string, [string, string]> = {
  consumption: ['Consommation', '#0a84ff'],
  allocation: ['Allocation', '#bf5af2'],
  release: ['Restitution', '#30d158'],
  topup: ['Rallonge', '#ff9f0a'],
}

export interface Data {
  live: boolean
  hasWorkspace: boolean
  settings: DaemonState['settings'] | null
  workspaceName: string
  workspaceMission: string
  budgetAmount: number
  employees: Record<string, Employee>
  tasks: Task[]
  journal: JournalEntry[]
  totals: { consumption: number; engaged: number; available: number }
  inbox: DaemonInboxItem[]
  traces: DaemonTrace[]
  actions: typeof actions
  taskStatusRaw: Record<string, string>
}

const EMPTY_PROJECTION = {
  workspaceName: 'KoaTeam', workspaceMission: '', budgetAmount: 0,
  employees: {}, tasks: [], journal: [],
  totals: { consumption: 0, engaged: 0, available: 0 },
  inbox: [], taskStatusRaw: {},
}

function project(s: DaemonState): Omit<Data, 'live' | 'actions' | 'traces' | 'hasWorkspace' | 'settings'> {
  if (!s.workspace) return EMPTY_PROJECTION
  const employees: Record<string, Employee> = {}
  const activeLoad: Record<string, number> = {}
  for (const t of s.tasks) {
    for (const sub of t.subtasks) {
      if (sub.assignee_id && ['todo', 'in_progress'].includes(sub.status)) {
        activeLoad[sub.assignee_id] = (activeLoad[sub.assignee_id] ?? 0) + 1
      }
    }
  }
  for (const e of s.employees) {
    employees[e.id] = {
      id: e.id, name: e.name, title: e.title, role: e.role,
      department: (e.department as Employee['department']) ?? null,
      contract: e.contract as Employee['contract'],
      archived: e.status === 'archived',
      color: e.color, model: MODEL_LABELS[e.model] ?? e.model,
      spend: e.spent, load: `${activeLoad[e.id] ?? 0} sous-tâche(s)`,
      traits: e.character, scope: e.scope, perms: e.perms, memory: e.memory,
    }
  }

  // coût par sous-tâche depuis les écritures (detail.subtask)
  const subCost: Record<string, number> = {}
  for (const l of s.ledger) {
    if (l.type !== 'consumption' || !l.detail) continue
    try {
      const d = JSON.parse(l.detail)
      if (d.subtask) subCost[d.subtask] = (subCost[d.subtask] ?? 0) + l.amount
    } catch { /* détail illisible */ }
  }

  const taskStatusRaw: Record<string, string> = {}
  const tasks: Task[] = s.tasks.map((t) => {
    taskStatusRaw[t.id] = t.status
    const done = t.subtasks.filter((x) => x.status === 'done_confirmed').length
    const active = !['archived', 'cancelled'].includes(t.status)
    return {
      id: t.id, title: t.title, st: MAIN_STATUS[t.status] ?? 'todo',
      done, total: Math.max(t.subtasks.length, 1),
      alloc: t.budget_allocated, spent: t.spent,
      eng: active && t.status !== 'done' ? Math.max(0, t.budget_allocated - t.spent) : 0,
      questions: 0,
      desc: t.description, note: t.complexity_note || '(en attente d’évaluation du CEO)',
      objectives: t.objectives,
      tree: t.subtasks.map((sub) => ({
        emp: sub.assignee_id ?? '', title: sub.title,
        st: SUB_STATUS[sub.status] ?? 'todo', cost: subCost[sub.id] ?? 0, depth: 0,
      })),
      deliverables: [], qa: [],
    }
  })

  const journal: JournalEntry[] = s.ledger.map((l) => {
    const [label, color] = LEDGER_LABELS[l.type] ?? [l.type, '#8e8e93']
    const emp = l.employee_id ? s.employees.find((e) => e.id === l.employee_id) : null
    const task = l.task_id ? s.tasks.find((t) => t.id === l.task_id) : null
    const sign = l.type === 'consumption' || l.type === 'allocation' ? '−' : '+'
    return {
      date: new Date(l.at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
      type: label, color,
      label: [emp?.name, task ? `« ${task.title} »` : null].filter(Boolean).join(' · ') || label,
      amount: `${sign}${l.amount.toFixed(4).replace('.', ',')} $`,
      solde: '',
    }
  })

  const engaged = tasks.reduce((n, t) => n + t.eng, 0)
  const consumption = s.totals.consumption ?? 0
  return {
    workspaceName: s.workspace!.name,
    workspaceMission: s.workspace!.mission,
    budgetAmount: s.workspace!.budget_amount,
    employees, tasks, journal,
    totals: {
      consumption, engaged,
      available: s.workspace.budget_amount - consumption - engaged,
    },
    inbox: s.inbox.filter((i) => i.status === 'pending'),
    taskStatusRaw,
  }
}

const DEMO: Omit<Data, 'live' | 'actions' | 'traces' | 'hasWorkspace' | 'settings'> = {
  workspaceName: 'Lancement SaaS Photo',
  workspaceMission: 'Démo — démon non connecté',
  budgetAmount: 400,
  employees: DEMO_EMPLOYEES,
  tasks: DEMO_TASKS,
  journal: DEMO_JOURNAL,
  totals: { consumption: 240, engaged: 85, available: 75 },
  inbox: [],
  taskStatusRaw: {},
}

const Ctx = createContext<Data>({ ...DEMO, live: false, hasWorkspace: true, settings: null, actions, traces: [] })

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DaemonState | null>(null)
  const [traces, setTraces] = useState<DaemonTrace[]>([])
  const [live, setLive] = useState(false)

  useEffect(() => {
    let mounted = true
    const refresh = () => {
      fetchState()
        .then((s) => { if (mounted) { setState(s); setLive(true) } })
        .catch(() => { if (mounted) setLive(false) })
      fetchTraces().then((t) => { if (mounted) setTraces(t) }).catch(() => {})
    }
    refresh()
    const unsub = subscribe(refresh)
    const poll = setInterval(refresh, 10_000)
    return () => { mounted = false; unsub(); clearInterval(poll) }
  }, [])

  const value = useMemo<Data>(() => {
    const isLive = live && !!state
    const base = isLive ? project(state!) : DEMO
    return {
      ...base,
      live: isLive,
      hasWorkspace: isLive ? !!state!.workspace : true,
      settings: isLive ? state!.settings : null,
      actions, traces,
    }
  }, [live, state, traces])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useData = () => useContext(Ctx)
