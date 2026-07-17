// Les rituels (SPEC-V1 §3.7) — le battement de cœur de l'entreprise.
//
// Deux étages, décision 20 du brainstorming :
//  1. Ronde TECHNIQUE (code pur, coût zéro) : à chaque tick, le démon vérifie
//     les signes vitaux — tâches figées, pauses budget, budget > 80 %.
//     Rien d'actif et rien d'anormal → personne n'est réveillé.
//  2. Ronde MANAGÉRIALE (LLM, payante) : déclenchée seulement s'il y a du
//     travail en cours ou une anomalie — le CEO fait le point et rapporte.
//
// S'y ajoute le RAPPORT DU MATIN : chaque jour à l'heure configurée, le CEO
// compile les chiffres réels et les dépose dans l'inbox.

import type { InterventionRunner } from './interventions.js'
import type { Store } from './store.js'

export class RitualScheduler {
  private lastManagerial = 0
  private lastMorningDay = ''

  constructor(
    private store: Store,
    private runner: InterventionRunner,
    private onChange: () => void,
  ) {}

  start(): void {
    setInterval(() => this.technicalRound(), 30_000).unref()
    setInterval(() => this.morningCheck(), 30_000).unref()
  }

  tickMinutes(): number {
    return Number(this.store.settingGet('ritual_tick_minutes') ?? 60)
  }

  morningTime(): string {
    return this.store.settingGet('morning_report_time') ?? '09:00'
  }

  /** Ronde technique : gratuite, silencieuse quand tout va bien. */
  technicalRound(): { active: number; anomalies: string[] } | null {
    const ws = this.store.getWorkspace()
    if (!ws) return null
    const tasks = this.store.listTasks(ws.id).filter((t) => !t.parent_id)
    const anomalies: string[] = []
    let active = 0

    for (const t of tasks) {
      if (['planning', 'in_progress'].includes(t.status)) {
        active++
        // Tâche figée : en cours mais aucune intervention depuis > 10 min → on relance
        const stale = Date.now() - new Date(t.updated_at).getTime() > 10 * 60_000
        if (stale && !this.runner.isBusy()) {
          anomalies.push(`Tâche « ${t.title} » sans activité — relance automatique`)
          this.runner.resumeTask(t.id)
        }
      }
      if (t.status === 'paused_budget') anomalies.push(`Tâche « ${t.title} » en pause budget`)
    }

    const totals = this.store.ledgerTotals(ws.id)
    if (ws.budget_amount > 0 && totals.consumption > ws.budget_amount * 0.8) {
      anomalies.push(`Consommation > 80 % de l'enveloppe (${totals.consumption.toFixed(2)} $ / ${ws.budget_amount.toFixed(2)} $)`)
    }

    // Ronde managériale : seulement si activité/anomalie ET tick écoulé
    const tickMs = this.tickMinutes() * 60_000
    if ((active > 0 || anomalies.length > 0) && Date.now() - this.lastManagerial > tickMs) {
      this.lastManagerial = Date.now()
      this.runner.submitRitual('ronde', this.roundBrief(active, anomalies))
    }
    return { active, anomalies }
  }

  private roundBrief(active: number, anomalies: string[]): string {
    const ws = this.store.getWorkspace()!
    const totals = this.store.ledgerTotals(ws.id)
    return [
      `Ronde de suivi. État de l'entreprise :`,
      `- ${active} tâche(s) en cours`,
      `- consommé : ${totals.consumption.toFixed(4)} $ / ${ws.budget_amount.toFixed(2)} $`,
      anomalies.length ? `- anomalies : ${anomalies.join(' ; ')}` : `- aucune anomalie`,
      `Fais le point auprès de tes HEADs et produis un court rapport de situation.`,
    ].join('\n')
  }

  /** Rapport du matin : une fois par jour à l'heure configurée. */
  private morningCheck(): void {
    const ws = this.store.getWorkspace()
    if (!ws) return
    const now = new Date()
    const today = now.toISOString().slice(0, 10)
    if (this.lastMorningDay === today) return
    const [h, m] = this.morningTime().split(':').map(Number)
    if (now.getHours() < h || (now.getHours() === h && now.getMinutes() < m)) return

    this.lastMorningDay = today
    const tasks = this.store.listTasks(ws.id).filter((t) => !t.parent_id)
    const totals = this.store.ledgerTotals(ws.id)
    const inReview = tasks.filter((t) => t.status === 'done').length
    const paused = tasks.filter((t) => t.status === 'paused_budget').length
    const inProgress = tasks.filter((t) => ['planning', 'in_progress'].includes(t.status)).length
    const ceo = this.store.listEmployees(ws.id).find((e) => e.role === 'ceo')

    this.store.inboxAdd({
      workspace_id: ws.id, type: 'morning_report',
      title: `Rapport du matin ☕ — ${inProgress} en cours, ${inReview} à vérifier${paused ? `, ${paused} en pause budget` : ''}`,
      body: [
        `Consommé : ${totals.consumption.toFixed(4)} $ / ${ws.budget_amount.toFixed(2)} $ · restitué : ${totals.release.toFixed(4)} $.`,
        inReview ? `${inReview} livrable(s) attendent votre vérification.` : null,
        paused ? `${paused} tâche(s) en pause budget attendent votre décision.` : null,
        !inProgress && !inReview && !paused ? `Rien en cours — l'entreprise attend vos prochaines tâches.` : null,
      ].filter(Boolean).join(' '),
      employee_id: ceo?.id,
    })
    this.onChange()
  }
}
