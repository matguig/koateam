// Exécution des interventions (SPEC-V1 §5.2) : un worker éphémère par
// intervention, cascade du flux cœur (CEO planifie → sous-tâches exécutées →
// tâche livrée), budgets durs vérifiés avant chaque appel LLM, traces
// persistées. Concurrence : 1 worker à la fois (paramétrable en M2+).

import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { costOf } from './pricing.js'
import type { Provider } from './providers.js'
import type { Employee, Store, Task, TraceEvent } from './store.js'

interface QueueItem {
  kind: 'plan' | 'execute' | 'ritual'
  taskId: string | null
  employeeId: string
  brief?: string
}

export class InterventionRunner {
  private queue: QueueItem[] = []
  private running = false
  public interventionsDone = 0
  public lastWorkerRss = 0

  constructor(
    private store: Store,
    private providers: Map<string, Provider>,
    private dataDir: string,
    private onChange: () => void,
  ) {}

  /** Point d'entrée du flux cœur : l'utilisateur a créé une tâche. */
  submitTask(taskId: string): void {
    const ws = this.store.getWorkspace()
    if (!ws) throw new Error('aucun workspace — fondez d’abord l’entreprise')
    const ceo = this.store.listEmployees(ws.id).find((e) => e.role === 'ceo')
    if (!ceo) throw new Error('aucun CEO dans le workspace')
    this.store.updateTask(taskId, { status: 'planning' })
    this.enqueue({ kind: 'plan', taskId, employeeId: ceo.id })
  }

  isBusy(): boolean {
    return this.running || this.queue.length > 0
  }

  /** Ronde managériale : le CEO fait le point (rituels, SPEC-V1 §3.7). */
  submitRitual(kind: string, brief: string): void {
    const ws = this.store.getWorkspace()
    if (!ws) return
    const ceo = this.store.listEmployees(ws.id).find((e) => e.role === 'ceo')
    if (!ceo) return
    // Une seule ronde en file à la fois
    if (this.queue.some((q) => q.kind === 'ritual')) return
    this.enqueue({ kind: 'ritual', taskId: null, employeeId: ceo.id, brief: `${kind}\n${brief}` })
  }

  resumeTask(taskId: string): void {
    const subs = this.store.subtasksOf(taskId)
    if (subs.length === 0) {
      // La pause a interrompu la planification avant toute délégation :
      // on relance le CEO depuis le début.
      this.submitTask(taskId)
      return
    }
    this.store.updateTask(taskId, { status: 'in_progress' })
    for (const s of subs) {
      if (s.status === 'paused_budget' || s.status === 'todo') {
        this.store.updateTask(s.id, { status: 'todo' })
        if (s.assignee_id) this.enqueue({ kind: 'execute', taskId: s.id, employeeId: s.assignee_id })
      }
    }
  }

  private enqueue(item: QueueItem): void {
    this.queue.push(item)
    this.pump()
  }

  private pump(): void {
    if (this.running) return
    const item = this.queue.shift()
    if (!item) return
    this.running = true
    this.run(item).finally(() => {
      this.running = false
      this.interventionsDone++
      this.onChange()
      this.pump()
    })
  }

  private providerFor(model: string): Provider {
    const name = model.startsWith('mock') ? 'mock' : model.startsWith('claude') ? 'anthropic' : 'local'
    const p = this.providers.get(name)
    if (!p) throw new Error(`provider indisponible : ${name}`)
    return p
  }

  private async run(item: QueueItem): Promise<void> {
    const ws = this.store.getWorkspace()
    const employee = this.store.getEmployee(item.employeeId)
    if (!ws || !employee) return
    const task = item.taskId ? this.store.getTask(item.taskId) : null
    if (item.kind !== 'ritual' && !task) return

    // La sous-tâche est budgétée sur la tâche PRINCIPALE (comptabilité d'engagement).
    // Une ronde n'a pas de tâche : elle est budgétée sur l'enveloppe du workspace.
    const mainTask = task ? (task.parent_id ? this.store.getTask(task.parent_id)! : task) : null
    const events: TraceEvent[] = []
    let tokensIn = 0
    let tokensOut = 0
    let cost = 0
    const traceId = this.store.traceStart({
      workspace_id: ws.id, employee_id: employee.id, task_id: task?.id ?? null,
      trigger: item.kind === 'plan' ? 'Nouvelle tâche à planifier'
        : item.kind === 'ritual' ? 'Ronde managériale' : 'Sous-tâche assignée',
    })
    const push = (kind: string, text: string) =>
      events.push({ at: new Date().toISOString(), kind, text })

    if (item.kind === 'execute' && task) this.store.updateTask(task.id, { status: 'in_progress' })
    this.onChange()

    const script = process.argv[1]
    const args = [...(script?.match(/\.(c|m)?js$/) ? [script] : []), '--worker']
    const child = spawn(process.execPath, args, {
      env: {
        ...process.env,
        KOATEAM_MISSION: JSON.stringify({
          id: task?.id ?? 'ritual',
          goal: item.kind === 'plan' && task
            ? `${task.title}\n\n${task.description}`
            : item.kind === 'ritual'
              ? item.brief ?? ''
              : `${task!.title} (tâche parente : ${mainTask!.title})`,
          model: employee.model,
          role: item.kind === 'plan' ? 'ceo' : item.kind === 'ritual' ? 'ronde' : 'specialist',
          workzone: join(this.dataDir, 'workzones', mainTask?.id ?? '_rituels'),
        }),
      },
      stdio: ['pipe', 'pipe', 'inherit'],
    })

    let outcome = 'failed'
    let report = ''

    await new Promise<void>((resolve) => {
      const rl = createInterface({ input: child.stdout })
      rl.on('line', (line) => {
        let msg: { id?: number; method: string; params: Record<string, unknown> }
        try { msg = JSON.parse(line) } catch { return }

        if (msg.method === 'stats') {
          this.lastWorkerRss = Math.max(this.lastWorkerRss, Number(msg.params.rss))
          return
        }
        if (msg.method === 'event') {
          push(String(msg.params.kind ?? 'info'), String(msg.params.text ?? ''))
          return
        }
        if (msg.method === 'report') {
          outcome = String(msg.params.status)
          report = String(msg.params.report)
          return
        }
        if (msg.method === 'task.create_subtask' && msg.id !== undefined && mainTask) {
          const { title, department } = msg.params as { title: string; department?: string }
          const employees = this.store.listEmployees(ws.id)
          const assignee =
            employees.find((e) => e.role === 'specialist' && e.department === department) ??
            employees.find((e) => e.role === 'specialist')
          const supervisor = assignee?.manager_id ?? null
          const sub = this.store.createTask({
            workspace_id: ws.id, parent_id: mainTask.id, title,
            status: 'todo', assignee_id: assignee?.id ?? null, supervisor_id: supervisor,
            created_by: employee.id,
          })
          if (assignee) {
            this.store.messageAdd({
              workspace_id: ws.id, from_id: employee.id, to_id: assignee.id, task_id: sub.id,
              content: `Je te confie « ${title} ». Rapporte à ton HEAD quand c'est prêt.`,
            })
          }
          push('délégation', `Sous-tâche créée : « ${title} » → ${assignee?.name ?? 'non assignée'}`)
          child.stdin.write(JSON.stringify({ id: msg.id, result: { subtaskId: sub.id } }) + '\n')
          this.onChange()
          return
        }
        if (msg.method === 'llm.complete' && msg.id !== undefined) {
          const { model, system, messages } = msg.params as {
            model: string; system: string
            messages: { role: 'user' | 'assistant'; content: string }[]
          }
          // Garde-fou budgétaire DUR : vérifié AVANT l'appel — tâche principale
          // pour le travail, enveloppe du workspace pour les rondes
          const exceeded = mainTask
            ? this.store.spentOnTask(mainTask.id) >= mainTask.budget_allocated
            : this.store.ledgerTotals(ws.id).consumption >= ws.budget_amount
          if (exceeded) {
            child.stdin.write(JSON.stringify({ id: msg.id, error: 'budget_exceeded' }) + '\n')
            return
          }
          this.providerFor(model)
            .complete(model, system, messages)
            .then((res) => {
              const c = costOf(model, res.inputTokens, res.outputTokens)
              cost += c; tokensIn += res.inputTokens; tokensOut += res.outputTokens
              this.store.ledgerAppend({
                workspace_id: ws.id, type: 'consumption', amount: c,
                task_id: mainTask?.id ?? null, employee_id: employee.id,
                detail: { model, inputTokens: res.inputTokens, outputTokens: res.outputTokens, subtask: task && mainTask && task.id !== mainTask.id ? task.id : undefined },
              })
              push('llm', `${model} · ${res.inputTokens} tok in / ${res.outputTokens} tok out · ${c.toFixed(6)} $`)
              child.stdin.write(JSON.stringify({ id: msg.id, result: { content: res.content, cost: c } }) + '\n')
            })
            .catch((e) => child.stdin.write(JSON.stringify({ id: msg.id, error: String(e) }) + '\n'))
          return
        }
      })
      child.on('exit', () => resolve())
    })

    push('issue', `${outcome} — ${report}`)
    this.store.traceFinish(traceId, events, tokensIn, tokensOut, cost, outcome)
    if (item.kind === 'ritual') {
      if (outcome === 'done' && report) {
        this.store.messageAdd({ workspace_id: ws.id, from_id: employee.id, to_id: 'user', content: report })
      }
    } else if (task && mainTask) {
      this.afterIntervention(item, ws.id, task, mainTask, employee, outcome, report)
    }
    this.onChange()
  }

  private afterIntervention(
    item: QueueItem, wsId: string, task: Task, mainTask: Task,
    employee: Employee, outcome: string, report: string,
  ): void {
    if (outcome === 'paused_budget') {
      this.store.updateTask(task.id, { status: 'paused_budget' })
      if (task.id !== mainTask.id) this.store.updateTask(mainTask.id, { status: 'paused_budget' })
      this.store.inboxAdd({
        workspace_id: wsId, type: 'budget_pause_alert',
        title: `Tâche « ${mainTask.title} » en pause — budget épuisé`,
        body: `${this.store.spentOnTask(mainTask.id).toFixed(4)} $ consommés sur ${mainTask.budget_allocated.toFixed(2)} $ alloués. Rallongez le budget pour reprendre.`,
        task_id: mainTask.id, employee_id: employee.id,
      })
      // On purge les sous-tâches en file pour cette tâche principale
      this.queue = this.queue.filter((q) => {
        if (!q.taskId) return true
        const t = this.store.getTask(q.taskId)
        return t?.parent_id !== mainTask.id && q.taskId !== mainTask.id
      })
      return
    }

    if (item.kind === 'plan') {
      if (outcome !== 'done') {
        this.store.updateTask(mainTask.id, { status: 'open' })
        return
      }
      this.store.updateTask(mainTask.id, { status: 'in_progress', complexity_note: report })
      for (const sub of this.store.subtasksOf(mainTask.id)) {
        if (sub.assignee_id) this.enqueue({ kind: 'execute', taskId: sub.id, employeeId: sub.assignee_id })
      }
      return
    }

    // Sous-tâche exécutée : revue par le superviseur (mécanique en M1 —
    // la confirmation par un manager LLM arrive en M3)
    this.store.updateTask(task.id, { status: outcome === 'done' ? 'done_confirmed' : 'todo' })
    if (task.supervisor_id && outcome === 'done') {
      this.store.messageAdd({
        workspace_id: wsId, from_id: employee.id, to_id: task.supervisor_id, task_id: task.id,
        content: report,
      })
    }
    const subs = this.store.subtasksOf(mainTask.id)
    if (subs.length > 0 && subs.every((s) => s.status === 'done_confirmed')) {
      this.store.updateTask(mainTask.id, { status: 'done' })
      const ceo = this.store.listEmployees(wsId).find((e) => e.role === 'ceo')
      const spent = this.store.spentOnTask(mainTask.id)
      this.store.inboxAdd({
        workspace_id: wsId, type: 'deliverable_review',
        title: `Tâche « ${mainTask.title} » terminée — livrable à vérifier`,
        body: `Coût final ${spent.toFixed(4)} $ sur ${mainTask.budget_allocated.toFixed(2)} $ alloués. Archivez pour restituer le reliquat, ou rouvrez.`,
        task_id: mainTask.id, employee_id: ceo?.id,
      })
      if (ceo) {
        this.store.messageAdd({
          workspace_id: wsId, from_id: ceo.id, to_id: 'user', task_id: mainTask.id,
          content: `On a fini « ${mainTask.title} » — livrable prêt à être vérifié dans votre inbox.`,
        })
      }
    }
  }
}
