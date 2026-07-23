// Dépôts typés au-dessus de SQLite. Le démon est la seule autorité d'écriture.

import type { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'

const now = () => new Date().toISOString()

export interface Workspace {
  id: string; name: string; mission: string; status: string
  budget_amount: number; budget_period: string; created_at: string
}

export interface Employee {
  id: string; workspace_id: string; name: string; title: string
  role: 'ceo' | 'head' | 'specialist'; department: string | null
  manager_id: string | null; contract: string; status: string
  color: string; model: string; autonomy: string; scope: string
  character: number[]; perms: string[]; memory: string[]
  hired_for: string | null; mission_report: string | null
}

export interface Task {
  id: string; workspace_id: string; parent_id: string | null
  title: string; description: string; objectives: [string, boolean][]
  status: string; assignee_id: string | null; supervisor_id: string | null
  budget_allocated: number; complexity_note: string; created_by: string
  review_feedback: string | null; retries: number
  created_at: string; updated_at: string
}

export interface InboxItem {
  id: string; workspace_id: string; type: string; status: string
  title: string; body: string; task_id: string | null
  employee_id: string | null; ref: string | null; created_at: string
}

export interface Question {
  id: string; workspace_id: string; task_id: string; asker_id: string
  text: string; status: 'pending_manager' | 'pending_user' | 'answered'
  answer: string | null; answered_by: string | null; created_at: string
}

export interface TraceEvent { at: string; kind: string; text: string }

export class Store {
  // Cache des requêtes préparées : re-préparer à chaque appel accumule des
  // milliers d'objets statements (mémoire SQLite libérée seulement au GC) —
  // dérive constatée par l'endurance nightly à 200 tâches.
  private stmts = new Map<string, ReturnType<DatabaseSync['prepare']>>()

  constructor(private db: DatabaseSync) {}

  private prep(sql: string): ReturnType<DatabaseSync['prepare']> {
    let s = this.stmts.get(sql)
    if (!s) {
      s = this.db.prepare(sql)
      this.stmts.set(sql, s)
    }
    return s
  }

  // --- workspace ---
  getWorkspace(): Workspace | null {
    return (this.prep(`SELECT * FROM workspaces LIMIT 1`).get() as Workspace | undefined) ?? null
  }

  createWorkspace(w: { name: string; mission: string; budget_amount: number; budget_period?: string }): Workspace {
    const id = randomUUID()
    this.prep(
      `INSERT INTO workspaces (id, name, mission, budget_amount, budget_period, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(id, w.name, w.mission, w.budget_amount, w.budget_period ?? 'monthly', now())
    return this.getWorkspace()!
  }

  // --- employés ---
  private rowToEmployee(r: Record<string, unknown>): Employee {
    return {
      ...(r as unknown as Employee),
      character: JSON.parse(String(r.character)),
      perms: JSON.parse(String(r.perms)),
      memory: JSON.parse(String(r.memory)),
    }
  }

  listEmployees(wsId: string): Employee[] {
    return (this.prep(`SELECT * FROM employees WHERE workspace_id = ?`).all(wsId) as Record<string, unknown>[])
      .map((r) => this.rowToEmployee(r))
  }

  getEmployee(id: string): Employee | null {
    const r = this.prep(`SELECT * FROM employees WHERE id = ?`).get(id) as Record<string, unknown> | undefined
    return r ? this.rowToEmployee(r) : null
  }

  hire(e: Omit<Employee, 'id' | 'status' | 'hired_for' | 'mission_report'> & { id?: string; hired_for?: string | null }): Employee {
    const id = e.id ?? randomUUID()
    this.prep(
      `INSERT INTO employees (id, workspace_id, name, title, role, department, manager_id, contract,
        status, color, model, autonomy, scope, character, perms, memory, hired_for, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, e.workspace_id, e.name, e.title, e.role, e.department, e.manager_id, e.contract,
      e.color, e.model, e.autonomy, e.scope,
      JSON.stringify(e.character), JSON.stringify(e.perms), JSON.stringify(e.memory), e.hired_for ?? null, now())
    return this.getEmployee(id)!
  }

  archiveEmployee(id: string, missionReport: string): void {
    this.prep(`UPDATE employees SET status = 'archived', mission_report = ? WHERE id = ?`).run(missionReport, id)
  }

  wakeEmployee(id: string): void {
    this.prep(`UPDATE employees SET status = 'active' WHERE id = ?`).run(id)
  }

  // --- tâches ---
  private rowToTask(r: Record<string, unknown>): Task {
    return { ...(r as unknown as Task), objectives: JSON.parse(String(r.objectives)) }
  }

  listTasks(wsId: string): Task[] {
    return (this.prep(`SELECT * FROM tasks WHERE workspace_id = ? ORDER BY created_at`).all(wsId) as Record<string, unknown>[])
      .map((r) => this.rowToTask(r))
  }

  getTask(id: string): Task | null {
    const r = this.prep(`SELECT * FROM tasks WHERE id = ?`).get(id) as Record<string, unknown> | undefined
    return r ? this.rowToTask(r) : null
  }

  subtasksOf(taskId: string): Task[] {
    return (this.prep(`SELECT * FROM tasks WHERE parent_id = ? ORDER BY created_at`).all(taskId) as Record<string, unknown>[])
      .map((r) => this.rowToTask(r))
  }

  createTask(t: {
    workspace_id: string; parent_id?: string | null; title: string; description?: string
    objectives?: [string, boolean][]; status: string; assignee_id?: string | null
    supervisor_id?: string | null; budget_allocated?: number; complexity_note?: string; created_by?: string
  }): Task {
    const id = randomUUID()
    this.prep(
      `INSERT INTO tasks (id, workspace_id, parent_id, title, description, objectives, status,
        assignee_id, supervisor_id, budget_allocated, complexity_note, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, t.workspace_id, t.parent_id ?? null, t.title, t.description ?? '',
      JSON.stringify(t.objectives ?? []), t.status, t.assignee_id ?? null, t.supervisor_id ?? null,
      t.budget_allocated ?? 0, t.complexity_note ?? '', t.created_by ?? 'user', now(), now())
    return this.getTask(id)!
  }

  updateTask(id: string, fields: Partial<Pick<Task, 'status' | 'budget_allocated' | 'complexity_note' | 'assignee_id' | 'review_feedback' | 'retries'>>): void {
    const sets: string[] = []
    const vals: unknown[] = []
    for (const [k, v] of Object.entries(fields)) { sets.push(`${k} = ?`); vals.push(v) }
    sets.push(`updated_at = ?`); vals.push(now()); vals.push(id)
    this.prep(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).run(...(vals as never[]))
  }

  // --- comptabilité ---
  ledgerAppend(e: { workspace_id: string; type: string; amount: number; task_id?: string | null; employee_id?: string | null; detail?: unknown }): void {
    this.prep(
      `INSERT INTO ledger (workspace_id, at, type, amount, task_id, employee_id, detail) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(e.workspace_id, now(), e.type, e.amount, e.task_id ?? null, e.employee_id ?? null,
      e.detail ? JSON.stringify(e.detail) : null)
  }

  spentOnTask(taskId: string): number {
    const r = this.prep(
      `SELECT COALESCE(SUM(amount), 0) s FROM ledger WHERE task_id = ? AND type = 'consumption'`,
    ).get(taskId) as { s: number }
    return r.s
  }

  spentByEmployee(employeeId: string): number {
    const r = this.prep(
      `SELECT COALESCE(SUM(amount), 0) s FROM ledger WHERE employee_id = ? AND type = 'consumption'`,
    ).get(employeeId) as { s: number }
    return r.s
  }

  ledgerTotals(wsId: string): Record<string, number> {
    const rows = this.prep(
      `SELECT type, COALESCE(SUM(amount), 0) s FROM ledger WHERE workspace_id = ? GROUP BY type`,
    ).all(wsId) as { type: string; s: number }[]
    const t: Record<string, number> = { consumption: 0, allocation: 0, release: 0, topup: 0 }
    for (const r of rows) t[r.type] = r.s
    return t
  }

  ledgerRecent(wsId: string, limit = 50): unknown[] {
    return this.prep(`SELECT * FROM ledger WHERE workspace_id = ? ORDER BY id DESC LIMIT ?`).all(wsId, limit)
  }

  // --- inbox ---
  inboxAdd(i: { workspace_id: string; type: string; title: string; body?: string; task_id?: string | null; employee_id?: string | null; ref?: string | null }): InboxItem {
    const id = randomUUID()
    this.prep(
      `INSERT INTO inbox (id, workspace_id, type, title, body, task_id, employee_id, ref, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, i.workspace_id, i.type, i.title, i.body ?? '', i.task_id ?? null, i.employee_id ?? null, i.ref ?? null, now())
    return this.prep(`SELECT * FROM inbox WHERE id = ?`).get(id) as unknown as InboxItem
  }

  inboxResolveByRef(ref: string): void {
    this.prep(`UPDATE inbox SET status = 'answered' WHERE ref = ?`).run(ref)
  }

  // --- questions hiérarchiques ---
  questionAdd(q: { workspace_id: string; task_id: string; asker_id: string; text: string }): Question {
    const id = randomUUID()
    this.prep(
      `INSERT INTO questions (id, workspace_id, task_id, asker_id, text, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(id, q.workspace_id, q.task_id, q.asker_id, q.text, now())
    return this.questionGet(id)!
  }

  questionGet(id: string): Question | null {
    return (this.prep(`SELECT * FROM questions WHERE id = ?`).get(id) as Question | undefined) ?? null
  }

  questionSetStatus(id: string, status: Question['status']): void {
    this.prep(`UPDATE questions SET status = ? WHERE id = ?`).run(status, id)
  }

  questionAnswer(id: string, answer: string, answeredBy: string): void {
    this.prep(
      `UPDATE questions SET status = 'answered', answer = ?, answered_by = ? WHERE id = ?`,
    ).run(answer, answeredBy, id)
  }

  questionsForTask(taskId: string): Question[] {
    return this.prep(`SELECT * FROM questions WHERE task_id = ? ORDER BY created_at`).all(taskId) as unknown as Question[]
  }

  questionsAll(wsId: string, limit = 100): Question[] {
    return this.prep(
      `SELECT * FROM questions WHERE workspace_id = ? ORDER BY created_at DESC LIMIT ?`,
    ).all(wsId, limit) as unknown as Question[]
  }

  inboxList(wsId: string): InboxItem[] {
    return this.prep(
      `SELECT * FROM inbox WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 100`,
    ).all(wsId) as unknown as InboxItem[]
  }

  inboxResolve(id: string): void {
    this.prep(`UPDATE inbox SET status = 'answered' WHERE id = ?`).run(id)
  }

  // --- traces & messages ---
  traceStart(t: { workspace_id: string; employee_id?: string | null; task_id?: string | null; trigger: string }): string {
    const id = randomUUID()
    this.prep(
      `INSERT INTO traces (id, workspace_id, employee_id, task_id, trigger, started_at) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(id, t.workspace_id, t.employee_id ?? null, t.task_id ?? null, t.trigger, now())
    return id
  }

  traceFinish(id: string, events: TraceEvent[], tokensIn: number, tokensOut: number, cost: number, outcome: string): void {
    this.prep(
      `UPDATE traces SET events = ?, tokens_in = ?, tokens_out = ?, cost = ?, outcome = ?, ended_at = ? WHERE id = ?`,
    ).run(JSON.stringify(events), tokensIn, tokensOut, cost, outcome, now(), id)
  }

  tracesRecent(wsId: string, limit = 30): unknown[] {
    return (this.prep(`SELECT * FROM traces WHERE workspace_id = ? ORDER BY started_at DESC LIMIT ?`).all(wsId, limit) as Record<string, unknown>[])
      .map((r) => ({ ...r, events: JSON.parse(String(r.events)) }))
  }

  messageAdd(m: { workspace_id: string; from_id: string; to_id: string; task_id?: string | null; content: string }): void {
    this.prep(
      `INSERT INTO messages (workspace_id, from_id, to_id, task_id, content, at) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(m.workspace_id, m.from_id, m.to_id, m.task_id ?? null, m.content, now())
  }

  messagesRecent(wsId: string, limit = 50): unknown[] {
    return this.prep(`SELECT * FROM messages WHERE workspace_id = ? ORDER BY id DESC LIMIT ?`).all(wsId, limit)
  }

  // --- réglages (clé/valeur) ---
  settingGet(key: string): string | null {
    const r = this.prep(`SELECT value FROM settings WHERE key = ?`).get(key) as { value: string } | undefined
    return r?.value ?? null
  }

  settingSet(key: string, value: string): void {
    this.prep(
      `INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    ).run(key, value)
  }

  updateWorkspace(id: string, fields: Partial<Pick<Workspace, 'name' | 'mission' | 'budget_amount'>>): void {
    const sets: string[] = []
    const vals: unknown[] = []
    for (const [k, v] of Object.entries(fields)) { sets.push(`${k} = ?`); vals.push(v) }
    if (!sets.length) return
    vals.push(id)
    this.prep(`UPDATE workspaces SET ${sets.join(', ')} WHERE id = ?`).run(...(vals as never[]))
  }
}
