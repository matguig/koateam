# Spike M0 — Rapport GO/NO-GO sur la stack

> Objectif (SPEC-V1 §9) : valider **Tauri v2 + démon Node sidecar + workers éphémères**
> avant d'écrire le produit. Dérisquer : (1) l'empaquetage multi-plateforme du sidecar,
> (2) la stratégie mémoire 24/7, (3) la boucle agentique proxifiée et comptabilisée.

## Verdict : **GO** ✅

## Ce qui a été construit

```
daemon/          Démon Node/TS : file de missions, proxy LLM comptable,
                 budgets durs, watchdog mémoire, ronde technique.
                 Le MÊME binaire relancé avec --worker devient le worker
                 éphémère (clé de l'empaquetage sidecar).
daemon/src/worker.ts    Boucle agentique réelle : LLM → outils (write/read/list
                 dans une zone de travail cloisonnée) → rapport final.
                 Zéro clé API côté worker : tout passe par RPC stdio vers le démon.
daemon/src/providers.ts Couche multi-provider : MockProvider (déterministe, pour
                 spike/CI) + AnthropicProvider (réel, activé par ANTHROPIC_API_KEY).
daemon/src/pricing.ts   Table de tarifs embarquée ; coût calculé par appel.
daemon/src/ledger.ts    Comptabilité d'engagement : allocation / consumption /
                 release / topup, persistée sur disque.
desktop/         Coquille Tauri v2 : fenêtre webview servant ui/dist,
                 démon déclaré en externalBin (sidecar), lancé au setup.
.github/workflows/ci.yml  CI 3 OS : test d'endurance + build Tauri complet
                 (deb / app+dmg / nsis) avec sidecar SEA par plateforme.
```

## Résultats mesurés (Linux, conteneur de dev)

### Endurance mémoire — `node scripts/endurance.mjs 12`

| Métrique | Valeur | Critère | |
|---|---|---|---|
| RSS démon au repos | **59,5 Mo** | < 200 Mo (tout compris) | ✅ |
| RSS démon après 12 missions | **67,7 Mo** (dérive +8,3 Mo, échauffement V8 qui plafonne) | dérive < 30 Mo | ✅ |
| Alertes watchdog (seuil 300 Mo) | **0** | 0 | ✅ |
| Pic RSS worker | **57,9 Mo**, rendus à l'OS à chaque fin de mission | — | ✅ |
| Missions terminées | **12/12** | 12/12 | ✅ |
| Comptabilité | ledger = somme des coûts missions au millionième de $ près | exact | ✅ |

### Garde-fou budgétaire

Mission lancée avec un budget volontairement dérisoire → le démon refuse l'appel LLM
**avant** de le passer, le worker termine en `paused_budget` avec un rapport propre.
Le flux « pause + alerte » de SPEC-V1 §3.6 est démontré.

### Binaire sidecar (Node SEA)

- Bundle esbuild (14 ko) injecté dans le binaire Node 22 local → **exécutable unique
  de ~125 Mo**, aucun téléchargement de runtime (reproductible en CI sur les 3 OS).
- Testé de bout en bout : le binaire empaqueté sert l'API **et se relance lui-même
  en mode worker** (le point le plus risqué de l'architecture) — mission complète,
  fichiers produits dans la zone de travail, comptabilité exacte.
- ⚠ Écarté : `@yao-pkg/pkg` (le téléchargement du runtime précompilé échoue derrière
  un proxy → recompilation de Node depuis les sources, inacceptable).

### Build Tauri — validé sur les 3 OS ✅

- **CI GitHub Actions verte** ([run n°2](https://github.com/matguig/koateam/actions/runs/29577757839)) :
  - `daemon` (endurance 10 missions, ubuntu) : ✅ en ~10 s
  - `desktop (ubuntu, deb)` : ✅ en ~4 min 30
  - `desktop (macos, app+dmg)` : ✅ en ~4 min 20
  - `desktop (windows, nsis)` : ✅ (après correctif : postject invoqué via Node —
    Node 22 refuse de spawner `npx.cmd` sans shell, EINVAL)
  - Artefacts téléchargeables : deb / dmg+app / installeur NSIS, chacun avec
    UI + démon sidecar SEA embarqués.
- Build local Linux également vérifié : `KoaTeam_0.1.0_amd64.deb` (46 Mo).
- Non couvert par M0 (assumé) : signature/notarization macOS, signature Windows,
  auto-update — prévus M5 (nécessitent certificats et secrets de release).

## Enseignements / décisions pour M1

1. **Un seul binaire démon+worker** (`--worker`) : confirmé comme LA bonne approche
   sidecar — un seul `externalBin` à déclarer, spawn via `process.execPath`.
2. **Node SEA plutôt que pkg** pour l'empaquetage : natif, hors-ligne, 3 OS.
   Coût : ~120 Mo par plateforme (runtime Node embarqué). Optimisation possible
   plus tard (bun compile ~60 Mo, ou node élagué) — non bloquant.
3. **Le proxy comptable tient ses promesses** : budget vérifié avant chaque appel,
   écriture après, clés API jamais dans le worker. À conserver tel quel en M1.
4. La **ronde technique** (timer 1 s, RSS, coût zéro) valide le pattern deux étages
   de SPEC-V1 §3.7.
5. En M1 : remplacer la persistance JSON par SQLite, brancher l'UI sur le démon
   (WebSocket), vraie gestion des employés/tâches, endurance 48 h en CI nightly.

## Reproduire

```bash
cd daemon && npm install && npm run build
node scripts/endurance.mjs 12          # test mémoire + budget
npm run bundle && node scripts/make-sea.mjs /tmp/daemon-bin   # binaire unique
cd ../desktop && npm install && npx tauri build --bundles deb # app complète
```
