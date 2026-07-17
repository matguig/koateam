# KoaTeam — Brainstorming

> Document de travail — démarré le 17 juillet 2026, mis à jour au fil des sessions.
> Objectif : converger vers une vision claire du produit avant d'écrire la moindre ligne de code.

---

## 1. Le pitch

**KoaTeam est une application desktop qui vous donne une entreprise virtuelle complète — des départements, une hiérarchie, des employés agentiques spécialisés — travaillant directement sur votre machine, 24h/24.**

Vous êtes le propriétaire. Votre CEO virtuel vous rapporte ; sous lui, des départements (Marketing, Juridique, Comptabilité, Dev…) dirigés par des HEADs, qui encadrent des spécialistes au périmètre volontairement très étroit. Chaque employé a un prénom, un titre, un avatar, une personnalité — et travaille avec les vrais outils de votre ordinateur.

### Pourquoi desktop et pas web ?

C'est **le** différenciateur fondamental du projet :

- **Accès aux outils de l'hôte** : système de fichiers, shell, applications installées, navigateur pilotable, presse-papiers, notifications natives.
- **Confidentialité** : les données ne quittent pas la machine (hors appels LLM).
- **Coût** : pas d'infra serveur ; l'utilisateur apporte sa machine et ses clés API.
- **Présence** : une app qui vit dans la barre de menu, en permanence — l'entreprise est "là".

### Usage visé

Outil **personnel** d'abord (l'app qui simplifie la vie de son créateur). Si un intérêt émerge, la cible naturelle sera les **travailleurs indépendants**, techniques ou non. Modèle économique : sans objet pour le moment. Code **propriétaire** ; ouverture éventuelle plus tard si le projet devient quelque chose.

---

## 2. Ce qu'on apprend des références

### [Paperclip](https://paperclip.ing/) ([GitHub](https://github.com/paperclipai/paperclip))
- Open source, self-hosted, ~30k stars en 3 semaines : l'appétit du marché est énorme.
- Sa thèse : les systèmes multi-agents manquent d'une **couche d'organisation** — organigramme, budgets, tickets, approbations humaines.
- "Bring your own agents" : Paperclip orchestre, il n'exécute pas.
- Faiblesse exploitable : pas d'app desktop officielle ; les agents ne profitent pas de la machine de l'utilisateur.

### [Bloome](https://bloome.im/) ([features](https://bloome.im/features))
- Sa thèse : **le chat comme interface universelle** — humains et agents dans les mêmes conversations, agents qui se challengent entre eux.
- Multi-plateforme natif sur backend partagé ; intègre les agents CLI existants (Claude Code, Codex…).
- Faiblesse exploitable : cloud-centré — les agents ne vivent pas *sur* votre machine.

### Le créneau de KoaTeam

**Paperclip organise des agents, Bloome discute avec des agents, KoaTeam fait travailler une entreprise d'agents sur votre ordinateur.**

Là où Paperclip dit "Hire a virtual agent", KoaTeam dit : **"Créez le département Marketing"** — et à l'intérieur, on embauche.

---

## 3. Le modèle d'organisation (cœur du concept)

### 3.1 Départements et hiérarchie

L'entreprise est structurée en **départements** (Marketing, Comptabilité, Juridique, Technique, Client Success…). La hiérarchie est réelle et fonctionnelle :

```
Vous (propriétaire)
└── CEO
    ├── HEAD of Marketing
    │   └── Spécialiste — Campagne XYZ
    │       └── Spécialiste — Volet Google Ads de la campagne XYZ
    ├── HEAD of Comptabilité
    ├── HEAD of Juridique
    ├── HEAD of Client Success
    └── HEAD of Dev
```

Principes :
- **Chaque agent rapporte à son supérieur direct** (le spécialiste Google Ads rapporte au spécialiste de la campagne, qui rapporte au HEAD of Marketing, qui rapporte au CEO).
- **Scope volontairement très limité** : un agent = une mission étroite qu'il maîtrise à fond. La profondeur de la hiérarchie remplace la polyvalence d'un agent unique. C'est aussi une bonne pratique LLM : contexte court, prompt focalisé, meilleurs résultats.
- **Ils peuvent tous discuter entre eux** (communication transverse autorisée), mais la responsabilité et le reporting suivent la ligne hiérarchique.
- Les échelons intermédiaires (HEADs, chefs de campagne) sont des **managers** : ils décomposent, délèguent, agrègent, contrôlent la qualité avant de faire remonter.

### 3.2 Départements fondateurs (V1)

1. **CEO** (direction générale — l'interlocuteur de synthèse)
2. **Marketing**
3. **Client Success**
4. **Comptabilité**
5. **Juridique**
6. **Dev**

### 3.3 L'Employé

- **Identité** : prénom, titre, avatar, **personnalité** — décision actée : le roleplay aide à l'efficacité (incarnation du rôle) et à l'attachement.
- **Fiche de poste** : prompt système + scope étroit + outils autorisés + garde-fous.
- **Outils** : permissions par employé (dossiers, shell, navigateur, MCP…), visibles et révocables.
- **Mémoire** : persistante entre les sessions (ce qu'il sait de vous, de ses dossiers en cours).
- **Autonomie** : **paramétrable par agent** — du "demande avant chaque action" au "agis, je lirai le journal". Décision actée.
- **Coût** : budget API par employé, visible et plafonnable.

### 3.4 Le travail

- **Missions** ponctuelles ou récurrentes (scheduler).
- **Cascade de délégation** : une demande floue adressée au CEO descend la hiérarchie (CEO → HEAD → spécialiste), les livrables remontent avec contrôle qualité à chaque échelon.
- **Inbox du propriétaire** : approbations, questions, livrables — les agents viennent à vous.
- **Journal d'activité** : timeline transparente par employé (fichiers touchés, commandes, coûts).

### 3.5 Questions ouvertes sur l'organisation (à trancher)

- **Qui embauche ?** L'utilisateur uniquement, ou un HEAD peut-il recruter lui-même un spécialiste pour une campagne (dans un budget alloué) ? La seconde option est magique mais demande des garde-fous.
- **À qui parle-t-on ?** Uniquement au CEO (réaliste mais frustrant), ou directement à n'importe quel agent (pratique, casse un peu le roleplay) ? Piste : les deux, comme un vrai patron qui court-circuite parfois.
- **Vie/mort des postes** : un spécialiste de campagne disparaît-il quand la campagne se termine (poste "CDD"), avec archivage de sa mémoire ?
- **Rituels** : stand-up matinal du CEO ? Rapport hebdo par département ?

---

## 4. L'avantage "outils de l'hôte"

1. **Fichiers** : lire/écrire dans des dossiers autorisés.
2. **Terminal** : builds, scripts, git, tout CLI installé.
3. **Navigateur piloté** : recherche, formulaires, vérification visuelle (Playwright).
4. **Apps natives** : macOS via AppleScript/JXA et Shortcuts ; équivalents Windows/Linux plus tard.
5. **Capture d'écran / vision**.
6. **Présence système** : barre de menu, notifications, raccourci global, démarrage au login.
7. **MCP** : tout serveur MCP branchable comme outil métier d'un employé.

---

## 5. Architecture

### 5.1 Décision : Tauri v2 + démon Node + workers éphémères

Choix acté : **Tauri v2** pour la coquille UI (contrainte forte : l'app tourne 24/7, l'empreinte mémoire au repos doit rester minimale). Le cœur agentique reste en **Node/TypeScript** (sidecar), car tout l'écosystème (Agent SDK, MCP, Playwright) y vit.

### 5.2 La stratégie mémoire (contrainte n°1 : tourner 24/7 sans dériver)

Le risque "30 Go après 20 h" est une fuite de processus longue durée. Parade architecturale, pas cosmétique :

1. **Employés éphémères** : un agent ne tourne PAS en permanence. Au repos il "dort" : son état (fiche, mémoire, missions) vit dans SQLite, RAM ≈ 0. Une mission = un **processus worker dédié, tué à la fin**. La RAM est rendue à l'OS à chaque mission ; une fuite ne peut pas s'accumuler.
2. **Démon minimal toujours actif** : seul un petit cœur Node (scheduler, inbox, file de missions, watchdog) tourne 24/7. **Watchdog mémoire** : si le démon dépasse un seuil (ex. 300 Mo), redémarrage propre et automatique — invisible, l'état étant sur disque.
3. **UI jetable** : fenêtre fermée = webview entièrement déchargée. Ne restent que l'icône de barre de menu et le démon.
4. **Playwright à la demande** : navigateur lancé par le worker qui en a besoin, fermé avec lui. Jamais d'instance persistante.

**Objectif chiffré : < 200 Mo au repos, retour systématique au niveau de repos après chaque mission.** Un test d'endurance (48 h de missions en boucle, RSS surveillé) fera partie de la CI dès que le cœur existera.

### 5.3 Découpage

```
┌───────────────────────────────────────────────┐
│ UI — Tauri v2 (webview système) + React/TS    │
│ organigramme, inbox, chat, timeline, réglages │
│ → déchargée quand la fenêtre est fermée       │
├───────────────────────────────────────────────┤
│ Démon Node (sidecar, 24/7, minimal)           │
│ scheduler · inbox · file de missions ·        │
│ permissions/approbations · watchdog mémoire   │
├───────────────────────────────────────────────┤
│ Workers éphémères (1 processus / mission)     │
│ boucle agentique (Agent SDK) · outils hôte ·  │
│ MCP · Playwright — tués en fin de mission     │
├───────────────────────────────────────────────┤
│ Disque : SQLite (état, mémoires, journal)     │
│ + dossiers de travail par employé/projet      │
└───────────────────────────────────────────────┘
```

Le démon ne dépend pas de l'UI → ouvre plus tard : compagnon mobile, contrôle à distance, mode headless.

### 5.4 Données
- **Local-first** : SQLite + dossiers de travail. Aucune donnée sur des serveurs tiers (hors appels LLM).
- Clés API dans le trousseau système (Keychain / Credential Manager / libsecret).

---

## 6. Multi-build & distribution

- **CI GitHub Actions, matrice 3 OS** (macos/windows/ubuntu) dès le premier commit de code — même si seul macOS est distribué au début.
- **Bundler Tauri** : DMG + notarization (macOS), NSIS/MSI (Windows), AppImage/deb (Linux).
- **Auto-update** (updater Tauri) dès la V1.
- **Couche d'abstraction OS** pour tout ce qui touche l'hôte (automatisation, notifications, autostart) : interface commune, implémentations par plateforme.
- Sidecar Node : binaire empaqueté par plateforme (pkg/bun build ou Node embarqué) — point de vigilance principal du combo Tauri+Node, à prototyper tôt.

---

## 7. Sécurité & confiance

- **Permissions par employé, à la iOS** : accès dossier/shell/navigateur accordés individuellement, visibles et révocables sur la fiche employé.
- **Zones de travail** : par défaut un employé n'écrit que dans son dossier ; sortir = approbation.
- **Actions irréversibles** (suppression, envoi externe, dépense) : porte d'approbation non désactivable en V1.
- **Journal d'audit** complet et lisible.
- **Budgets** : plafond API par employé et global, alertes.
- Agents lisant du contenu externe (web, mails) : droits d'action réduits par défaut (anti prompt-injection).

---

## 8. MVP (V1) — macOS d'abord

**But : la boucle magique complète avec une mini-hiérarchie réelle.**

Inclus :
1. Onboarding : clé API Anthropic + création de l'entreprise (nom, CEO généré avec prénom/avatar/personnalité).
2. **CEO + 2 départements** (proposition : Dev et Marketing) avec un HEAD chacun — assez pour éprouver la délégation en cascade sur 2 niveaux.
3. Chat avec n'importe quel employé + missions asynchrones ; délégation CEO → HEAD.
4. Outils hôte : fichiers (dossiers autorisés), shell (avec approbation), recherche web.
5. Inbox du propriétaire : approbations + livrables + questions.
6. Journal d'activité + coûts par employé ; autonomie réglable par agent.
7. Missions récurrentes (scheduler du démon).
8. App barre de menu + notifications, auto-update, build signé/notarizé macOS ; CI 3 OS qui compile ; test d'endurance mémoire 48 h.

Exclus de la V1 : les 6 départements complets, recrutement par les HEADs eux-mêmes, marketplace, multi-provider, mobile, automatisation AppleScript poussée, distribution Windows/Linux.

**Test de réussite** : donner au CEO une demande floue ("prépare le lancement de X") et voir la hiérarchie la décomposer, travailler avec les outils de la machine, et faire remonter un livrable consolidé dans l'inbox — pendant que la RAM au repos reste sous 200 Mo.

---

## 9. Décisions actées

| # | Sujet | Décision |
|---|---|---|
| 1 | Cible | Usage personnel d'abord ; si ouverture, travailleurs indépendants (tech ou non) |
| 2 | Concept central | **Départements** + hiérarchie profonde d'agents à scope très étroit |
| 3 | Modèle éco | Sans objet pour l'instant |
| 4 | Personnalité | Oui : prénom, titre, avatar, personnalité par agent (roleplay = efficacité) |
| 5 | Autonomie | Paramétrable par agent |
| 6 | Départements V1 | CEO, Marketing, Client Success, Comptabilité, Juridique, Dev |
| 7 | Licence | Propriétaire ; ouverture éventuelle plus tard |
| 8 | Stack desktop | Tauri v2 + démon Node sidecar + workers éphémères (contrainte mémoire 24/7) |

## 10. Prochaines questions à trancher

1. **Qui embauche ?** Utilisateur seul, ou HEADs autorisés à recruter des spécialistes dans un budget ?
2. **Interlocuteur principal** : tout passe par le CEO, accès direct à chacun, ou les deux ?
3. **Postes "CDD"** : les spécialistes de campagne disparaissent-ils en fin de mission (avec mémoire archivée) ?
4. **Rituels** : stand-up matinal, rapport hebdo par département — lesquels pour la V1 ?
5. **Les 2 départements du MVP** : Dev + Marketing, ou un autre duo plus utile à votre quotidien ?
6. **Communication inter-agents** : format (canaux type Slack interne visibles par vous ? simple log ?) — qu'avez-vous envie de *voir* de leurs échanges ?
