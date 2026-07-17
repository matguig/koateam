# KoaTeam — Prompt de design UI

> Prompt à coller dans Claude (claude.ai, artifacts) pour générer une maquette
> haute-fidélité explorable de l'interface. Aligné sur `SPEC-V1.md`.
> Astuce : générer d'abord la maquette complète, puis itérer écran par écran
> ("refais uniquement l'écran Tâches avec ...").

---

```
Tu es designer produit senior. Crée une maquette HTML haute-fidélité, interactive et
navigable (un seul fichier, CSS inline, données factices réalistes) pour « KoaTeam »,
une application desktop macOS (style app native, PAS un site web).

## Le produit

KoaTeam transforme chaque projet en entreprise virtuelle autonome tournant sur la
machine de l'utilisateur. L'utilisateur est le propriétaire : il embauche un CEO
virtuel (via un cabinet de recrutement), lui donne une mission, un budget et des
providers IA autorisés. Le CEO crée des départements, embauche des agents IA
spécialisés (chacun a un prénom, un titre, un avatar, un caractère, un modèle IA
attribué avec son coût), décompose les tâches de l'utilisateur et fait travailler
sa hiérarchie. L'utilisateur pilote via une todo-list, reçoit questions et livrables
dans une inbox, et peut tout auditer (conversations entre agents, raisonnements,
comptabilité au dollar près).

## Ton & direction visuelle

- App desktop macOS moderne : sidebar de navigation à gauche, densité maîtrisée,
  coins arrondis, typographie système (SF Pro / -apple-system), mode clair ET
  sombre (toggle visible).
- Sérieux ludique : c'est un outil de travail, mais l'univers « entreprise
  roleplay » doit se sentir — avatars illustrés colorés (initiales ou emoji dans
  des pastilles colorées), prénoms français, titres de postes crédibles, micro-copy
  avec un léger clin d'œil (ex. « Léa vous a envoyé le rapport du matin »).
- Couleurs de statut cohérentes partout : à faire (gris), en cours (bleu),
  bloquée (orange), en revue (violet), terminée (vert), pause budget (rouge).
- L'argent est un citoyen de première classe : budgets et coûts visibles partout,
  barres de progression enveloppe/consommé/engagé, montants en $ à 2 décimales.

## Navigation (sidebar)

Workspace actif « Lancement SaaS Photo » en haut (avec pastille de statut et budget
du mois : 240 $ / 400 $), puis : Tâches · Organigramme · Inbox (badge « 3 ») ·
Audit · Comptabilité · Réglages. En bas : pastille du CEO avec « Rapport du matin ».

## Écrans à maquetter (navigables via la sidebar)

1. TÂCHES (écran principal) — Liste des tâches principales : titre, statut,
   avancement (ex. 4/7 sous-tâches), barre de budget (alloué/consommé), badge
   questions. Une tâche dépliée montre le détail : description, objectifs (checklist),
   note d'évaluation du CEO (« Complexe, ~18 % du budget projet »), ARBRE des
   sous-tâches sur 2-3 niveaux (chaque nœud : avatar + prénom de l'assigné, statut,
   coût), livrables, fil de questions/réponses. Bouton « Nouvelle tâche ».

2. ORGANIGRAMME — Arbre visuel : Vous (propriétaire) → CEO → 2 départements
   (Marketing, Dev) → HEADs → spécialistes (dont un « CDD — Campagne lancement »).
   Carte par employé : avatar, prénom, titre, modèle IA + coût (ex. « Haiku ·
   0,80 $/Mtok »), dépense cumulée, tâches en cours. Une section « Anciens »
   grisée avec un employé archivé (bouton « Réveiller »).

3. FICHE EMPLOYÉ (panneau ou page au clic) — Identité complète, jauges de
   caractère en sliders (remise en question, aversion au risque, rigueur,
   concision, formalisme, gestion budgétaire), scope du poste, permissions
   accordées (liste révocable : dossier X, shell, recherche web), mémoire
   consultable, historique d'interventions avec coûts.

4. INBOX — File triée par urgence, items typés avec icônes distinctes :
   une question filtrée (« Le HEAD Marketing n'a pas pu répondre : quel est le
   public cible prioritaire ? » avec champ de réponse), une demande de permission
   (« Karim demande l'accès shell pour lancer les tests » avec Autoriser une fois /
   Toujours / Refuser), une alerte pause budget (« Tâche “Landing page” en pause —
   budget épuisé » avec Rallonger / Réduire le scope / Abandonner), un livrable à
   vérifier (« Tâche “Étude concurrence” terminée » avec Archiver / Rouvrir),
   et le rapport du matin du CEO (dépliable, avec chiffres).

5. FONDATION (nouveau workspace) — Chat avec le « Cabinet Aubert & Fils » :
   quelques échanges d'interview, puis l'étape choix du CEO : 3 cartes de profils
   comparables (prénom, pitch, pré-réglages de caractère) + jauges ajustables,
   et un panneau récapitulatif contractuel (mission, budget 400 $/mois, providers
   autorisés avec tarifs, départements pressentis) avec bouton « Signer ».

6. AUDIT — Explorateur : filtres (par employé, par tâche, par type), liste de
   conversations inter-agents (extraits réalistes d'une délégation CEO → HEAD →
   spécialiste), et une trace de raisonnement dépliée (déclencheur, étapes de
   réflexion, appels d'outils avec résultats, tokens et coût de l'intervention).

7. COMPTABILITÉ — Dashboard : 3 grands chiffres (Consommé 240 $ · Engagé 85 $ ·
   Disponible 75 $), burn-down du mois, répartition par employé et par modèle,
   journal des écritures (consommation, allocation, restitution, rallonge).

## Données factices

Invente une dizaine d'employés cohérents (CEO « Léa Fontaine », HEADs, spécialistes
avec modèles variés : Fable, Sonnet, Haiku, un modèle local), 4-5 tâches à des stades
différents dont une en pause budget, des montants réalistes et cohérents entre les
écrans.

## Contraintes techniques

Un seul fichier HTML autonome (pas de librairies externes), navigation par onglets
JS simple, responsive à partir de 1100 px de large, mode sombre par défaut avec
toggle. Vise la qualité d'un vrai produit fini, pas d'un wireframe.
```

---

## Variantes utiles

- **Explorer une autre direction** : remplacer le bloc « Ton & direction visuelle »
  par « ambiance jeu de gestion rétro (pixel-art léger, façon Game Dev Story) » ou
  « ultra-minimaliste type Linear/Things ».
- **Zoomer** : « Ne maquette que l'écran Tâches, en 3 propositions côte à côte. »
- **Tester le mode clair** : « même maquette, mode clair par défaut ».
