# KoaTeam

**KoaTeam transforme chaque projet en entreprise virtuelle autonome, travaillant directement sur votre machine, 24h/24.**

Un workspace = une entreprise : un CEO recruté via un cabinet virtuel (jauges de caractère), des départements, des employés IA spécialisés à scope étroit, une todo-list comme interface de pilotage, des budgets durs et une auditabilité totale.

## État du projet

Phase de conception terminée, implémentation de l'UI en cours.

| Document | Contenu |
|---|---|
| [`BRAINSTORMING.md`](BRAINSTORMING.md) | Vision produit — 25 décisions actées |
| [`SPEC-V1.md`](SPEC-V1.md) | Spécification de référence : entités, machines à états, flux, écrans, critères d'acceptation |
| [`DESIGN-PROMPT.md`](DESIGN-PROMPT.md) | Prompt utilisé pour générer la maquette design |
| [`design/`](design/) | Maquette Claude Design importée (`KoaTeam.dc.html`) — source de vérité visuelle |
| [`ui/`](ui/) | **Front-end React + TypeScript + Vite** implémentant la maquette (données mock) |

## Lancer l'UI

```bash
cd ui
npm install
npm run dev      # développement
npm run build    # vérification TypeScript + build production
```

7 écrans : Tâches (arbre de sous-tâches, budgets), Organigramme, Inbox, Audit (traces de raisonnement), Comptabilité, Fondation (cabinet de recrutement), Réglages — plus le panneau Fiche employé. Thème sombre/clair.

## Architecture cible (voir SPEC-V1 §5-7)

- **UI** : Tauri v2 (webview) + ce front React — fenêtre jetable, l'app vit dans la barre de menu
- **Démon Node** (24/7, minimal) : scheduler des rituels, file de tâches, comptabilité, permissions, watchdog mémoire
- **Workers éphémères** : un processus par intervention d'agent, tué à la fin (< 200 Mo au repos)
- **Local-first** : SQLite par workspace, clés API dans le trousseau système
