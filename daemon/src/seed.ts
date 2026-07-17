// Amorçage d'un workspace de démonstration (le cabinet de recrutement
// conversationnel arrive en M2 — d'ici là, l'entreprise est fondée d'office).

import type { Store, Workspace } from './store.js'

export function ensureSeeded(store: Store): Workspace {
  const existing = store.getWorkspace()
  if (existing) return existing

  const ws = store.createWorkspace({
    name: 'Lancement SaaS Photo',
    mission: 'Concevoir, produire et vendre une bibliothèque de presets Lightroom. Premières ventes sous 6 semaines.',
    budget_amount: 400,
  })

  const base = { workspace_id: ws.id, autonomy: 'ask_sensitive', memory: [] as string[] }
  const lea = store.hire({
    ...base, name: 'Léa Fontaine', title: 'CEO · Directrice générale', role: 'ceo',
    department: null, manager_id: null, contract: 'permanent', color: '#bf5af2',
    model: 'mock-fast', character: [62, 70, 85, 55, 60, 90],
    scope: 'Décompose les tâches, structure les départements, arbitre les budgets et remonte l’essentiel.',
    perms: ['org:embauche / licenciement', 'web:recherche web'],
  })
  const thomas = store.hire({
    ...base, name: 'Thomas Perrin', title: 'HEAD Marketing', role: 'head',
    department: 'Marketing', manager_id: lea.id, contract: 'permanent', color: '#ff9f0a',
    model: 'mock-fast', character: [55, 45, 70, 65, 50, 75],
    scope: 'Pilote le département Marketing : campagne, contenus, acquisition.',
    perms: ['fs:zone Marketing', 'web:recherche web'],
  })
  const karim = store.hire({
    ...base, name: 'Karim Benali', title: 'HEAD Dev', role: 'head',
    department: 'Dev', manager_id: lea.id, contract: 'permanent', color: '#0a84ff',
    model: 'mock-fast', character: [50, 30, 90, 70, 40, 65],
    scope: 'Pilote le département Dev : produit, intégrations, qualité.',
    perms: ['fs:zone Dev', 'web:recherche web'],
  })
  store.hire({
    ...base, name: 'Chloé Martin', title: 'Rédactrice · Marketing', role: 'specialist',
    department: 'Marketing', manager_id: thomas.id, contract: 'mission', color: '#30d158',
    model: 'mock-fast', character: [70, 60, 80, 75, 45, 70],
    scope: 'Rédige emails, pages et études. Escalade plutôt que deviner.',
    perms: ['fs:zone Marketing/contenus', 'web:recherche web'],
  })
  store.hire({
    ...base, name: 'Sofia Costa', title: 'Backend · Dev', role: 'specialist',
    department: 'Dev', manager_id: karim.id, contract: 'mission', color: '#ac8e68',
    model: 'mock-fast', character: [60, 35, 85, 70, 55, 60],
    scope: 'API, base de données et intégrations.',
    perms: ['fs:zone Dev/api'],
  })

  return ws
}
