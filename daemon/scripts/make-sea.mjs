#!/usr/bin/env node
// Empaquette le démon en exécutable unique via Node SEA (Single Executable
// Application) : réutilise le binaire Node local — pas de téléchargement de
// runtime, comportement identique sur les 3 OS (CI comme poste de dev).
//
//   node scripts/make-sea.mjs <chemin/sortie[.exe]>
//
// Prérequis : dist/bundle.cjs (npm run build && npm run bundle).

import { execFileSync } from 'node:child_process'
import { chmodSync, copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const out = process.argv[2]
if (!out) {
  console.error('usage : node scripts/make-sea.mjs <chemin/sortie>')
  process.exit(1)
}
const outPath = resolve(out)
const root = join(import.meta.dirname, '..')
const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit', cwd: root })

// 1. Blob SEA depuis le bundle CJS
const seaConfig = join(root, 'dist', 'sea-config.json')
const blob = join(root, 'dist', 'sea-prep.blob')
writeFileSync(seaConfig, JSON.stringify({
  main: 'dist/bundle.cjs',
  output: 'dist/sea-prep.blob',
  disableExperimentalSEAWarning: true,
}))
run(process.execPath, ['--experimental-sea-config', seaConfig])

// 2. Copie du binaire Node courant
mkdirSync(dirname(outPath), { recursive: true })
copyFileSync(process.execPath, outPath)
chmodSync(outPath, 0o755)

// 3. macOS : retirer la signature avant injection
if (process.platform === 'darwin') {
  run('codesign', ['--remove-signature', outPath])
}

// 4. Injection du blob
const postjectArgs = [
  '--yes', 'postject', outPath, 'NODE_SEA_BLOB', blob,
  '--sentinel-fuse', 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
]
if (process.platform === 'darwin') postjectArgs.push('--macho-segment-name', 'NODE_SEA')
run(process.platform === 'win32' ? 'npx.cmd' : 'npx', postjectArgs)

// 5. macOS : re-signature ad hoc
if (process.platform === 'darwin') {
  run('codesign', ['--sign', '-', outPath])
}

console.log(`✓ binaire sidecar : ${outPath}`)
