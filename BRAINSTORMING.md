# KoaTeam — Brainstorming

> Document de travail — démarré le 17 juillet 2026, mis à jour au fil des sessions.
> Objectif : converger vers une vision claire du produit avant d'écrire la moindre ligne de code.

---

## 1. Le pitch

**KoaTeam est une application desktop qui transforme chacun de vos projets en une entreprise virtuelle autonome, travaillant directement sur votre machine, 24h/24.**

Pour chaque projet, vous créez un **workspace** : un cabinet de recrutement virtuel vous interroge sur le projet et vous propose des profils de **CEO** — dont vous réglez le caractère à la jauge, comme dans un jeu vidéo. Vous fixez sa mission, son budget mensuel, les providers IA autorisés. Ensuite, vous ne managez plus des agents — vous remplissez une **todo-list**. Le CEO prend les tâches, les décompose, crée les départements nécessaires, embauche des spécialistes en arbitrant coût vs budget, et l'entreprise avance. Vous suivez, répondez aux questions filtrées par la hiérarchie, validez les livrables — et tout, absolument tout, est auditable.

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

Différences assumées : chez eux on "hire a virtual agent" et on discute ; chez nous on **fonde une entreprise par projet**, c'est le CEO qui embauche, et l'interface principale est une **todo-list**, pas un chat.

---

## 3. Le modèle : une entreprise par projet

### 3.1 La fondation d'un workspace : le cabinet de recrutement

Créer un workspace n'est pas un formulaire — c'est un **roleplay avec un cabinet de recrutement** :

1. Le cabinet vous **interroge sur le projet** : nature, objectifs, contraintes, ton souhaité, dossiers de la machine concernés… Cette conversation configure tout le workspace.
2. Il vous **propose plusieurs profils de CEO**, différenciés par leur caractère. Vous affinez avec des **jauges de traits** (façon création de personnage de jeu vidéo) : remise en question de vos demandes ↔ exécution docile · prudence / aversion au risque ↔ audace · rigueur ↔ souplesse · concision ↔ détail dans les rapports · formel ↔ familier · gestion budgétaire serrée ↔ généreuse — liste extensible.
3. Vous fixez le cadre du CEO retenu : **mission, budget et sa période, liste des providers IA autorisés** (chaque provider/modèle a un coût que le CEO connaît).
4. Le CEO prend ses fonctions et met en place ses départements avec vous.

Le cabinet reste disponible **à la demande** après la fondation : si un CEO ne convient plus, on peut le remercier et en recruter un autre (l'entreprise, les mémoires et les tâches survivent au changement de direction).

L'app peut héberger plusieurs workspaces, chacun avec son entreprise, son budget et sa comptabilité propres.

### 3.2 Le CEO embauche (l'économie interne)

Décision structurante : **c'est le CEO qui recrute, pas l'utilisateur.**

- Le CEO voit le **coût réel des tokens** de chaque provider/modèle autorisé, et arbitre coût vs budget : petit modèle économique pour une tâche mécanique, gros modèle pour les postes à forte responsabilité.
- Créer un département, embaucher un HEAD, recruter un spécialiste : ce sont **ses** décisions de gestion, dans l'enveloppe budgétaire.
- Le **système tient la comptabilité** : chaque appel API est déduit en $ et imputé à l'agent et à la tâche concernés.
- L'utilisateur garde les leviers macro : mission, budgets, providers autorisés, permissions sensibles.
- Conséquence technique : l'abstraction **multi-provider** est un pilier du concept (chaque employé = un modèle, choisi à l'embauche selon le rapport compétence/coût).

### 3.3 Départements et hiérarchie

```
Vous (propriétaire) ── todo-list + inbox
└── CEO (mission, budget, providers — caractère réglé aux jauges)
    ├── HEAD of Marketing
    │   └── Spécialiste — Campagne XYZ          (CDD)
    │       └── Spécialiste — Google Ads XYZ    (CDD)
    ├── HEAD of Dev
    └── … départements créés selon les besoins du projet
```

- **Chaque agent rapporte à son supérieur direct** ; communication transverse autorisée, mais responsabilité et reporting suivent la ligne hiérarchique.
- **Scope volontairement très étroit** par agent : la profondeur de la hiérarchie remplace la polyvalence. C'est aussi une bonne pratique LLM (prompt focalisé, contexte court, meilleurs résultats).
- Les managers **décomposent, délèguent, agrègent et contrôlent la qualité** avant de faire remonter.
- **Les HEADs filtrent** : une question d'un spécialiste ne remonte à l'utilisateur que si la hiérarchie ne peut pas y répondre elle-même. L'utilisateur ne doit jamais être spammé.

### 3.4 L'Employé

- **Identité** : prénom, titre, avatar, **personnalité**. Le caractère du CEO est réglé aux jauges à l'embauche ; le CEO définit celui de ses recrues (adapté au poste).
- **Contrat** : les spécialistes sont des **CDD / freelances de mission**. Mission terminée (décision de la hiérarchie) → **rapport de mission**, puis **archivage réveillable**, mémoire intacte.
- **Fiche de poste** : prompt système + scope étroit + outils autorisés + garde-fous + **modèle IA attribué**.
- **Mémoire** : persistante ; archivée avec l'employé.
- **Autonomie** : paramétrable par agent.
- **Coût** : chaque appel comptabilisé en $, imputé à l'agent et à la tâche.

### 3.5 Le flux de travail : la todo-list

**L'interface principale n'est pas un chat, c'est une todo-list.**

1. Vous créez une **tâche** : titre, description, objectifs (critères de réussite), **budget propre**, éventuellement échéance et priorité.
2. Le **CEO prend la tâche** : découpage en sous-tâches, assignation aux départements, **création de département ou embauche si besoin**.
3. Vous suivez l'**arbre des sous-tâches** et leurs statuts (à faire / en cours / bloquée / en revue / terminée).
4. **Cycle de validation à double étage** :
   - *Sous-tâches* : l'agent assigné change librement le statut de sa tâche, **sous la supervision de son manager** — qui confirme le passage à "terminé", relance, ou recrée d'autres sous-tâches si le résultat ne suffit pas.
   - *Tâche principale* : quand tout est terminé, le **CEO la passe à "Terminé" et vous envoie un message** ("on a fini XYZ"). Vous **vérifiez** le livrable : archivage si c'est bon, **réouverture** si vous estimez que ce n'est pas fini.
5. Les **questions des agents sur la tâche** remontent la hiérarchie ; seules celles auxquelles la hiérarchie ne peut pas répondre atteignent votre inbox.
6. Le chat existe mais n'est **pas la voie privilégiée** : avec le CEO pour la stratégie (mission, objectifs, budget, demandes) ; en direct avec un agent/département si vous voulez court-circuiter — possible, jamais automatique.

La tâche est l'objet central du système : décomposition, assignation, avancement, budget, questions/réponses, livrables, coûts imputés.

### 3.6 Budgets : le CEO gère ses finances (comptabilité d'engagement)

- **Budget du workspace** : un montant initial + une **période paramétrable** (jour, semaine, mois, année). Le CEO connaît en permanence trois chiffres : l'enveloppe, le **consommé**, et l'**engagé** (budgétisé pour les tâches en cours).
- **Budget par tâche, alloué par le CEO** : quand il prend une tâche, il l'évalue (simple ou complexe, quel % du projet/budget elle représente) et lui **alloue une enveloppe** prélevée sur le disponible. Tâche terminée sous le budget → **le delta retourne au budget du workspace**.
- **Épuisement du budget d'une tâche** → le travail se met **en pause proprement + alerte à l'utilisateur**, qui décide : rallonge, réduction du scope, ou abandon.

Le CEO arbitre librement *sous* les plafonds ; le démon **coupe** *aux* plafonds. L'autonomie a une enveloppe, jamais un chèque en blanc.

### 3.7 Les rituels (le battement de cœur de l'entreprise)

- **Toutes les heures** (paramétrable) : le CEO **réveille chaque HEAD** ; chaque HEAD **interroge ses équipes** pour un reporting réel — pas deviné — et le consolide pour le CEO.
- **Chaque matin** (paramétrable) : le CEO **vient au rapport** auprès de l'utilisateur — avancement, décisions, dépenses, blocages.
- **À la demande** : tout ce qui requiert l'utilisateur (question filtrée, permission, budget, validation) part dans l'inbox sans attendre le rituel.

**Arbitrage coût/utilité du rituel horaire (validé)** — le rituel a un coût en tokens, mais c'est aussi le filet de sécurité qui détecte un agent planté ou une tâche silencieusement échouée. Solution à deux étages :

1. **Ronde technique du démon (gratuite, du code, pas du LLM)** : à chaque tick, le démon vérifie les signes vitaux — workers vivants, sous-tâches sans activité depuis X temps, statuts incohérents, crashs. Rien d'anormal et rien d'actif → personne n'est réveillé, coût zéro.
2. **Ronde managériale (payante, LLM)** : déclenchée seulement s'il y a du travail en cours ou une anomalie détectée par la ronde technique. C'est là que la hiérarchie se réveille en cascade et produit du reporting qualitatif.

On garde ainsi le filet de sécurité sans payer des tournées de bureaux vides.

### 3.8 Auditabilité totale

**Tout est ouvert** : chaque conversation inter-agents est consultable, et le **raisonnement interne de chaque agent** (chaîne de réflexion, décisions d'outils) est enregistré et lisible. Vous ne surveillez pas en continu — mais vous pouvez toujours ouvrir le capot, sur n'importe quel échange, à n'importe quel moment.

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

**Tauri v2** pour la coquille UI (contrainte : app 24/7, empreinte mémoire minimale). Cœur agentique en **Node/TypeScript** (sidecar) car l'écosystème (Agent SDK, MCP, Playwright) y vit. **Couche multi-provider dès la V1** avec table de tarifs par modèle (le CEO raisonne sur les coûts réels). La table est **embarquée dans l'app** (actualisée via les releases) mais **overridable dans les réglages** — l'utilisateur peut même y déclarer un **provider personnalisé** (clé API + tarifs), par exemple un endpoint local ou d'entreprise.

### 5.2 La stratégie mémoire (contrainte n°1 : tourner 24/7 sans dériver)

1. **Employés éphémères** : au repos un agent "dort" — état dans SQLite, RAM ≈ 0. Une intervention = un **processus worker dédié, tué à la fin**. Une fuite ne peut pas s'accumuler.
2. **Démon minimal 24/7** : scheduler des rituels, ronde technique, file de tâches, inbox, comptabilité/budgets, watchdog. **Watchdog mémoire** : au-delà d'un seuil (ex. 300 Mo), redémarrage propre automatique — invisible, l'état étant sur disque.
3. **UI jetable** : fenêtre fermée = webview déchargée ; ne restent que l'icône barre de menu et le démon.
4. **Playwright à la demande** : lancé par le worker, fermé avec lui.

**Objectif : < 200 Mo au repos, retour systématique au niveau de repos après chaque mission.** Test d'endurance 48 h dans la CI dès que le cœur existe.

### 5.3 Découpage

```
┌────────────────────────────────────────────────┐
│ UI — Tauri v2 (webview) + React/TS             │
│ todo-list & arbre de tâches · organigramme ·   │
│ inbox · audit (conversations + raisonnements) ·│
│ budgets & comptabilité · réglages              │
├────────────────────────────────────────────────┤
│ Démon Node (sidecar, 24/7, minimal)            │
│ scheduler des rituels · ronde technique ·      │
│ file de tâches · inbox · comptabilité/budgets ·│
│ permissions · watchdog mémoire                 │
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

Objets de première classe : **Workspace, Employé (contrat, caractère, modèle, permissions, mémoire), Tâche (arbre, statuts, budget, Q/R, livrables, coûts), Conversation, Trace de raisonnement, Écriture comptable, Table de tarifs providers.**

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

## 7. Sécurité & confiance

- **Permissions par employé, à la iOS** : accès dossier/shell/navigateur individuels, visibles, révocables.
- **Zones de travail** : par défaut un employé n'écrit que dans son dossier ; sortir = approbation.
- **Actions irréversibles** : porte d'approbation non désactivable en V1.
- **Budgets durs** à deux niveaux (workspace + tâche) : pause propre et alerte à l'épuisement (voir §3.6).
- **Journal d'audit** complet (actions + conversations + raisonnements).
- Agents lisant du contenu externe : droits d'action réduits par défaut (anti prompt-injection).

---

## 8. MVP (V1) — macOS d'abord

**But : la boucle complète cabinet de recrutement → CEO → todo-list → cascade → rapport, en vrai.**

Inclus :
1. **Fondation d'un workspace** : conversation avec le cabinet de recrutement, profils de CEO avec jauges de caractère, cadrage (mission, budget mensuel, providers), mise en place des départements avec le CEO.
2. **CEO + 2 départements** avec HEAD ; le CEO embauche des spécialistes CDD dans son budget (choix du modèle selon coût réel).
3. **Todo-list** : tâches budgétisées par le CEO (comptabilité consommé/engagé, restitution du delta), décomposition, arbre de sous-tâches avec statuts ; cycle de validation à double étage (manager sur les sous-tâches, utilisateur sur la tâche principale).
4. **Rituels** : ronde technique gratuite du démon + ronde managériale en cascade quand il y a de l'activité ; rapport matinal du CEO ; fréquences paramétrables.
5. Outils hôte : fichiers (dossiers autorisés), shell (avec approbation), recherche web.
6. **Inbox** : questions filtrées par les HEADs, demandes du CEO (permission, rallonge de budget), livrables à valider, alertes de pause budgétaire.
7. **Audit & comptabilité** : conversations + raisonnements consultables ; coût en $ par agent et par tâche.
8. Fin de mission : rapport + archivage réveillable des CDD.
9. App barre de menu + notifications, auto-update, build signé/notarizé macOS ; CI 3 OS ; test d'endurance mémoire 48 h.
10. **Multi-provider** : Anthropic + 1 autre (ou modèle local) pour éprouver l'arbitrage coût/compétence du CEO.

Exclus de la V1 : multi-workspaces simultanés, marketplace, mobile, automatisation AppleScript poussée, distribution Windows/Linux.

**Test de réussite** : fonder un workspace via le cabinet de recrutement, poser une tâche floue avec un budget — et voir l'entreprise se structurer seule, produire, se mettre en pause si le budget s'épuise, et venir au rapport le lendemain matin ; le tout auditable jusqu'au raisonnement de chaque agent, avec une RAM au repos < 200 Mo.

---

## 9. Décisions actées

| # | Sujet | Décision |
|---|---|---|
| 1 | Cible | Usage personnel d'abord ; ensuite indépendants (tech ou non) |
| 2 | Concept central | Une **entreprise par workspace** ; départements + hiérarchie profonde à scopes étroits |
| 3 | Modèle éco | Sans objet pour l'instant |
| 4 | Personnalité | Prénom, titre, avatar, personnalité par agent |
| 5 | Autonomie | Paramétrable par agent |
| 6 | Départements | Définis à la fondation du workspace, extensibles par le CEO ensuite |
| 7 | Licence | Propriétaire |
| 8 | Stack | Tauri v2 + démon Node sidecar + workers éphémères ; < 200 Mo au repos |
| 9 | Recrutement | **Le CEO embauche**, dans un budget mensuel et une liste de providers fixés par l'utilisateur |
| 10 | Interface principale | **Todo-list** ; chat possible mais non privilégié |
| 11 | Cycle de vie | Spécialistes en CDD : rapport de mission puis archivage réveillable |
| 12 | Rituels | Monitoring horaire en cascade + rapport matinal ; fréquences paramétrables |
| 13 | Transparence | Auditabilité totale : conversations ET raisonnements internes |
| 14 | Multi-provider | Pilier V1 : chaque employé = un modèle choisi à l'embauche selon coût/compétence |
| 15 | Validation des tâches | Double étage : manager confirme les sous-tâches ; CEO passe la principale à "Terminé" + message ; l'utilisateur vérifie, archive ou rouvre |
| 16 | Budget par tâche | **Alloué par le CEO** (évaluation simple/complexe, % du projet) ; delta restitué au workspace en fin de tâche ; épuisé → **pause propre + alerte utilisateur** |
| 17 | Coûts | Le CEO voit les **coûts réels en tokens** ; le système déduit le coût $ par agent et par tâche |
| 18 | Filtrage des questions | Les HEADs filtrent ; seules les questions sans réponse hiérarchique atteignent l'utilisateur |
| 19 | Onboarding | **Cabinet de recrutement** en roleplay : interview projet, profils de CEO, **jauges de caractère** façon jeu vidéo |
| 20 | Rituel & coût | **Validé** : ronde technique gratuite du démon à chaque tick ; ronde managériale LLM seulement si activité ou anomalie |
| 21 | Budget workspace | Montant initial + **période paramétrable** (jour/semaine/mois/année) ; comptabilité consommé / engagé / disponible |
| 22 | Jauges de caractère | Remise en question, aversion au risque, rigueur, concision des rapports, formalisme, gestion budgétaire… — **liste extensible** |
| 23 | Cabinet de recrutement | Disponible **à la fondation et à la demande** (remplacement du CEO possible, l'entreprise survit) |
| 24 | Tarifs providers | **Embarqués** (mis à jour via les releases), **overridables** dans les réglages ; **providers personnalisés** déclarables (clé API + tarifs) |
| 25 | Nom | **KoaTeam**, définitif |

## 10. Vision verrouillée — prochaines étapes

Le brainstorming est terminé : 25 décisions actées, plus de question ouverte bloquante. La suite, dans l'ordre proposé :

1. **Spec produit V1** : consolider ce document en spécification de référence — écrans, entités (Workspace, Employé, Tâche, Conversation, Écriture comptable…), flux complets (fondation, prise de tâche, rituels, validation, fin de mission).
2. **Wireframes des 5 écrans clés** : todo-list/arbre de tâches, organigramme, inbox, fiche employé, vue audit.
3. **Spike technique (en parallèle de 1–2)** : prototype minimal Tauri v2 + sidecar Node + un worker éphémère exécutant une vraie boucle agentique — pour dérisquer l'empaquetage multi-plateforme du sidecar et valider la stratégie mémoire (< 200 Mo au repos) avant d'écrire le produit.
4. Puis : squelette du repo (monorepo UI/démon/workers), CI 3 OS, et développement du MVP décrit en §8.
