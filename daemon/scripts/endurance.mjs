#!/usr/bin/env node
// Test d'endurance mémoire (SPEC-V1 §5.2 / critère d'acceptation 11).
// Lance le démon (SQLite), enchaîne N tâches complètes — chacune traverse la
// cascade réelle : planification CEO → sous-tâches → livraison — sur des
// workers éphémères, échantillonne la RSS, vérifie le retour au repos et le
// garde-fou budgétaire.
//
//   node scripts/endurance.mjs [nbTâches]   (défaut : 10)

import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const N = Number(process.argv[2] ?? 10)
const PORT = 4700 + Math.floor(Math.random() * 200)
const BASE = `http://127.0.0.1:${PORT}`
const dataDir = mkdtempSync(join(tmpdir(), 'koateam-endurance-'))

const daemon = spawn(process.execPath, [join(import.meta.dirname, '../dist/index.js')], {
  env: { ...process.env, KOATEAM_PORT: String(PORT), KOATEAM_DATA: dataDir, KOATEAM_SEED: 'demo' },
  stdio: 'inherit',
})

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const get = async (path) => (await fetch(BASE + path)).json()
const post = async (path, body) => (await fetch(BASE + path, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body ?? {}),
})).json()
const mb = (b) => (b / 1024 / 1024).toFixed(1)

async function waitReady() {
  for (let i = 0; i < 50; i++) {
    try { return await get('/status') } catch { await sleep(150) }
  }
  throw new Error('démon injoignable')
}

async function taskStatus(id) {
  const s = await get('/state')
  return s.tasks.find((t) => t.id === id)
}

async function runTask(title, budget) {
  const { id } = await post('/tasks', { title, description: 'tâche d’endurance', budget })
  for (let i = 0; i < 600; i++) {
    const t = await taskStatus(id)
    if (t && ['done', 'paused_budget', 'archived'].includes(t.status)) return t
    await sleep(100)
  }
  throw new Error('tâche trop lente')
}

try {
  await waitReady()
  await sleep(500)
  const baseline = (await get('/status')).rss
  console.log(`\n=== Endurance : ${N} tâches en cascade complète · RSS de repos ${mb(baseline)} Mo ===\n`)

  // 1. Garde-fou budget : pause propre + alerte inbox attendues
  const paused = await runTask('Tâche sacrifiée au garde-fou budgétaire', 0.000001)
  if (paused.status !== 'paused_budget') throw new Error(`ÉCHEC garde-fou : statut ${paused.status}`)
  const alerts = (await get('/state')).inbox.filter((i) => i.type === 'budget_pause_alert')
  if (alerts.length === 0) throw new Error('ÉCHEC : pas d’alerte inbox de pause budget')
  console.log(`✓ garde-fou budget : pause propre + alerte inbox\n`)

  // 2. Endurance : N tâches complètes (CEO + sous-tâches à chaque fois)
  const doneList = []
  for (let i = 1; i <= N; i++) {
    const t = await runTask(`Tâche d'endurance n°${i}`, 0.05)
    doneList.push(t)
    const s = await get('/status')
    process.stdout.write(`  tâche ${String(i).padStart(2)}/${N} · ${t.status} · ${t.subtasks.length} sous-tâches · RSS démon ${mb(s.rss)} Mo\n`)
    await post(`/tasks/${t.id}/archive`)
  }

  await sleep(1500)
  const final = await get('/status')
  const state = await get('/state')
  const doneCount = doneList.filter((t) => t.status === 'done').length
  const drift = final.rss - baseline

  console.log(`\n=== Résultats ===`)
  console.log(`tâches livrées           : ${doneCount}/${N} (+1 pause budget volontaire)`)
  console.log(`interventions exécutées  : ${final.interventionsDone} (workers éphémères)`)
  console.log(`comptabilité             : consommé ${state.totals.consumption.toFixed(6)} $ · restitué ${state.totals.release.toFixed(6)} $`)
  console.log(`RSS démon repos → final  : ${mb(baseline)} → ${mb(final.rss)} Mo (dérive ${drift >= 0 ? '+' : ''}${mb(drift)} Mo)`)
  console.log(`RSS démon pic            : ${mb(final.peakRss)} Mo · alertes watchdog : ${final.watchdogAlerts}`)
  console.log(`RSS worker pic           : ${mb(final.workerPeakRss)} Mo (rendue à l'OS après chaque intervention)`)

  const LIMIT_DRIFT = 30 * 1024 * 1024
  const ok = doneCount === N && drift < LIMIT_DRIFT && final.watchdogAlerts === 0
  console.log(`\n${ok ? '✅ ENDURANCE OK' : '❌ ENDURANCE ÉCHOUÉE'} (critère : dérive < 30 Mo, 0 alerte watchdog, ${N}/${N} tâches)`)
  process.exitCode = ok ? 0 : 1
} finally {
  daemon.kill()
}
