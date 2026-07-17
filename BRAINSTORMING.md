# KoaTeam — Brainstorming

> Document de travail — démarré le 17 juillet 2026, mis à jour au fil des sessions.
> Objectif : converger vers une vision claire du produit avant d'écrire la moindre ligne de code.

---

## 1. Le pitch

**KoaTeam est une application desktop qui transforme chacun de vos projets en une entreprise virtuelle autonome, travaillant directement sur votre machine, 24h/24.**

Pour chaque projet, vous créez un **workspace** et vous embauchez un **CEO** : vous lui donnez une mission, un budget mensuel et la liste des providers IA qu'il a le droit d'utiliser. Ensuite, vous ne managez plus des agents — vous remplissez une **todo-list**. Le CEO prend les tâches, les décompose, crée les départements nécessaires, embauche des spécialistes en arbitrant coût vs budget, et l'entreprise avance. Vous suivez l'avancement, répondez aux questions, validez ce qui doit l'être — et tout, absolument tout, est auditable.

### Pourquoi desktop et pas web ?

- **Accès aux outils de l'hôte** : fichiers, shell, applications installées, navigateur pilotable, notifications natives.
- **Confidentialité** : les données ne quittent pas la machine (hors appels LLM).
- **Coût** : pas d'infra serveur ; l'utilisateur apporte sa machine et ses clés API.
- **Présence** : l'entreprise vit dans la barre de menu, en permanence.

### Usage visé

Outil **personnel** d'abord ; si un intérêt émerge, cible naturelle = **travailleurs indépendants**, techniques ou non. Modèle éco : sans objet pour l'instant. Code **propriétaire** ; ouverture éventuelle plus tard.

---

## 2. Ce qu'on apprend des références

### [Paperclip](https://paperclip.ing/) ([GitHub](https://github.com/paperclipai/paperclip))
- Open source, ~30k stars en 3 semaines : l'appétit du marché est énorme.
- Sa thèse : les multi-agents manquent d'une **couche d'organisation** (organigramme, budgets, tickets, approbations).
- Faiblesse exploitable : pas d'app desktop officielle ; les agents ne profitent pas de la machine de l'utilisateur.

### [Bloome](https://bloome.im/) ([features](https://bloome.im/features))
- Sa thèse : **le chat comme interface universelle** entre humains et agents.
- Faiblesse exploitable : cloud-centré — les agents ne vivent pas *sur* votre machine.

### Le créneau de KoaTeam

**Paperclip organise des agents, Bloome discute avec des agents, KoaTeam fait tourner des entreprises d'agents sur votre ordinateur.**

Différences assumées avec Paperclip : chez eux on "hire a virtual agent" et on discute ; chez nous on **fonde une entreprise par projet**, c'est le CEO qui embauche, et l'interface principale est une **todo-list**, pas un chat.

---

## 3. Le modèle : une entreprise par projet

### 3.1 Le Workspace

Un projet = un workspace = une entreprise. À la création :

1. Vous **embauchez un CEO** en définissant :
   - sa **mission** (l'objectif global du projet) ;
   - son **budget mensuel** ;
   - la **liste des providers IA autorisés** (Anthropic, OpenAI, modèles locaux…) — chaque provider/modèle a un coût connu du CEO.
2. Une **discussion de fondation** avec le nouveau CEO fixe les départements à créer (paramétrable par workspace — un projet dev solo n'a pas besoin d'un département Juridique).

L'app peut héberger plusieurs workspaces, chacun avec son entreprise, son budget et sa comptabilité propres.

### 3.2 Le CEO embauche (l'économie interne)

Décision structurante : **c'est le CEO qui recrute, pas l'utilisateur.**

- Le CEO connaît le tarif de chaque provider/modèle autorisé et gère **coût vs budget** : il embauche un spécialiste sur un petit modèle économique pour une tâche mécanique, réserve les gros modèles aux postes à forte responsabilité (lui-même, les HEADs, les tâches complexes).
- Créer un département, embaucher un HEAD, recruter un spécialiste pour une campagne : ce sont **ses** décisions de gestion, dans l'enveloppe budgétaire.
- L'utilisateur garde les leviers macro : mission, budget, providers autorisés, permissions sensibles.
- Conséquence technique : l'abstraction **multi-provider** n'est plus une option lointaine — c'est un pilier du concept (chaque employé = un modèle, choisi à l'embauche selon le rapport compétence/coût).

### 3.3 Départements et hiérarchie

```
Vous (propriétaire) ── todo-list + inbox
└── CEO (mission, budget, providers)
    ├── HEAD of Marketing
    │   └── Spécialiste — Campagne XYZ          (CDD)
    │       └── Spécialiste — Google Ads XYZ    (CDD)
    ├── HEAD of Dev
    └── … départements créés selon les besoins du projet
```

- **Chaque agent rapporte à son supérieur direct** ; communication transverse autorisée, mais responsabilité et reporting suivent la ligne hiérarchique.
- **Scope volontairement très étroit** par agent : la profondeur de la hiérarchie remplace la polyvalence. C'est aussi une bonne pratique LLM (prompt focalisé, contexte court, meilleurs résultats).
- Les managers (CEO, HEADs, chefs de campagne) **décomposent, délèguent, agrègent et contrôlent la qualité** avant de faire remonter.
- Départements types : Marketing, Client Success, Comptabilité, Juridique, Dev… — choisis à la fondation, extensibles par le CEO ensuite.

### 3.4 L'Employé

- **Identité** : prénom, titre, avatar, **personnalité** (le roleplay aide à l'incarnation du rôle, donc à l'efficacité).
- **Contrat** : les spécialistes sont des **CDD / freelances de mission**. Quand la hiérarchie décide que la mission est terminée : **rapport de mission**, puis **archivage** — réveillable au besoin, avec sa mémoire intacte.
- **Fiche de poste** : prompt système + scope étroit + outils autorisés + garde-fous + **modèle IA attribué** (choisi par le recruteur selon coût/compétence).
- **Mémoire** : persistante ; archivée avec l'employé en fin de mission.
- **Autonomie** : paramétrable par agent.
- **Coût** : chaque appel est comptabilisé ; salaire = consommation API, imputée au budget du workspace.

### 3.5 Le flux de travail : la todo-list

**L'interface principale n'est pas un chat, c'est une todo-list.**

1. Vous créez une **tâche** : titre, description, objectifs (critères de réussite), éventuellement échéance et priorité.
2. Le **CEO prend la tâche** : il la découpe en sous-tâches, les assigne aux bons départements, **crée un département ou embauche si besoin**.
3. Vous voyez la tâche principale avancer à travers **l'arbre de ses sous-tâches** et leur statut (à faire / en cours / bloquée / en revue / terminée).
4. Les agents peuvent **poser des questions sur la tâche** — elles remontent dans votre inbox, vous répondez, le travail reprend.
5. Le chat existe mais n'est **pas la voie privilégiée** :
   - avec le **CEO** : mettre à jour mission, objectifs, budget ; répondre à ses demandes (action, permission) ;
   - avec un **agent ou un département** en direct : possible (le patron qui court-circuite), mais jamais automatique.

La tâche est donc l'objet central du système : elle porte la décomposition, l'assignation, l'avancement, les questions/réponses, les livrables et les coûts imputés.

### 3.6 Les rituels (le battement de cœur de l'entreprise)

- **Toutes les heures** (paramétrable) : le CEO **réveille chaque HEAD** pour monitorer l'avancement ; chaque HEAD **interroge ses équipes** pour un reporting réel — pas deviné — et le consolide pour le CEO.
- **Chaque matin** (paramétrable) : le CEO **vient au rapport** auprès de l'utilisateur — synthèse de l'avancement, décisions prises, dépenses, points de blocage.
- **À la demande** : dès que quelque chose requiert l'utilisateur (question, permission, budget, validation), ça part dans l'inbox sans attendre le rituel.

Ces rituels s'emboîtent parfaitement avec l'architecture "employés dormants" : le scheduler du démon réveille le CEO, qui réveille les HEADs, qui réveillent leurs équipes — puis tout le monde se rendort.

### 3.7 Auditabilité totale

**Tout est ouvert** : chaque conversation inter-agents est consultable, et le **raisonnement interne de chaque agent** (sa chaîne de réflexion, ses décisions d'outils) est enregistré et lisible. L'utilisateur ne surveille pas en continu — mais il peut toujours ouvrir le capot, sur n'importe quel échange, à n'importe quel moment.

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

### 5.1 Stack actée : Tauri v2 + démon Node + workers éphémères

**Tauri v2** pour la coquille UI (contrainte : app 24/7, empreinte mémoire minimale). Cœur agentique en **Node/TypeScript** (sidecar) car l'écosystème (Agent SDK, MCP, Playwright) y vit. **Couche multi-provider dès la V1** (voir §3.2) : interface commune au-dessus d'Anthropic/OpenAI/locaux, avec table de tarifs par modèle.

### 5.2 La stratégie mémoire (contrainte n°1 : tourner 24/7 sans dériver)

1. **Employés éphémères** : au repos un agent "dort" — état (fiche, mémoire, tâches) dans SQLite, RAM ≈ 0. Une intervention = un **processus worker dédié, tué à la fin**. Une fuite ne peut pas s'accumuler.
2. **Démon minimal 24/7** : scheduler (rituels), file de tâches, inbox, budgets, watchdog. **Watchdog mémoire** : au-delà d'un seuil (ex. 300 Mo), redémarrage propre automatique — invisible, l'état étant sur disque.
3. **UI jetable** : fenêtre fermée = webview déchargée ; ne restent que l'icône barre de menu et le démon.
4. **Playwright à la demande** : lancé par le worker, fermé avec lui.

**Objectif : < 200 Mo au repos, retour systématique au niveau de repos après chaque mission.** Test d'endurance 48 h dans la CI dès que le cœur existe.

### 5.3 Découpage

```
┌────────────────────────────────────────────────┐
│ UI — Tauri v2 (webview) + React/TS             │
│ todo-list & arbre de tâches · organigramme ·   │
│ inbox · audit (conversations + raisonnements) ·│
│ budgets · réglages                             │
├────────────────────────────────────────────────┤
│ Démon Node (sidecar, 24/7, minimal)            │
│ scheduler des rituels · file de tâches ·       │
│ inbox · comptabilité/budgets · permissions ·   │
│ watchdog mémoire                               │
├────────────────────────────────────────────────┤
│ Workers éphémères (1 processus / intervention) │
│ boucle agentique (multi-provider) · outils     │
│ hôte · MCP · Playwright — tués à la fin        │
├────────────────────────────────────────────────┤
│ Disque : SQLite par workspace (org, tâches,    │
│ mémoires, journal d'audit, comptabilité)       │
│ + dossiers de travail par employé/projet       │
└────────────────────────────────────────────────┘
```

Objets de première classe en base : **Workspace, Employé (contrat, modèle, permissions, mémoire), Tâche (arbre, statuts, Q/R, livrables, coûts), Conversation, Trace de raisonnement, Écriture comptable.**

### 5.4 Données
- **Local-first** : SQLite + dossiers de travail. Rien sur des serveurs tiers (hors appels LLM).
- Clés API dans le trousseau système (Keychain / Credential Manager / libsecret).

---

## 6. Multi-build & distribution

- **CI GitHub Actions, matrice 3 OS** dès le premier commit de code — même si seul macOS est distribué au début.
- **Bundler Tauri** : DMG + notarization (macOS), NSIS/MSI (Windows), AppImage/deb (Linux).
- **Auto-update** (updater Tauri) dès la V1.
- **Couche d'abstraction OS** pour tout ce qui touche l'hôte.
- Sidecar Node empaqueté par plateforme — point de vigilance principal, à prototyper tôt.

---

## 7. Sécurité, budget & confiance

- **Permissions par employé, à la iOS** : accès dossier/shell/navigateur individuels, visibles, révocables.
- **Zones de travail** : par défaut un employé n'écrit que dans son dossier ; sortir = approbation.
- **Actions irréversibles** : porte d'approbation non désactivable en V1.
- **Budget = garde-fou dur** : la comptabilité du démon impute chaque appel ; le CEO arbitre en dessous du plafond, le démon **coupe** au plafond (et le CEO vient demander une rallonge dans l'inbox).
- **Journal d'audit** complet (actions + conversations + raisonnements).
- Agents lisant du contenu externe : droits d'action réduits par défaut (anti prompt-injection).

---

## 8. MVP (V1) — macOS d'abord

**But : la boucle complète workspace → CEO → todo-list → cascade → rapport, en vrai.**

Inclus :
1. Création d'un workspace : embauche du CEO (mission, budget mensuel, providers autorisés) + discussion de fondation (choix des départements).
2. **CEO + 2 départements** avec HEAD ; le CEO peut embaucher des spécialistes CDD dans son budget (choix du modèle selon coût).
3. **Todo-list** : création de tâches (titre, description, objectifs), décomposition par le CEO, arbre de sous-tâches avec statuts visibles.
4. **Rituels** : monitoring horaire paramétrable (CEO → HEADs → équipes) + rapport matinal du CEO.
5. Outils hôte : fichiers (dossiers autorisés), shell (avec approbation), recherche web.
6. **Inbox** : questions des agents, demandes du CEO (permission, budget), livrables.
7. **Audit** : conversations inter-agents + raisonnements internes consultables ; comptabilité par employé/tâche.
8. Fin de mission : rapport + archivage réveillable des CDD.
9. App barre de menu + notifications, auto-update, build signé/notarizé macOS ; CI 3 OS ; test d'endurance mémoire 48 h.
10. Multi-provider minimal : Anthropic + 1 autre (ou modèle local) pour éprouver l'arbitrage coût/compétence du CEO.

Exclus de la V1 : multi-workspaces simultanés (un seul suffit pour éprouver), marketplace, mobile, automatisation AppleScript poussée, distribution Windows/Linux.

**Test de réussite** : créer un workspace, donner au CEO une mission et un budget, poser une tâche floue dans la todo-list — et voir l'entreprise se structurer toute seule (départements, embauches), produire, faire son rapport le lendemain matin, le tout auditable jusqu'au raisonnement de chaque agent, avec une RAM au repos < 200 Mo.

---

## 9. Décisions actées

| # | Sujet | Décision |
|---|---|---|
| 1 | Cible | Usage personnel d'abord ; ensuite indépendants (tech ou non) |
| 2 | Concept central | Une **entreprise par workspace** ; départements + hiérarchie profonde à scopes étroits |
| 3 | Modèle éco | Sans objet pour l'instant |
| 4 | Personnalité | Prénom, titre, avatar, personnalité par agent |
| 5 | Autonomie | Paramétrable par agent |
| 6 | Départements | Choisis à la fondation du workspace (discussion avec le CEO), extensibles ensuite |
| 7 | Licence | Propriétaire |
| 8 | Stack | Tauri v2 + démon Node sidecar + workers éphémères ; < 200 Mo au repos |
| 9 | Recrutement | **Le CEO embauche**, dans un budget mensuel et une liste de providers fixés par l'utilisateur |
| 10 | Interface principale | **Todo-list** (tâches → décomposition → arbre de sous-tâches) ; chat possible mais non privilégié |
| 11 | Cycle de vie | Spécialistes en CDD : rapport de mission puis archivage réveillable |
| 12 | Rituels | Monitoring horaire en cascade (CEO→HEADs→équipes) + rapport matinal au propriétaire ; fréquences paramétrables |
| 13 | Transparence | Auditabilité totale : conversations inter-agents ET raisonnements internes |
| 14 | Multi-provider | Pilier V1 : chaque employé = un modèle choisi à l'embauche selon coût/compétence |

## 10. Prochaines questions à trancher

1. **Fin de tâche** : qui déclare une tâche principale "terminée" — le CEO seul, ou validation finale par l'utilisateur (revue du livrable dans l'inbox) ?
2. **Budget épuisé en cours de tâche** : le démon coupe et le CEO demande une rallonge — mais que fait-on du travail en cours ? Pause propre et reprise, ou finir la sous-tâche entamée ?
3. **Table des tarifs providers** : maintenue à la main dans l'app, ou récupérée/actualisée automatiquement ? Et le CEO voit-il les prix réels (tokens) ou une abstraction ("junior 1 crédit/h, senior 5") ?
4. **Rituel horaire et coût** : chaque réveil consomme des tokens. Si rien ne tourne, le CEO doit-il quand même faire sa ronde (facturée) ou le démon peut-il répondre "rien à signaler" gratuitement et ne réveiller personne ?
5. **Questions des agents** : un spécialiste qui a une question pour vous — elle passe par sa hiérarchie (le HEAD peut souvent répondre lui-même, ça filtre) ou va directement dans votre inbox (plus rapide) ?
6. **Nom du CEO et onboarding** : le premier contact (l'"entretien d'embauche" du CEO) est LE moment fondateur de l'expérience — qu'a-t-il d'autre à demander que mission/budget/départements ? (ton de l'entreprise, langue de travail, dossiers de la machine accessibles… ?)
