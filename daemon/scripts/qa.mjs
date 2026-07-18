#!/usr/bin/env node
// Suite QA du démon : cas limites, actions doubles, validation des entrées,
// intégrité comptable et récupération après crash. Exécutée en CI.
//
//   node scripts/qa.mjs

import { spawn } from 'node:child_process'
import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const PORT = 4600 + Math.floor(Math.random() * 200)
const BASE = `http://127.0.0.1:${PORT}`
const dataDir = mkdtempSync(join(tmpdir(), 'koateam-qa-'))
const DIST = join(import.meta.dirname, '../dist/index.js')

// Stub Claude Code : détection + exécution CLI déterministes, sans clé API.
// Prioritaire dans le PATH du démon (même si une vraie CLI est installée).
const stubDir = mkdtempSync(join(tmpdir(), 'koateam-clistub-'))
writeFileSync(join(stubDir, 'claude'), `#!/bin/sh
if [ "$1" = "--version" ]; then echo "9.9.9 (stub Claude Code)"; exit 0; fi
echo "produit par le stub" > livrable-cli.md
echo '{"type":"result","subtype":"success","result":"Travail effectué par le stub Claude Code : livrable-cli.md créé dans la zone de travail.","total_cost_usd":0.0123,"num_turns":2}'
`)
chmodSync(join(stubDir, 'claude'), 0o755)

let daemon = null
const startDaemon = () => {
  daemon = spawn(process.execPath, [DIST], {
    env: { ...process.env, PATH: `${stubDir}:${process.env.PATH}`, KOATEAM_PORT: String(PORT), KOATEAM_DATA: dataDir },
    stdio: 'ignore',
  })
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const get = async (p) => (await fetch(BASE + p)).json()
const post = (p, body) => fetch(BASE + p, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body ?? {}),
})

let passed = 0
let failed = 0
const check = (name, cond, detail = '') => {
  if (cond) { passed++; console.log(`  ✓ ${name}`) }
  else { failed++; console.log(`  ✗ ${name} ${detail}`) }
}

async function waitReady() {
  for (let i = 0; i < 60; i++) {
    try { await get('/status'); return } catch { await sleep(150) }
  }
  throw new Error('démon injoignable')
}

async function waitTask(id, timeoutMs = 30_000) {
  const t0 = Date.now()
  while (Date.now() - t0 < timeoutMs) {
    const s = await get('/state')
    const t = s.tasks.find((x) => x.id === id)
    if (t && ['done', 'paused_budget'].includes(t.status)) return t
    await sleep(100)
  }
  throw new Error(`tâche ${id} trop lente`)
}

startDaemon()
try {
  await waitReady()

  // La détection CLI est asynchrone au démarrage : on l'attend avant de fonder
  for (let i = 0; i < 40; i++) {
    const s = await get('/settings')
    if (s.cliAgents?.some((a) => a.found)) break
    await sleep(100)
  }

  console.log('\n— Fondation —')
  check('pas de workspace au premier démarrage', (await get('/state')).workspace === null)
  let r = await post('/tasks', { title: 'trop tôt', budget: 0.05 })
  check('créer une tâche sans workspace → 409', r.status === 409)

  await post('/foundation/message', { text: 'Projet QA : vendre des tests automatisés' })
  const prof = await (await post('/foundation/message', { text: '15' })).json()
  check('interview → 3 profils proposés', prof.profiles?.length === 3)
  r = await post('/foundation/sign', { ceoIndex: 2, traits: [50, 50, 50, 50, 50, 50] })
  check('signature du contrat → 200', r.status === 200)
  const st1 = await get('/state')
  check('workspace fondé avec budget de l’interview', st1.workspace?.budget_amount === 15)
  check('CEO = profil choisi (Élise)', st1.employees.some((e) => e.role === 'ceo' && e.name === 'Élise Rambert'))
  check('jauges contractualisées', st1.employees.find((e) => e.role === 'ceo')?.character?.[0] === 50)
  check('HEADs + spécialistes embauchés', st1.employees.length >= 5)
  r = await post('/foundation/sign', { ceoIndex: 0 })
  check('double signature → 409', r.status === 409)

  console.log('\n— Validation des entrées —')
  r = await post('/tasks', { title: '   ', budget: 0.05 })
  check('tâche sans titre → 400', r.status === 400)
  r = await post('/tasks', { title: 'budget nul', budget: 0 })
  check('budget 0 → 400', r.status === 400)
  r = await post('/tasks', { title: 'budget négatif', budget: -5 })
  check('budget négatif → 400', r.status === 400)
  r = await post('/settings', { ritual_tick_minutes: 'abc' })
  check('tick invalide ignoré (pas de NaN stocké)', (await r.json()).ritualTickMinutes === 60)
  r = await post('/settings', { morning_report_time: '25h99' })
  check('heure invalide ignorée', (await r.json()).morningReportTime === '09:00')
  await post('/settings', { anthropic_api_key: 'sk-ant-test' })
  check('clé API → provider configuré', (await get('/settings')).anthropicConfigured === true)
  await post('/settings', { anthropic_api_key: '' })
  check('clé vidée → provider déconfiguré', (await get('/settings')).anthropicConfigured === false)

  console.log('\n— Flux cœur & intégrité comptable —')
  const { id: t1 } = await (await post('/tasks', { title: 'Cascade QA', description: 'test', budget: 0.05 })).json()
  const done1 = await waitTask(t1)
  check('cascade complète → done', done1.status === 'done')
  check('sous-tâches confirmées', done1.subtasks.length >= 1 && done1.subtasks.every((s) => s.status === 'done_confirmed'))

  const totalsBefore = (await get('/state')).totals
  await post(`/tasks/${t1}/archive`)
  const totalsAfter1 = (await get('/state')).totals
  const releasedOnce = totalsAfter1.release - totalsBefore.release
  check('archivage → restitution du reliquat', releasedOnce > 0)
  r = await post(`/tasks/${t1}/archive`)
  check('double archivage → 409', r.status === 409)
  const totalsAfter2 = (await get('/state')).totals
  check('pas de double restitution', Math.abs(totalsAfter2.release - totalsAfter1.release) < 1e-9)
  r = await post(`/tasks/${t1}/reopen`)
  check('réouverture d’une tâche archivée → 409', r.status === 409)

  console.log('\n— Budget : pause / rallonge —')
  const { id: t2 } = await (await post('/tasks', { title: 'Pause QA', budget: 0.000001 })).json()
  const paused = await waitTask(t2)
  check('budget dérisoire → paused_budget', paused.status === 'paused_budget')
  check('alerte inbox émise', (await get('/state')).inbox.some((i) => i.type === 'budget_pause_alert'))
  r = await post(`/tasks/${t2}/topup`, { amount: -1 })
  check('rallonge négative → 400', r.status === 400)
  await post(`/tasks/${t2}/topup`, { amount: 0.05 })
  const resumed = await waitTask(t2)
  check('rallonge → reprise → done', resumed.status === 'done')

  console.log('\n— Agents CLI locaux (Claude Code / Codex) —')
  const cliSettings = await get('/settings')
  const cc = cliSettings.cliAgents.find((a) => a.id === 'claude-code')
  const cx = cliSettings.cliAgents.find((a) => a.id === 'codex')
  check('Claude Code détecté (version remontée)', cc?.found === true && String(cc.version).includes('stub'))
  check('Codex correctement signalé absent', cx?.found === false)
  const dev = (await get('/state')).employees.find((e) => e.department === 'Dev' && e.role === 'specialist')
  check('le spécialiste Dev est embauché sur Claude Code', dev?.model === 'claude-code')

  const { id: c1 } = await (await post('/tasks', { title: 'Intégration via agent CLI', budget: 0.05 })).json()
  const doneC1 = await waitTask(c1, 60_000)
  check('cascade avec sous-tâche exécutée par la CLI → done', doneC1.status === 'done')
  const stC = await get('/state')
  const cliEntry = stC.ledger.find((l) => {
    if (l.type !== 'consumption' || !l.detail) return false
    try { const d = JSON.parse(l.detail); return d.cli === true && d.model === 'claude-code' } catch { return false }
  })
  check('coût rapporté par la CLI imputé au ledger (0,0123 $)', !!cliEntry && Math.abs(cliEntry.amount - 0.0123) < 1e-9)
  const traces = await get('/traces')
  check('trace d’intervention CLI journalisée', traces.some((t) => t.trigger.includes('agent CLI')))
  await post(`/tasks/${c1}/archive`)

  console.log('\n— Questions hiérarchiques (M3) —')
  // 1. Le HEAD filtre : la question ne doit PAS atteindre l'utilisateur
  const { id: q1 } = await (await post('/tasks', { title: 'Étude [QUESTION] filtrée par le HEAD', budget: 0.05 })).json()
  const doneQ1 = await waitTask(q1, 45_000)
  check('question filtrée : tâche livrée sans intervention utilisateur', doneQ1.status === 'done')
  let stQ = await get('/state')
  const filtered = stQ.questions.find((q) => q.text.includes('format de livrable'))
  check('question répondue par le manager (pas « user »)', filtered?.status === 'answered' && filtered?.answered_by !== 'user')
  check('aucun item inbox question pour une question filtrée', !stQ.inbox.some((i) => i.type === 'question' && i.status === 'pending'))
  await post(`/tasks/${q1}/archive`)

  // 2. Escalade au propriétaire : décision qui lui appartient
  const { id: q2 } = await (await post('/tasks', { title: 'Pricing [QUESTION] [USER] décision propriétaire', budget: 0.05 })).json()
  let userQ = null
  for (let i = 0; i < 300 && !userQ; i++) {
    stQ = await get('/state')
    userQ = stQ.questions.find((q) => q.status === 'pending_user')
    await sleep(100)
  }
  check('question escaladée jusqu’à l’utilisateur', !!userQ)
  const inboxQ = stQ.inbox.find((i) => i.type === 'question' && i.ref === userQ?.id)
  check('item inbox question avec référence', !!inboxQ)
  r = await post(`/questions/${userQ.id}/answer`, { answer: '' })
  check('réponse vide → 400', r.status === 400)
  // Les 2 sous-tâches peuvent chacune escalader : on répond à toutes les
  // questions en attente jusqu'à la livraison (comportement réel du patron)
  let doneQ2 = null
  for (let i = 0; i < 400 && !doneQ2; i++) {
    const s = await get('/state')
    for (const q of s.questions.filter((x) => x.status === 'pending_user')) {
      await post(`/questions/${q.id}/answer`, { answer: 'Positionnement premium, 29 €/mois.' })
    }
    const t = s.tasks.find((t) => t.id === q2)
    if (t?.status === 'done') doneQ2 = t
    await sleep(150)
  }
  check('réponse(s) du propriétaire → travail repris → done', doneQ2?.status === 'done')
  r = await post(`/questions/${userQ.id}/answer`, { answer: 'encore' })
  check('double réponse → 409', r.status === 409)
  check('item inbox question résolu automatiquement',
    (await get('/state')).inbox.every((i) => i.ref !== userQ.id || i.status !== 'pending'))
  await post(`/tasks/${q2}/archive`)

  console.log('\n— Embauche par le CEO (M3) —')
  const empBefore = (await get('/state')).employees.length
  const { id: h1 } = await (await post('/tasks', { title: 'Audit [EMBAUCHE] compétence manquante', budget: 0.05 })).json()
  const doneH1 = await waitTask(h1, 45_000)
  check('tâche avec embauche livrée', doneH1.status === 'done')
  const stH = await get('/state')
  const hired = stH.employees.find((e) => e.department === 'QA' && e.role === 'specialist')
  check('nouvelle recrue au département QA', stH.employees.length === empBefore + 1 && !!hired)
  check('modèle économique choisi par le CEO (local, 0 $)', hired?.model === 'local-free')
  check('sous-tâche assignée à la recrue', doneH1.subtasks.some((s) => s.assignee_id === hired?.id && s.status === 'done_confirmed'))
  await post(`/tasks/${h1}/archive`)

  console.log('\n— Réouverture (« pas fini ») —')
  const { id: t4 } = await (await post('/tasks', { title: 'Réouverture QA', budget: 0.05 })).json()
  const done4 = await waitTask(t4)
  const subsBefore = done4.subtasks.length
  await post(`/tasks/${t4}/reopen`)
  const redone = await waitTask(t4, 45_000)
  check('tâche rouverte → re-planifiée par le CEO → done', redone.status === 'done')
  check('nouvelles sous-tâches créées, anciennes non ré-exécutées',
    redone.subtasks.length > subsBefore &&
    redone.subtasks.every((s) => s.status === 'done_confirmed'),
    `(${subsBefore} → ${redone.subtasks.length})`)
  await post(`/tasks/${t4}/archive`)

  console.log('\n— Récupération après crash —')
  const { id: t3 } = await (await post('/tasks', { title: 'Crash QA', budget: 0.05 })).json()
  await sleep(300) // le CEO est en pleine planification
  daemon.kill('SIGKILL')
  await sleep(300)
  startDaemon()
  await waitReady()
  const st2 = await get('/state')
  check('état intact après kill -9 (SQLite)', st2.workspace !== null && st2.tasks.length >= 3)
  const recovered = await waitTask(t3, 45_000)
  check('tâche interrompue reprise et livrée', recovered.status === 'done')

  const ledger = (await get('/state')).ledger
  check('journal comptable non vide et cohérent', ledger.length > 5 && ledger.every((l) => Number.isFinite(l.amount)))

  console.log(`\n${failed === 0 ? '✅ QA OK' : '❌ QA ÉCHOUÉE'} — ${passed} réussis, ${failed} échoués`)
  process.exitCode = failed === 0 ? 0 : 1
} finally {
  daemon?.kill()
}
