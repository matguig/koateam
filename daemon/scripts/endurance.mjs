#!/usr/bin/env node
// Test d'endurance mémoire (SPEC-V1 §5.2 / critère d'acceptation 11).
// Lance le démon, enchaîne N missions sur des workers éphémères, échantillonne
// la RSS du démon, vérifie le retour au niveau de repos et le garde-fou budget.
//
//   node scripts/endurance.mjs [nbMissions]   (défaut : 10)

import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const N = Number(process.argv[2] ?? 10)
const PORT = 4700 + Math.floor(Math.random() * 200)
const BASE = `http://127.0.0.1:${PORT}`
const dataDir = mkdtempSync(join(tmpdir(), 'koateam-endurance-'))

const daemon = spawn(process.execPath, [join(import.meta.dirname, '../dist/index.js')], {
  env: { ...process.env, KOATEAM_PORT: String(PORT), KOATEAM_DATA: dataDir },
  stdio: 'inherit',
})

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const get = async (path) => (await fetch(BASE + path)).json()
const mb = (b) => (b / 1024 / 1024).toFixed(1)

async function waitReady() {
  for (let i = 0; i < 50; i++) {
    try { return await get('/status') } catch { await sleep(100) }
  }
  throw new Error('démon injoignable')
}

async function runMission(goal, budget) {
  const before = (await get('/status')).missionsDone
  await fetch(BASE + '/mission', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ goal, model: 'mock-fast', budget }),
  })
  for (let i = 0; i < 300; i++) {
    const s = await get('/status')
    if (s.missionsDone > before) return s
    await sleep(50)
  }
  throw new Error('mission trop lente')
}

try {
  await waitReady()
  await sleep(500)
  const baseline = (await get('/status')).rss
  console.log(`\n=== Endurance : ${N} missions · RSS de repos initiale ${mb(baseline)} Mo ===\n`)

  // 1. Garde-fou budget : budget volontairement trop petit → pause propre attendue
  await runMission('Mission sacrifiée au garde-fou budgétaire', 0.000001)
  const paused = (await get('/missions')).find((m) => m.status === 'paused_budget')
  if (!paused) throw new Error('ÉCHEC : le garde-fou budget n’a pas déclenché de pause propre')
  console.log(`✓ garde-fou budget : mission en pause propre (« ${paused.report} »)\n`)

  // 2. Endurance : N missions complètes
  const samples = []
  for (let i = 1; i <= N; i++) {
    const s = await runMission(`Mission d'endurance n°${i} : produire un livrable de test`, 0.05)
    samples.push(s.rss)
    process.stdout.write(`  mission ${String(i).padStart(2)}/${N} · RSS démon ${mb(s.rss)} Mo\n`)
  }

  await sleep(1500) // laisser l'OS récupérer
  const final = await get('/status')
  const missions = await get('/missions')
  const doneCount = missions.filter((m) => m.status === 'done').length
  const totalCost = missions.reduce((n, m) => n + (m.cost ?? 0), 0)
  const workerPeak = Math.max(...missions.map((m) => m.workerPeakRss ?? 0))
  const drift = final.rss - baseline

  console.log(`\n=== Résultats ===`)
  console.log(`missions terminées   : ${doneCount}/${N} (+1 pause budget volontaire)`)
  console.log(`coût total comptabilisé : ${totalCost.toFixed(6)} $ (ledger : ${final.totals.consumption.toFixed(6)} $)`)
  console.log(`RSS démon  repos → final : ${mb(baseline)} → ${mb(final.rss)} Mo (dérive ${drift >= 0 ? '+' : ''}${mb(drift)} Mo)`)
  console.log(`RSS démon  pic           : ${mb(final.peakRss)} Mo · alertes watchdog : ${final.watchdogAlerts}`)
  console.log(`RSS worker pic           : ${mb(workerPeak)} Mo (rendue à l'OS après chaque mission)`)

  const LIMIT_DRIFT = 30 * 1024 * 1024
  const ok = doneCount === N && drift < LIMIT_DRIFT && final.watchdogAlerts === 0
  console.log(`\n${ok ? '✅ ENDURANCE OK' : '❌ ENDURANCE ÉCHOUÉE'} (critère : dérive < 30 Mo, 0 alerte watchdog, ${N}/${N} missions)`)
  process.exitCode = ok ? 0 : 1
} finally {
  daemon.kill()
}
