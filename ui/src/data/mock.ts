// Données de démonstration (workspace « Lancement SaaS Photo »).
// La V1 remplacera ce module par les appels au démon.

import type { CeoProfile, Employee, JournalEntry, Task, TaskStatus } from '../types'

export const STATUS: Record<TaskStatus, [string, string]> = {
  todo: ['À faire', '#8e8e93'],
  doing: ['En cours', '#0a84ff'],
  blocked: ['Bloquée', '#ff9f0a'],
  review: ['En revue', '#bf5af2'],
  done: ['Terminée', '#30d158'],
  paused: ['Pause budget', '#ff453a'],
}

export const TRAIT_LABELS = [
  'Remise en question',
  'Aversion au risque',
  'Rigueur',
  'Concision',
  'Formalisme',
  'Gestion budgétaire',
]

export const fmt = (v: number) => v.toFixed(2).replace('.', ',') + ' $'

export const initials = (name: string) =>
  name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

const mk = (
  id: string,
  name: string,
  title: string,
  role: Employee['role'],
  department: Employee['department'],
  contract: Employee['contract'],
  color: string,
  model: string,
  spend: number,
  load: string,
  traits: number[],
  scope: string,
  perms: string[],
  memory: string[],
): Employee => ({
  id, name, title, role, department, contract, archived: false,
  color, model, spend, load, traits, scope, perms, memory,
})

export const EMPLOYEES: Record<string, Employee> = Object.fromEntries(
  [
    mk('lea', 'Léa Fontaine', 'CEO · Directrice générale', 'ceo', null, 'permanent', '#bf5af2',
      'Sonnet · 3,00 $/Mtok', 50.94, '5 tâches', [62, 70, 85, 55, 60, 90],
      'Décompose vos tâches, structure les départements, arbitre les budgets et vous remonte l’essentiel. Ne produit pas elle-même : elle fait produire.',
      ['fs:/projets/saas-photo (lecture)', 'web:recherche web', 'org:embauche / licenciement'],
      ['Le propriétaire préfère des rapports courts, chiffrés, le matin.', 'Basculer la QA sur le modèle local pour économiser.', 'Public cible : question ouverte, escaladée le 17/07.']),
    mk('thomas', 'Thomas Perrin', 'HEAD Marketing', 'head', 'Marketing', 'permanent', '#ff9f0a',
      'Sonnet · 3,00 $/Mtok', 24.10, '2 tâches', [55, 45, 70, 65, 50, 75],
      'Pilote le département Marketing : campagne de lancement, contenus, acquisition. Délègue à Chloé, Hugo et Inès.',
      ['fs:/projets/saas-photo/marketing', 'web:recherche web'],
      ['Ton de marque : direct, sans jargon.', 'Budget campagne serré : privilégier Haiku pour les brouillons.']),
    mk('karim', 'Karim Benali', 'HEAD Dev', 'head', 'Dev', 'permanent', '#0a84ff',
      'Sonnet · 3,00 $/Mtok', 31.77, '2 tâches', [50, 30, 90, 70, 40, 65],
      'Pilote le département Dev : landing, intégration paiement, qualité. Demande les accès shell au besoin — jamais sans votre accord.',
      ['fs:/projets/saas-photo/app', 'shell:npm run test:* (en attente)', 'web:recherche web'],
      ['Stack retenue : Next.js + Stripe.', 'Les tests e2e nécessitent un accès shell — demande envoyée.']),
    mk('chloe', 'Chloé Martin', 'Rédactrice · Marketing', 'specialist', 'Marketing', 'mission', '#30d158',
      'Haiku · 0,80 $/Mtok', 12.05, '2 sous-tâches', [70, 60, 80, 75, 45, 70],
      'Rédige emails, pages et études. Escalade plutôt que deviner quand le brief est ambigu.',
      ['fs:/projets/saas-photo/marketing/contenus', 'web:recherche web'],
      ['Étude concurrence v3 : 3 segments identifiés.', 'Email 1 rédigé, email 2 bloqué (ciblage).']),
    mk('hugo', 'Hugo Lambert', 'Growth / SEO · Marketing', 'specialist', 'Marketing', 'mission', '#64d2ff',
      'Haiku · 0,80 $/Mtok', 8.63, '1 sous-tâche', [45, 55, 60, 60, 35, 60],
      'Acquisition organique : SEO, tracking, analytics de la landing.',
      ['fs:/projets/saas-photo/marketing', 'web:recherche web'],
      ['GA4 configuré sur la préprod.']),
    mk('ines', 'Inès Moreau', 'Designer · CDD — Campagne lancement', 'specialist', 'Marketing', 'mission', '#ff6482',
      'Fable · 1,60 $/Mtok', 19.88, '2 sous-tâches', [40, 65, 65, 50, 30, 55],
      'Contrat à durée déterminée : visuels de la campagne de lancement uniquement. Fin de contrat au lancement.',
      ['fs:/projets/saas-photo/marketing/visuels'],
      ['Direction artistique validée par Thomas le 12/07.']),
    mk('julien', 'Julien Roche', 'Frontend · Dev', 'specialist', 'Dev', 'mission', '#ffd60a',
      'Sonnet · 3,00 $/Mtok', 42.31, '1 tâche (en pause)', [55, 40, 75, 60, 45, 50],
      'Développe la landing page et l’interface du produit.',
      ['fs:/projets/saas-photo/app/web'],
      ['Landing à 80 % — en pause budget depuis ce matin.']),
    mk('sofia', 'Sofia Costa', 'Backend · Dev', 'specialist', 'Dev', 'mission', '#ac8e68',
      'Sonnet · 3,00 $/Mtok', 36.12, '1 tâche', [60, 35, 85, 70, 55, 60],
      'API, base de données et intégration Stripe.',
      ['fs:/projets/saas-photo/app/api', 'secrets:clé Stripe test'],
      ['Webhooks Stripe : 4/9 événements couverts.']),
    mk('nadia', 'Nadia Belkacem', 'QA · Dev', 'specialist', 'Dev', 'mission', '#8e8e93',
      'Qwen 7B local · 0,00 $/Mtok', 0.0, '2 sous-tâches', [65, 75, 95, 80, 60, 85],
      'Relit, teste et casse ce que les autres produisent. Tourne gratuitement sur votre machine.',
      ['fs:/projets/saas-photo (lecture)'],
      ['12 anomalies ouvertes, 9 résolues.']),
  ].map((e) => [e.id, e]),
)

const n = (emp: string, title: string, st: TaskStatus, cost: number, depth: number) =>
  ({ emp, title, st, cost, depth })

export const TASKS: Task[] = [
  {
    id: 't1', title: 'Intégration paiement Stripe', st: 'doing', done: 2, total: 8,
    alloc: 90, spent: 34.6, eng: 40, questions: 0,
    desc: 'Mettre en place le paiement par abonnement : checkout, webhooks, factures et coupons de lancement.',
    note: 'Lourde mais standard, ~22 % du budget projet. J’ai réservé 40 $ d’engagement pour couvrir les tests.',
    objectives: [['Checkout abonnement mensuel', true], ['Webhooks (9 événements)', false], ['Factures PDF automatiques', false], ['Coupon de lancement −30 %', false]],
    tree: [
      n('karim', 'Architecture paiement', 'done', 5.1, 0),
      n('sofia', 'Endpoints checkout', 'done', 12.4, 1),
      n('sofia', 'Webhooks Stripe', 'doing', 9.8, 1),
      n('nadia', 'Tests webhooks', 'todo', 0, 2),
      n('julien', 'Écran facturation', 'todo', 0, 1),
    ],
    deliverables: [['schema-paiement-v2.md', 'Karim · 11 juil.'], ['checkout-demo.mp4', 'Sofia · hier']],
    qa: [
      { emp: 'karim', who: 'Karim', when: 'hier 16:20', text: 'Stripe test ou live pour la démo de vendredi ? Je pars sur test par défaut.' },
      { emp: 'vous', who: 'Vous', when: 'hier 17:05', text: 'Test, on passera en live après l’audit sécurité.' },
    ],
  },
  {
    id: 't2', title: 'Campagne de lancement', st: 'doing', done: 4, total: 7,
    alloc: 72, spent: 41.2, eng: 12, questions: 1,
    desc: 'Préparer et orchestrer le lancement public : plan de campagne, séquence emails, visuels réseaux et relais influenceurs. Objectif : 500 inscrits la première semaine.',
    note: 'Complexe, ~18 % du budget projet. La dépendance au ciblage est le principal risque de dérapage.',
    objectives: [['Plan de campagne validé', true], ['Séquence de 3 emails', false], ['Visuels 4 formats', false], ['5 influenceurs contactés', true]],
    tree: [
      n('thomas', 'Plan de campagne', 'done', 6.4, 0),
      n('chloe', 'Calendrier éditorial', 'done', 3.15, 1),
      n('chloe', 'Séquence emails', 'blocked', 4.88, 1),
      n('ines', 'Visuels réseaux', 'doing', 9.32, 0),
      n('ines', 'Déclinaisons formats', 'todo', 0, 1),
      n('hugo', 'Tracking landing', 'doing', 2.05, 0),
      n('thomas', 'Brief influenceurs', 'review', 5.4, 0),
    ],
    deliverables: [['Plan de campagne v2.pdf', 'Thomas · 10 juil.'], ['Calendrier éditorial.csv', 'Chloé · 12 juil.'], ['email-1-annonce.md', 'Chloé · ce matin']],
    qa: [
      { emp: 'thomas', who: 'Thomas', when: 'aujourd’hui 12:02', text: 'Quel est le public cible prioritaire ? Chloé est bloquée sur l’email 2 — j’ai remonté la question dans votre inbox.' },
    ],
  },
  {
    id: 't3', title: 'Landing page produit', st: 'paused', done: 3, total: 6,
    alloc: 25, spent: 25, eng: 0, questions: 0,
    desc: 'Concevoir et développer la landing page : hero, démo interactive, pricing, capture d’emails.',
    note: 'Enveloppe atteinte à 100 % — tout est en pause. Il manque ~2 h de travail selon Julien (≈ 6,50 $). Décision attendue dans l’inbox.',
    objectives: [['Maquette validée', true], ['Hero + démo', true], ['Pricing', true], ['Capture emails + RGPD', false]],
    tree: [
      n('julien', 'Développement landing', 'paused', 19.6, 0),
      n('nadia', 'Revue accessibilité', 'paused', 0, 1),
      n('hugo', 'Balises SEO', 'done', 5.4, 0),
    ],
    deliverables: [['maquette-landing-v3.fig', 'Julien · 8 juil.']],
    qa: [],
  },
  {
    id: 't4', title: 'Étude concurrence', st: 'review', done: 5, total: 5,
    alloc: 30, spent: 22.15, eng: 0, questions: 0,
    desc: 'Cartographier les 8 concurrents directs : pricing, positionnement, canaux d’acquisition, avis clients.',
    note: 'Simple, bien cadrée. Terminée sous budget : 7,85 $ restitués à l’enveloppe. À archiver après votre lecture.',
    objectives: [['8 concurrents analysés', true], ['Grille de pricing comparée', true], ['3 segments cibles proposés', true]],
    tree: [
      n('chloe', 'Collecte & analyse', 'done', 14.3, 0),
      n('hugo', 'Données SEO concurrents', 'done', 4.2, 1),
      n('chloe', 'Rédaction du rapport', 'done', 3.65, 0),
    ],
    deliverables: [['Étude concurrence v3.pdf', 'Chloé · hier 18:42']],
    qa: [],
  },
  {
    id: 't5', title: 'Identité de marque', st: 'todo', done: 0, total: 4,
    alloc: 45, spent: 0, eng: 0, questions: 0,
    desc: 'Nom définitif, logo, palette et ton de voix. Léa propose de geler cette tâche jusqu’au mois prochain.',
    note: 'Non urgente. Je recommande de la geler : le lancement peut se faire sous le nom de code actuel.',
    objectives: [['Shortlist de 5 noms', false], ['Logo + déclinaisons', false], ['Guide de ton', false]],
    tree: [n('ines', 'Pistes visuelles', 'todo', 0, 0), n('chloe', 'Naming & ton', 'todo', 0, 0)],
    deliverables: [],
    qa: [],
  },
]

export const CEO_PROFILES: CeoProfile[] = [
  {
    name: 'Léa Fontaine', badge: 'Recommandée', badgeColor: '#30d158', color: '#bf5af2',
    pitch: 'Structurée, orientée process. Économe par défaut, sait débloquer du budget quand le ROI est démontré.',
    traits: [['Rigueur', 85], ['Aversion au risque', 70], ['Gestion budgétaire', 90]],
  },
  {
    name: 'Marc-Antoine Vidal', badge: 'Profil offensif', badgeColor: '#ff9f0a', color: '#0a84ff',
    pitch: 'Va vite, dépense vite. Excellent pour un sprint de lancement, à surveiller sur la durée.',
    traits: [['Rigueur', 60], ['Aversion au risque', 25], ['Gestion budgétaire', 45]],
  },
  {
    name: 'Élise Rambert', badge: 'Profil créatif', badgeColor: '#bf5af2', color: '#ff6482',
    pitch: 'Créative, tolère le risque et l’ambiguïté. Idéale pour un produit qui cherche encore sa forme.',
    traits: [['Rigueur', 55], ['Aversion au risque', 40], ['Gestion budgétaire', 60]],
  },
]

export const BURN_VALUES = [400, 392, 381, 372, 358, 346, 331, 322, 308, 301, 289, 281, 272, 262, 255, 247, 240]

export const EMP_SPEND: [string, number, string][] = [
  ['Léa F.', 50.94, '#bf5af2'],
  ['Julien R.', 42.31, '#ffd60a'],
  ['Sofia C.', 36.12, '#ac8e68'],
  ['Karim B.', 31.77, '#0a84ff'],
  ['Thomas P.', 24.10, '#ff9f0a'],
  ['Inès M.', 19.88, '#ff6482'],
]

export const MODEL_SPEND: [string, number, string][] = [
  ['Sonnet', 185.24, '#0a84ff'],
  ['Haiku', 34.88, '#30d158'],
  ['Fable', 19.88, '#ff6482'],
  ['Qwen local', 0, '#8e8e93'],
]

export const JOURNAL: JournalEntry[] = [
  { date: '17 juil. 09:41', type: 'Pause budget', color: '#ff453a', label: '« Landing page produit » — enveloppe épuisée, travaux gelés', amount: '', solde: '' },
  { date: '17 juil. 09:18', type: 'Consommation', color: '#0a84ff', label: 'Chloé Martin · Sonnet→Haiku · séquence emails', amount: '−0,14 $', solde: '160,00 $' },
  { date: '16 juil. 18:42', type: 'Restitution', color: '#30d158', label: '« Étude concurrence » clôturée sous budget', amount: '+7,85 $', solde: '160,14 $' },
  { date: '16 juil. 16:40', type: 'Consommation', color: '#0a84ff', label: 'Sofia Costa · webhooks Stripe', amount: '−4,62 $', solde: '152,29 $' },
  { date: '15 juil. 11:03', type: 'Allocation', color: '#bf5af2', label: 'Engagement 40,00 $ réservé sur « Intégration Stripe »', amount: '−40,00 $', solde: '156,91 $' },
  { date: '14 juil. 09:12', type: 'Rallonge', color: '#ff9f0a', label: '« Campagne de lancement » +12,00 $ validée par vous', amount: '+12,00 $', solde: '196,91 $' },
  { date: '13 juil. 17:55', type: 'Consommation', color: '#0a84ff', label: 'Inès Moreau · visuels réseaux (Fable)', amount: '−3,41 $', solde: '184,91 $' },
]

export const PERM_COLORS: Record<string, string> = {
  fs: '#0a84ff', web: '#30d158', shell: '#ff9f0a', org: '#bf5af2', secrets: '#ff453a',
}
