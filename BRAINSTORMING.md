# KoaTeam — Brainstorming initial

> Document de travail — session du 17 juillet 2026.
> Objectif : converger vers une vision claire du produit avant d'écrire la moindre ligne de code.

---

## 1. Le pitch (version zéro)

**KoaTeam est une application desktop qui vous donne une équipe d'employés agentiques spécialisés, travaillant directement sur votre machine.**

Vous êtes le patron. Vous recrutez des employés IA (un développeur, un rédacteur, un analyste, un assistant admin…), vous leur confiez des missions, ils travaillent — en utilisant les vrais outils de votre ordinateur : fichiers, terminal, navigateur, applications installées. Vous suivez leur travail, validez les points sensibles, et récupérez les livrables.

### Pourquoi desktop et pas web ?

C'est **le** différenciateur fondamental du projet :

- **Accès aux outils de l'hôte** : système de fichiers, shell, applications installées (Excel, Xcode, Photoshop…), navigateur pilotable, presse-papiers, notifications natives, calendrier/mail locaux.
- **Confidentialité** : les données ne quittent pas la machine (hors appels LLM) ; pas de sandbox cloud qui limite ce que les agents peuvent toucher.
- **Coût** : pas d'infra serveur à opérer par utilisateur ; l'utilisateur apporte sa machine et ses clés API.
- **Présence** : une app qui vit dans la barre de menu / le dock, des notifications quand un employé a fini ou a besoin de vous — l'équipe est "là", en permanence.

---

## 2. Ce qu'on apprend des références

### [Paperclip](https://paperclip.ing/) ([GitHub](https://github.com/paperclipai/paperclip))
- Open source, self-hosted (serveur Node + UI React), ~30k stars en 3 semaines : **l'appétit du marché est énorme**.
- Sa thèse : les systèmes multi-agents manquent d'une **couche d'organisation** — organigramme, objectifs, budgets, tickets, lignes hiérarchiques, portes d'approbation humaine.
- "Bring your own agents" : Paperclip n'exécute pas les agents, il les orchestre.
- Faiblesse exploitable : pas d'app desktop officielle (seulement un [wrapper Electron non officiel](https://github.com/aronprins/paperclip-desktop), macOS uniquement) ; les agents ne profitent pas nativement de la machine de l'utilisateur.

### [Bloome](https://bloome.im/) ([features](https://bloome.im/features))
- Sa thèse : **le chat comme interface universelle** — humains et agents dans les mêmes conversations, agents qui se challengent entre eux, agent personnel créé à l'inscription.
- Multi-plateforme natif (iOS, Android, macOS, Windows, web) sur un backend partagé.
- Intègre des agents CLI existants (Claude Code, Codex, Gemini CLI, OpenCode) dans les conversations.
- Faiblesse exploitable : centré messagerie/cloud — les agents ne vivent pas *sur* votre machine et n'exploitent pas ses outils.

### Le créneau de KoaTeam

| | Paperclip | Bloome | **KoaTeam** |
|---|---|---|---|
| Métaphore | Entreprise (org chart, tickets) | Messagerie (chat) | **Équipe locale (bureau virtuel)** |
| Où tournent les agents | À vous de fournir | Cloud | **Sur votre machine** |
| Accès aux outils de l'hôte | Non | Non | **Oui, c'est le cœur** |
| Cible | Orgs multi-agents | Équipes / grand public | Indépendants, TPE, power users |

Positionnement en une phrase : **Paperclip organise des agents, Bloome discute avec des agents, KoaTeam fait travailler des agents sur votre ordinateur.**

---

## 3. Les concepts clés du produit

### 3.1 L'Employé
L'unité de base. Un employé =
- **Identité** : nom, avatar, personnalité (ton, style de travail).
- **Rôle / spécialité** : fiche de poste = prompt système + outils autorisés + compétences (skills).
- **Outils** : ce qu'il a le droit de toucher sur la machine (dossiers, shell, navigateur, apps, MCP servers). Permissions par employé, pas globales.
- **Mémoire** : ce qu'il apprend sur vous, vos projets, vos préférences — persistante entre les sessions.
- **Coût** : chaque employé a un "salaire" (budget tokens/API) visible et plafonnable.

### 3.2 Le recrutement
- **Catalogue de rôles prêts à l'emploi** ("hire from template") : Développeur, Rédacteur, Veilleur/Chercheur, Comptable-assistant, Community manager, Data analyst, Testeur QA, Assistant perso…
- **Création sur mesure** : un entretien d'embauche conversationnel où l'utilisateur décrit le poste et KoaTeam génère la fiche (prompt, outils, garde-fous).
- Plus tard : un **marketplace communautaire** de fiches de poste / skills.

### 3.3 Le travail
- **Missions** : tâches ponctuelles ("prépare-moi un comparatif de ces 3 outils") ou récurrentes ("chaque matin à 8h, résume ma veille").
- **Boîte de réception du patron** : le point central de l'UX. Ce qui attend votre décision (approbations, questions des employés, livrables à relire) arrive là. Vous ne surveillez pas les agents ; ils viennent à vous.
- **Approbations** : toute action sensible (envoi externe, suppression, dépense, écriture hors zone autorisée) passe par une porte d'approbation humaine. Réglable par employé et par type d'action.
- **Journal d'activité** : timeline transparente de tout ce que chaque employé a fait (fichiers touchés, commandes lancées, coûts).

### 3.4 La collaboration (V2+)
- Un employé peut **déléguer** à un autre (le dev demande au testeur de vérifier).
- Un rôle de **chef d'équipe / dispatcher** qui reçoit les demandes floues et les route vers le bon spécialiste.
- Revue croisée : un employé challenge le livrable d'un autre avant de vous le montrer (idée validée par Bloome).

---

## 4. L'avantage "outils de l'hôte" — concrètement

Ce que les employés KoaTeam peuvent faire et qu'aucune app web ne peut offrir :

1. **Fichiers** : lire/écrire dans des dossiers autorisés (Documents/Clients, un repo git…), organiser, renommer, archiver.
2. **Terminal** : lancer des builds, des scripts, git, ffmpeg, n'importe quel CLI installé.
3. **Navigateur piloté** : recherche, remplissage de formulaires, scraping léger, vérification visuelle (Chromium/Playwright embarqué).
4. **Applications natives** : sur macOS via AppleScript/JXA et Shortcuts (Mail, Calendar, Numbers, Finder…) ; équivalents Windows (PowerShell, COM) et Linux (D-Bus) plus tard.
5. **Capture d'écran / vision** : "regarde mon écran et dis-moi pourquoi ce design cloche".
6. **Présence système** : icône barre de menu, notifications natives, raccourci global pour interpeller un employé, démarrage au login.
7. **MCP** : brancher n'importe quel serveur MCP (local ou distant) comme "outil métier" d'un employé — c'est le standard qui nous évite de réécrire chaque intégration.

⚠️ Contrepartie : la **sécurité** devient un sujet produit de premier plan (voir §7).

---

## 5. Architecture pressentie (à valider, pas figée)

### 5.1 Framework desktop : Electron vs Tauri

| Critère | Electron | Tauri v2 |
|---|---|---|
| Langage | 100 % TypeScript | Rust (core) + TS (UI) |
| Poids / RAM | Lourd (~150 Mo+) | Léger (~10 Mo) |
| Écosystème agents (SDK Claude, MCP, Playwright — tous Node) | **In-process, natif** | Via sidecar Node à embarquer |
| Multi-plateforme Mac/Win/Linux | Mature (electron-builder) | Mature (bundler intégré) |
| Auto-update, signature, notarization | Très rodé | Rodé |

**Recommandation actuelle : Electron.** Le cœur de KoaTeam est un runtime d'agents, et tout l'écosystème agentique (Claude Agent SDK, serveurs MCP, Playwright, wrappers CLI) est en Node/TypeScript. Avec Tauri, il faudrait quand même embarquer un sidecar Node — autant assumer Electron et avoir un seul langage, un seul process model, et l'outillage de distribution le plus éprouvé. On garde Tauri en option si le poids devient un vrai grief utilisateur.

### 5.2 Runtime des agents

Trois approches possibles, cumulables :

1. **Claude Agent SDK (TypeScript) embarqué** — recommandé pour le cœur : boucle agentique, outils, sous-agents, MCP, gestion du contexte. C'est la voie la plus directe pour des employés "maison" de qualité.
2. **Bring-your-own-CLI** : détecter/piloter les agents CLI installés (Claude Code, Codex, Gemini CLI…) comme employés spécialisés — idéalement via un protocole type ACP. Bon levier d'adoption chez les devs, mais V2.
3. **Multi-provider** (OpenAI, modèles locaux via Ollama…) : à prévoir dans l'abstraction dès le départ ("un employé = un modèle configurable"), à implémenter plus tard.

### 5.3 Découpage interne

```
┌─────────────────────────────────────────────┐
│  UI (renderer) — React + TypeScript          │
│  bureau, inbox, chat, timeline, réglages     │
├─────────────────────────────────────────────┤
│  Cœur (main process / service local)         │
│  • Orchestrateur : cycle de vie des employés │
│  • Scheduler : missions récurrentes          │
│  • Permissions & approbations (policy layer) │
│  • Mémoire (SQLite local) + fichiers projet  │
│  • Passerelle outils : fs, shell, browser,   │
│    OS-automation, MCP client                 │
├─────────────────────────────────────────────┤
│  Machine hôte (fichiers, apps, CLIs, MCP)    │
└─────────────────────────────────────────────┘
```

Principe important : **le cœur ne dépend pas de l'UI** (un service local avec l'UI par-dessus). Ça ouvre plus tard : app mobile compagnon, contrôle à distance, mode headless.

### 5.4 Données
- **Local-first** : SQLite (état, mémoire, journal) + dossiers de travail par employé/projet. Aucune donnée utilisateur sur nos serveurs en V1.
- Clés API stockées dans le trousseau système (Keychain / Credential Manager / libsecret).
- Sync/backup cloud : optionnel, plus tard.

---

## 6. Multi-build & distribution (exigence posée dès le départ)

- **CI GitHub Actions avec matrice d'OS** (macos / windows / ubuntu) dès le premier commit "code" — même si seul le build macOS est distribué au début, on ne laisse jamais les autres OS casser silencieusement.
- **electron-builder** (ou Forge) : DMG + notarization Apple (macOS), NSIS + signature (Windows), AppImage/deb (Linux).
- **Auto-update** intégré dès la V1 (releases GitHub comme canal au début).
- **Couche d'abstraction OS** dans le code pour tout ce qui touche l'hôte (automatisation d'apps, notifications, autostart) : interface commune, implémentations par plateforme — c'est là que se joue la vraie portabilité, pas dans le framework UI.
- Canaux : `stable` + `beta` dès que possible.

---

## 7. Sécurité & confiance (sujet produit, pas détail technique)

Donner le shell et les fichiers à des agents = le principal risque **et** la principale valeur. Pistes :

- **Permissions par employé, à la iOS** : chaque employé demande l'accès à un dossier, au shell, au navigateur… et l'utilisateur accorde/refuse. Visible et révocable dans sa "fiche employé".
- **Zones de travail** : par défaut, un employé n'écrit que dans son dossier de travail ; sortir de la zone = approbation.
- **Actions irréversibles** (suppression, envoi d'email, achat) : toujours une porte d'approbation, non désactivable en V1.
- **Journal d'audit** complet et lisible (rejouable : "montre-moi tout ce que Léo a fait hier").
- **Budgets** : plafond de dépense API par employé et global, avec alertes.
- Injection de prompt via contenu web/fichiers : les employés qui lisent l'extérieur ont des droits d'action réduits par défaut.

---

## 8. Proposition de MVP (V1)

**But : la boucle magique complète, avec 1 à 3 employés, sur macOS.**

Inclus :
1. Onboarding : clé API (Anthropic d'abord) + recrutement du premier employé depuis 3–4 templates.
2. Chat avec un employé + missions asynchrones ("fais ça et préviens-moi").
3. Outils hôte : fichiers (dossiers autorisés), shell (avec approbation), recherche web.
4. Inbox du patron : approbations + livrables + questions.
5. Journal d'activité + coûts par employé.
6. Missions récurrentes simples (scheduler).
7. App menu-bar + notifications natives, auto-update, build signé/notarizé macOS ; CI 3 OS qui compile.

Explicitement exclus de la V1 : collaboration inter-employés, marketplace, multi-provider, mobile, automatisation d'apps natives poussée (AppleScript…), builds Windows/Linux distribués.

**Test de réussite du MVP** : un utilisateur non-dev recrute un "Veilleur", lui demande une veille quotidienne sur son secteur, et reçoit chaque matin une note dans son inbox — sans avoir jamais vu un terminal.

---

## 9. Questions ouvertes pour converger

1. **Cible V1** : indépendants/TPE non techniques, ou power users/devs (plus faciles à atteindre, plus tolérants) ? → détermine le ton, l'onboarding, les templates d'employés.
2. **Métaphore UX dominante** : bureau virtuel avec avatars (fort attachement, plus de travail design) vs interface sobre type "inbox + chat" (plus vite livrée) ?
3. **Modèle économique** : app payante one-shot, abonnement (avec quels services cloud pour le justifier ?), open-core à la Paperclip ? Bring-your-own-key en V1 dans tous les cas ?
4. **Nom & personnalité** : les employés ont-ils une vraie personnalité (prénoms, avatars, small talk) ou reste-t-on outil pro sobre ?
5. **Degré d'autonomie par défaut** : plutôt "demande avant tout" (confiance lente) ou "agis, je regarde le journal" (wow effect, plus risqué) ?
6. **Rôles des 3–4 premiers templates** : lesquels ? (proposition : Veilleur/Chercheur, Rédacteur, Assistant fichiers/admin, Développeur ?)
7. **Open source ou pas** : Paperclip montre la traction énorme de l'open source sur ce créneau — on suit, ou on protège ?
