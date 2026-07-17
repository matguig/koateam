// Client du démon KoaTeam : HTTP (état, actions) + WebSocket (changements).
// L'UI retombe sur les données de démo si le démon est injoignable.

export const DAEMON_URL = 'http://127.0.0.1:4750'

export interface DaemonEmployee {
  id: string; name: string; title: string; role: 'ceo' | 'head' | 'specialist'
  department: string | null; manager_id: string | null; contract: string
  status: string; color: string; model: string; scope: string
  character: number[]; perms: string[]; memory: string[]; spent: number
}

export interface DaemonSubtask {
  id: string; title: string; status: string; assignee_id: string | null
}

export interface DaemonTask {
  id: string; title: string; description: string; status: string
  objectives: [string, boolean][]; budget_allocated: number
  complexity_note: string; spent: number; subtasks: DaemonSubtask[]
}

export interface DaemonInboxItem {
  id: string; type: string; status: string; title: string; body: string
  task_id: string | null; employee_id: string | null; created_at: string
}

export interface DaemonLedgerRow {
  id: number; at: string; type: string; amount: number
  task_id: string | null; employee_id: string | null; detail: string | null
}

export interface DaemonState {
  workspace: { id: string; name: string; mission: string; budget_amount: number }
  employees: DaemonEmployee[]
  tasks: DaemonTask[]
  inbox: DaemonInboxItem[]
  totals: Record<string, number>
  ledger: DaemonLedgerRow[]
}

export interface DaemonTrace {
  id: string; employee_id: string | null; task_id: string | null; trigger: string
  events: { at: string; kind: string; text: string }[]
  tokens_in: number; tokens_out: number; cost: number; outcome: string
  started_at: string
}

export async function fetchState(): Promise<DaemonState> {
  const res = await fetch(`${DAEMON_URL}/state`)
  if (!res.ok) throw new Error(`daemon ${res.status}`)
  return res.json()
}

export async function fetchTraces(): Promise<DaemonTrace[]> {
  const res = await fetch(`${DAEMON_URL}/traces`)
  if (!res.ok) throw new Error(`daemon ${res.status}`)
  return res.json()
}

export const actions = {
  createTask: (t: { title: string; description: string; budget: number }) =>
    fetch(`${DAEMON_URL}/tasks`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(t),
    }),
  archiveTask: (id: string) => fetch(`${DAEMON_URL}/tasks/${id}/archive`, { method: 'POST' }),
  reopenTask: (id: string) => fetch(`${DAEMON_URL}/tasks/${id}/reopen`, { method: 'POST' }),
  topupTask: (id: string, amount: number) =>
    fetch(`${DAEMON_URL}/tasks/${id}/topup`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ amount }),
    }),
  resolveInbox: (id: string) => fetch(`${DAEMON_URL}/inbox/${id}/resolve`, { method: 'POST' }),
}

export function subscribe(onChange: () => void): () => void {
  let ws: WebSocket | null = null
  let closed = false
  const connect = () => {
    if (closed) return
    ws = new WebSocket(DAEMON_URL.replace('http', 'ws'))
    ws.onmessage = onChange
    ws.onclose = () => { if (!closed) setTimeout(connect, 2000) }
    ws.onerror = () => ws?.close()
  }
  connect()
  return () => { closed = true; ws?.close() }
}
