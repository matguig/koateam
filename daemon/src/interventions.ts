// Exécution des interventions (SPEC-V1 §5.2) : un worker éphémère par
// intervention. Flux cœur (CEO planifie → sous-tâches → livraison), questions
// hiérarchiques (spécialiste → manager → utilisateur), embauche par le CEO,
// rondes. Budgets durs vérifiés avant chaque appel LLM, traces persistées.

import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { isCliModel, runCliAgent, type CliAgent } from './cliAgents.js'
import { PRICING, costOf } from './pricing.js'
import type { Provider } from './providers.js'
import type { Employee, Store, Task, TraceEvent } from './store.js'

interface QueueItem {
  kind: 'plan' | 'execute' | 'ritual' | 'answer' | 'review' | 'farewell'
  taskId: string | null
  employeeId: string
  brief?: string
  questionId?: string
}

const TRAIT_LABELS = ['remise en question', 'aversion au risque', 'rigueur', 'concision', 'formalisme', 'gestion budgétaire']

const HIRE_NAMES = ['Alex Fournier', 'Camille Roussel', 'Jules Marchand', 'Emma Girard', 'Nina Lefèvre', 'Louis Bertin', 'Zoé Caron', 'Rayan Dubois']
const HIRE_COLORS = ['#64d2ff', '#ffd60a', '#ff6482', '#30d158', '#ac8e68', '#bf5af2']

function persona(e: Employee): string {
  const traits = e.character
    .map((v, i) => (v >= 70 ? `${TRAIT_LABELS[i]} élevée` : v <= 30 ? `${TRAIT_LABELS[i]} faible` : null))
    .filter(Boolean)
    .join(', ')
  return `Tu es ${e.name}, ${e.title}. ${e.scope}${traits ? ` Traits marquants de ton caractère : ${traits}.` : ''}`
}

const PROTOCOL_HEADER = 'Réponds UNIQUEMENT par un objet JSON, sans autre texte. Actions possibles :'

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
    /** Agents CLI détectés sur la machine (Claude Code, Codex…). */
    private getCliAgents: () => CliAgent[] = () => [],
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
    if (this.queue.some((q) => q.kind === 'ritual')) return
    this.enqueue({ kind: 'ritual', taskId: null, employeeId: ceo.id, brief: `${kind}\n${brief}` })
  }

  resumeTask(taskId: string): void {
    const subs = this.store.subtasksOf(taskId)
    // 'in_progress' compte comme à reprendre : après un crash, le worker est
    // mort mais la sous-tâche est restée marquée en cours. Les 'blocked'
    // attendent leur réponse — on ne les force pas.
    const pending = subs.filter((s) => ['todo', 'in_progress', 'paused_budget', 'review'].includes(s.status))
    const blocked = subs.filter((s) => s.status === 'blocked')
    if (pending.length === 0 && blocked.length === 0) {
      this.submitTask(taskId)
      return
    }
    this.store.updateTask(taskId, { status: 'in_progress' })
    for (const s of pending) {
      this.store.updateTask(s.id, { status: 'todo' })
      if (s.assignee_id) this.enqueue({ kind: 'execute', taskId: s.id, employeeId: s.assignee_id })
    }
  }

  /** Réponse de l'utilisateur à une question escaladée : le travail reprend. */
  answerQuestion(questionId: string, answer: string): void {
    const q = this.store.questionGet(questionId)
    if (!q || q.status === 'answered') return
    this.store.questionAnswer(questionId, answer, 'user')
    this.store.inboxResolveByRef(questionId)
    const sub = this.store.getTask(q.task_id)
    if (sub?.assignee_id) {
      this.store.messageAdd({
        workspace_id: q.workspace_id, from_id: 'user', to_id: sub.assignee_id,
        task_id: sub.id, content: answer,
      })
      this.store.updateTask(sub.id, { status: 'todo' })
      if (sub.parent_id) this.store.updateTask(sub.parent_id, { status: 'in_progress' })
      this.enqueue({ kind: 'execute', taskId: sub.id, employeeId: sub.assignee_id })
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

  // --- prompts système : construits ici (le démon connaît tout le contexte) ---

  private systemFor(item: QueueItem, employee: Employee, mainTask: Task | null): string {
    const ws = this.store.getWorkspace()!
    const base = `${persona(employee)}\nEntreprise « ${ws.name} » — mission : ${ws.mission}\nLangue de travail : français.`

    if (item.kind === 'plan') {
      const cliDetected = this.getCliAgents().filter((a) => a.found)
      const cliLine = cliDetected.length
        ? `\nAgents CLI détectés sur cette machine, embauchables comme « modèle » (ils travaillent directement dans la zone de travail, coût facturé par leur propre abonnement) : ${cliDetected.map((a) => a.id).join(', ')}.`
        : ''
      const models = PRICING.filter((p) => p.provider !== 'cli' || cliDetected.some((a) => a.id === p.model))
        .map((p) => `${p.model} (${p.inputPerMtok}$/${p.outputPerMtok}$ par Mtok in/out)`).join(', ')
      const budget = mainTask ? `Budget alloué à cette tâche : ${mainTask.budget_allocated.toFixed(2)} $ (plafond dur).` : ''
      const departments = [...new Set(this.store.listEmployees(ws.id).filter((e) => e.department).map((e) => e.department))].join(', ')
      return `RÔLE : CEO. ${base}
On te confie une tâche : évalue-la, embauche si besoin, découpe-la en sous-tâches assignées aux départements.
${budget} Départements existants : ${departments}. Modèles disponibles et tarifs : ${models}.${cliLine}
Arbitre le coût : modèle économique pour les tâches mécaniques, modèle capable pour les tâches complexes.
${PROTOCOL_HEADER}
- {"action":"hire","args":{"title":"...","department":"...","model":"<un modèle de la liste>"}} pour embaucher un spécialiste
- {"action":"create_subtask","args":{"title":"...","department":"..."}} pour déléguer une sous-tâche
- {"action":"final","report":"..."} quand la décomposition est complète (note d'évaluation : complexité, % du budget)`
    }

    if (item.kind === 'ritual') {
      return `RÔLE : RONDE. ${base}
C'est ta ronde de suivi périodique : on te donne l'état de l'entreprise, produis un court rapport de situation pour le propriétaire.
${PROTOCOL_HEADER}
- {"action":"final","report":"..."}`
    }

    if (item.kind === 'answer') {
      return `RÔLE : MANAGER. ${base}
Un membre de ton équipe est bloqué par une question. Réponds toi-même si ta connaissance du projet suffit ;
escalade au propriétaire UNIQUEMENT si la décision lui appartient (préférence personnelle, arbitrage stratégique, dépense).
${PROTOCOL_HEADER}
- {"action":"answer","args":{"answer":"..."}} pour répondre toi-même
- {"action":"escalate","args":{"reason":"..."}} pour transmettre au propriétaire`
    }

    if (item.kind === 'review') {
      return `RÔLE : REVUE. ${base}
Un membre de ton équipe déclare sa sous-tâche terminée : contrôle la qualité avant de la faire remonter
(SPEC : le manager confirme, relance ou corrige). Rejette UNIQUEMENT si le livrable est clairement insuffisant.
${PROTOCOL_HEADER}
- {"action":"approve","args":{"comment":"..."}} pour confirmer la sous-tâche
- {"action":"reject","args":{"feedback":"..."}} pour la renvoyer avec un retour actionnable`
    }

    if (item.kind === 'farewell') {
      return `RÔLE : RAPPORT DE MISSION. ${base}
Ton contrat de mission s'achève : rédige ton rapport de fin de mission (réalisations, apprentissages,
recommandations pour la suite). Il sera archivé avec ta mémoire — tu restes réveillable.
${PROTOCOL_HEADER}
- {"action":"final","report":"..."}`
    }

    return `RÔLE : SPÉCIALISTE. ${base}
Tu travailles dans une zone de travail cloisonnée. Produis, puis rapporte. Si une information indispensable te manque
et que deviner serait risqué, pose UNE question à ton manager plutôt que d'inventer.
${PROTOCOL_HEADER}
- {"action":"tool","tool":"write_file","args":{"path":"...","content":"..."}} pour écrire un fichier
- {"action":"tool","tool":"read_file","args":{"path":"..."}} pour lire un fichier
- {"action":"tool","tool":"list_files","args":{}} pour lister la zone de travail
- {"action":"ask","args":{"question":"..."}} pour escalader une question bloquante à ton manager
- {"action":"final","report":"..."} quand la mission est terminée (rapport bref)`
  }

  private goalFor(item: QueueItem, task: Task | null, mainTask: Task | null): string {
    if (item.kind === 'ritual' || item.kind === 'farewell') return item.brief ?? ''
    if (item.kind === 'review' && task) {
      const assignee = task.assignee_id ? this.store.getEmployee(task.assignee_id) : null
      return `Sous-tâche « ${task.title} » (tâche « ${mainTask?.title ?? '?'} ») — Tentative n°${task.retries + 1}.
${assignee?.name ?? '?'} rapporte : ${item.brief ?? '(rapport vide)'}`
    }
    if (item.kind === 'plan' && task) return `${task.title}\n\n${task.description}`
    if (item.kind === 'answer' && item.questionId) {
      const q = this.store.questionGet(item.questionId)
      const asker = q ? this.store.getEmployee(q.asker_id) : null
      const sub = q ? this.store.getTask(q.task_id) : null
      return `Question de ${asker?.name ?? '?'} (sous-tâche « ${sub?.title ?? '?'} », tâche « ${mainTask?.title ?? '?'} ») :\n${q?.text ?? ''}`
    }
    // execute : le brief + les réponses aux questions + le feedback de revue éventuel
    const answered = task
      ? this.store.questionsForTask(task.id)
          .filter((q) => q.status === 'answered')
          .map((q) => `Réponse reçue à ta question « ${q.text.slice(0, 80)} » : ${q.answer}`)
      : []
    const feedback = task?.review_feedback
      ? [`Retour de ton manager (version précédente rejetée) : ${task.review_feedback}`]
      : []
    return [`${task!.title} (tâche parente : ${mainTask!.title})`, ...answered, ...feedback].join('\n')
  }

  private async run(item: QueueItem): Promise<void> {
    const ws = this.store.getWorkspace()
    const employee = this.store.getEmployee(item.employeeId)
    if (!ws || !employee) return
    const task = item.taskId ? this.store.getTask(item.taskId) : null
    // rondes et fins de mission n'ont pas de tâche associée
    if (!task && item.kind !== 'ritual' && item.kind !== 'farewell') return

    // Le travail est budgété sur la tâche PRINCIPALE (comptabilité d'engagement) ;
    // une ronde est budgétée sur l'enveloppe du workspace.
    const mainTask = task ? (task.parent_id ? this.store.getTask(task.parent_id)! : task) : null

    // Employé « agent CLI » (Claude Code / Codex) : la CLI locale exécute la
    // sous-tâche en headless dans la zone de travail, pas notre boucle LLM.
    if (item.kind === 'execute' && task && mainTask && isCliModel(employee.model)) {
      await this.runCliIntervention(item, task, mainTask, employee)
      return
    }

    const events: TraceEvent[] = []
    let tokensIn = 0
    let tokensOut = 0
    let cost = 0
    const trigger = {
      plan: 'Nouvelle tâche à planifier', execute: 'Sous-tâche assignée',
      ritual: 'Ronde managériale', answer: 'Question d’un subordonné',
      review: 'Revue d’une sous-tâche', farewell: 'Fin de contrat de mission',
    }[item.kind]
    const traceId = this.store.traceStart({
      workspace_id: ws.id, employee_id: employee.id, task_id: task?.id ?? null, trigger,
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
          goal: this.goalFor(item, task, mainTask),
          model: employee.model,
          role: { plan: 'ceo', ritual: 'ronde', answer: 'manager', review: 'review', farewell: 'farewell', execute: 'specialist' }[item.kind],
          system: this.systemFor(item, employee, mainTask),
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

        if (msg.method === 'org.hire' && msg.id !== undefined && employee.role === 'ceo') {
          try {
            const { title, department, model } = msg.params as { title: string; department?: string; model?: string }
            const detectedCli = this.getCliAgents().filter((a) => a.found).map((a) => a.id)
            const known = model && PRICING.some((p) => p.model === model)
            const usable = known && (!isCliModel(model!) || detectedCli.includes(model as CliAgent['id']))
            const chosenModel = usable ? model! : employee.model
            const existing = this.store.listEmployees(ws.id)
            const name = HIRE_NAMES.find((n) => !existing.some((e) => e.name === n)) ?? `Recrue ${existing.length + 1}`
            const dept = department ?? 'Général'
            const head = existing.find((e) => e.role === 'head' && e.department === dept)
            const hired = this.store.hire({
              workspace_id: ws.id, name, title: title || `Spécialiste ${dept}`,
              role: 'specialist', department: dept, manager_id: head?.id ?? employee.id,
              contract: 'mission', color: HIRE_COLORS[existing.length % HIRE_COLORS.length],
              model: chosenModel, autonomy: 'ask_sensitive',
              scope: `${title || 'Spécialiste'} — recruté(e) par ${employee.name} pour « ${mainTask?.title ?? ws.name} ».`,
              character: [55, 50, 70, 60, 45, 60],
              perms: [`fs:zone ${dept}`], memory: [],
              hired_for: mainTask?.id ?? null,
            })
            this.store.messageAdd({
              workspace_id: ws.id, from_id: employee.id, to_id: hired.id,
              content: `Bienvenue ${hired.name.split(' ')[0]} — contrat de mission sur « ${mainTask?.title ?? ws.name} ». Modèle attribué : ${chosenModel}.`,
            })
            push('embauche', `${hired.name} (${hired.title}) · ${dept} · modèle ${chosenModel}`)
            child.stdin.write(JSON.stringify({ id: msg.id, result: { employeeId: hired.id, name: hired.name, model: chosenModel } }) + '\n')
            this.onChange()
          } catch (e) {
            child.stdin.write(JSON.stringify({ id: msg.id, error: String(e) }) + '\n')
          }
          return
        }

        if (msg.method === 'task.create_subtask' && msg.id !== undefined && mainTask) {
          const { title, department } = msg.params as { title: string; department?: string }
          const employees = this.store.listEmployees(ws.id).filter((e) => e.status === 'active')
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
          push('délégation', `Sous-tâche « ${title} » → ${assignee?.name ?? 'non assignée'}`)
          child.stdin.write(JSON.stringify({ id: msg.id, result: { subtaskId: sub.id, assignee: assignee?.name ?? null } }) + '\n')
          this.onChange()
          return
        }

        if (msg.method === 'llm.complete' && msg.id !== undefined) {
          const { model, system, messages } = msg.params as {
            model: string; system: string
            messages: { role: 'user' | 'assistant'; content: string }[]
          }
          const exceeded = mainTask
            ? this.store.spentOnTask(mainTask.id) >= mainTask.budget_allocated
            : this.store.ledgerTotals(ws.id).consumption >= ws.budget_amount
          if (exceeded) {
            child.stdin.write(JSON.stringify({ id: msg.id, error: 'budget_exceeded' }) + '\n')
            return
          }
          // Un provider manquant ne doit JAMAIS tuer le démon : erreur RPC
          let provider: Provider
          try {
            provider = this.providerFor(model)
          } catch (e) {
            child.stdin.write(JSON.stringify({ id: msg.id, error: String(e) }) + '\n')
            return
          }
          provider
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
    } else if (item.kind === 'farewell') {
      this.afterFarewell(ws.id, employee, report)
    } else if (item.kind === 'answer') {
      this.afterAnswer(item, ws.id, employee, outcome, report)
    } else if (item.kind === 'review' && task && mainTask) {
      this.afterReview(ws.id, task, mainTask, employee, outcome, report)
    } else if (task && mainTask) {
      this.afterIntervention(item, ws.id, task, mainTask, employee, outcome, report)
    }
    this.onChange()
  }

  /** Fin de contrat : rapport archivé avec l'employé — réveillable (décision 11). */
  private afterFarewell(wsId: string, employee: Employee, report: string): void {
    const finalReport = report || `Mission terminée. (rapport non produit)`
    this.store.archiveEmployee(employee.id, finalReport)
    this.store.inboxAdd({
      workspace_id: wsId, type: 'mission_report',
      title: `${employee.name} a terminé sa mission — rapport archivé`,
      body: finalReport.slice(0, 400),
      employee_id: employee.id,
    })
  }

  /** Issue d'une revue de sous-tâche par le manager (SPEC-V1 §3.5). */
  private afterReview(wsId: string, task: Task, mainTask: Task, manager: Employee, outcome: string, report: string): void {
    if (outcome === 'rejected' && task.assignee_id) {
      this.store.updateTask(task.id, { status: 'todo', review_feedback: report, retries: task.retries + 1 })
      this.store.messageAdd({ workspace_id: wsId, from_id: manager.id, to_id: task.assignee_id, task_id: task.id, content: `À retravailler : ${report}` })
      this.enqueue({ kind: 'execute', taskId: task.id, employeeId: task.assignee_id })
      return
    }
    // approuvée (ou revue en échec : on ne bloque pas la chaîne pour autant)
    this.store.updateTask(task.id, { status: 'done_confirmed' })
    if (task.assignee_id && outcome === 'approved' && report) {
      this.store.messageAdd({ workspace_id: wsId, from_id: manager.id, to_id: task.assignee_id, task_id: task.id, content: report })
    }
    this.checkMainCompletion(wsId, mainTask)
  }

  /** Tous les livrables confirmés → la tâche principale passe à « done ». */
  private checkMainCompletion(wsId: string, mainTask: Task): void {
    const subs = this.store.subtasksOf(mainTask.id)
    if (subs.length === 0 || !subs.every((s) => s.status === 'done_confirmed')) return
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

  /** À l'archivage d'une tâche : fin de contrat des CDD recrutés pour elle. */
  onTaskArchived(taskId: string): void {
    const ws = this.store.getWorkspace()
    if (!ws) return
    const task = this.store.getTask(taskId)
    for (const e of this.store.listEmployees(ws.id)) {
      if (e.contract !== 'mission' || e.status !== 'active' || e.hired_for !== taskId) continue
      this.enqueue({
        kind: 'farewell', taskId: null, employeeId: e.id,
        brief: `Ta mission « ${task?.title ?? taskId} » est terminée et archivée par le propriétaire. Rédige ton rapport de fin de mission.`,
      })
    }
  }

  /** Sous-tâche exécutée par un agent CLI local (Claude Code / Codex). */
  private async runCliIntervention(item: QueueItem, task: Task, mainTask: Task, employee: Employee): Promise<void> {
    const ws = this.store.getWorkspace()!
    const model = employee.model as CliAgent['id']
    const events: TraceEvent[] = []
    const push = (kind: string, text: string) => events.push({ at: new Date().toISOString(), kind, text })
    const traceId = this.store.traceStart({
      workspace_id: ws.id, employee_id: employee.id, task_id: task.id,
      trigger: `Sous-tâche assignée (agent CLI ${model})`,
    })

    // Garde-fou budgétaire identique au flux LLM : vérifié AVANT de lancer
    if (this.store.spentOnTask(mainTask.id) >= mainTask.budget_allocated) {
      push('issue', 'paused_budget — budget épuisé avant lancement de la CLI')
      this.store.traceFinish(traceId, events, 0, 0, 0, 'paused_budget')
      this.afterIntervention(item, ws.id, task, mainTask, employee, 'paused_budget', 'Budget épuisé — pause propre.')
      return
    }

    this.store.updateTask(task.id, { status: 'in_progress' })
    this.onChange()

    const prompt = [
      this.goalFor(item, task, mainTask),
      mainTask.description ? `Contexte : ${mainTask.description}` : '',
      'Travaille dans le répertoire courant (ta zone de travail dédiée), produis les fichiers nécessaires, puis résume brièvement ce que tu as fait.',
    ].filter(Boolean).join('\n\n')

    const res = await runCliAgent(model, prompt, join(this.dataDir, 'workzones', mainTask.id))
    for (const e of res.events) push(e.kind, e.text)

    if (res.costUsd > 0) {
      this.store.ledgerAppend({
        workspace_id: ws.id, type: 'consumption', amount: res.costUsd,
        task_id: mainTask.id, employee_id: employee.id,
        detail: { model, cli: true, subtask: task.id },
      })
    }
    const outcome = res.ok ? 'done' : 'failed'
    push('issue', `${outcome} — ${res.report.slice(0, 200)}`)
    this.store.traceFinish(traceId, events, 0, 0, res.costUsd, outcome)
    this.afterIntervention(item, ws.id, task, mainTask, employee, outcome, res.report)
    this.onChange()
  }

  /** Issue d'une intervention de manager sur une question. */
  private afterAnswer(item: QueueItem, wsId: string, manager: Employee, outcome: string, report: string): void {
    const q = item.questionId ? this.store.questionGet(item.questionId) : null
    if (!q) return
    const sub = this.store.getTask(q.task_id)
    const asker = this.store.getEmployee(q.asker_id)

    if (outcome === 'answered' && report) {
      // Le HEAD a filtré : l'utilisateur n'est pas dérangé (décision 18)
      this.store.questionAnswer(q.id, report, manager.id)
      if (asker) {
        this.store.messageAdd({ workspace_id: wsId, from_id: manager.id, to_id: asker.id, task_id: q.task_id, content: report })
      }
      if (sub?.assignee_id) {
        this.store.updateTask(sub.id, { status: 'todo' })
        this.enqueue({ kind: 'execute', taskId: sub.id, employeeId: sub.assignee_id })
      }
      return
    }
    // Escalade (ou échec du manager) : la question atteint l'inbox du propriétaire
    this.store.questionSetStatus(q.id, 'pending_user')
    this.store.inboxAdd({
      workspace_id: wsId, type: 'question',
      title: `${manager.name.split(' ')[0]} n'a pas pu répondre : ${q.text.slice(0, 120)}`,
      body: `Remontée par ${asker?.name ?? '?'} · ${report || 'décision du propriétaire requise'} · la sous-tâche « ${sub?.title ?? '?'} » est bloquée en attendant.`,
      task_id: sub?.parent_id ?? null, employee_id: manager.id, ref: q.id,
    })
    this.store.messageAdd({
      workspace_id: wsId, from_id: manager.id, to_id: 'user', task_id: q.task_id,
      content: `Question transmise à votre inbox : « ${q.text.slice(0, 100)} »`,
    })
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
        if (sub.status !== 'done_confirmed' && sub.status !== 'blocked' && sub.assignee_id) {
          this.enqueue({ kind: 'execute', taskId: sub.id, employeeId: sub.assignee_id })
        }
      }
      return
    }

    // Sous-tâche : question escaladée par le spécialiste (SPEC-V1 §3.5)
    if (outcome === 'blocked') {
      this.store.updateTask(task.id, { status: 'blocked' })
      const q = this.store.questionAdd({
        workspace_id: wsId, task_id: task.id, asker_id: employee.id, text: report,
      })
      const supervisor = task.supervisor_id ? this.store.getEmployee(task.supervisor_id) : null
      const ceo = this.store.listEmployees(wsId).find((e) => e.role === 'ceo')
      const manager = supervisor ?? ceo
      if (manager) {
        this.store.messageAdd({ workspace_id: wsId, from_id: employee.id, to_id: manager.id, task_id: task.id, content: report })
        this.enqueue({ kind: 'answer', taskId: task.id, employeeId: manager.id, questionId: q.id })
      } else {
        // pas de hiérarchie : directement à l'utilisateur
        this.store.questionSetStatus(q.id, 'pending_user')
        this.store.inboxAdd({
          workspace_id: wsId, type: 'question', title: q.text.slice(0, 120),
          body: `Question de ${employee.name}.`, task_id: mainTask.id, employee_id: employee.id, ref: q.id,
        })
      }
      return
    }

    // Sous-tâche exécutée : revue QUALITATIVE par le superviseur (SPEC §3.5) —
    // le manager confirme, ou rejette avec un retour actionnable.
    if (outcome !== 'done') {
      this.store.updateTask(task.id, { status: 'todo' })
      return
    }
    if (task.supervisor_id) {
      this.store.messageAdd({
        workspace_id: wsId, from_id: employee.id, to_id: task.supervisor_id, task_id: task.id,
        content: report,
      })
    }
    const supervisor = task.supervisor_id ? this.store.getEmployee(task.supervisor_id) : null
    // Garde anti-boucle : après 2 rejets, on confirme d'office (le propriétaire
    // tranchera à la vérification du livrable final)
    if (!supervisor || supervisor.id === employee.id || task.retries >= 2) {
      this.store.updateTask(task.id, { status: 'done_confirmed' })
      this.checkMainCompletion(wsId, mainTask)
      return
    }
    this.store.updateTask(task.id, { status: 'review' })
    this.enqueue({ kind: 'review', taskId: task.id, employeeId: supervisor.id, brief: report })
  }
}
