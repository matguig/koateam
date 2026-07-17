// Types alignés sur SPEC-V1.md (§3). La V1 branchera ces mêmes formes sur le démon.

export type TaskStatus = 'todo' | 'doing' | 'blocked' | 'review' | 'done' | 'paused'

export type Department = 'Marketing' | 'Dev'

export interface Employee {
  id: string
  name: string
  title: string
  role: 'ceo' | 'head' | 'specialist'
  department: Department | null
  contract: 'permanent' | 'mission'
  archived: boolean
  color: string
  /** Modèle IA attribué + tarif, ex. « Sonnet · 3,00 $/Mtok » */
  model: string
  spend: number
  load: string
  /** Jauges 0-100, dans l'ordre de TRAIT_LABELS */
  traits: number[]
  scope: string
  /** « kind:label » — kind ∈ fs | web | shell | org | secrets */
  perms: string[]
  memory: string[]
  archivedNote?: string
}

export interface SubTaskNode {
  emp: string
  title: string
  st: TaskStatus
  cost: number
  depth: number
}

export interface QAEntry {
  emp: string // id employé ou 'vous'
  who: string
  when: string
  text: string
}

export interface Task {
  id: string
  title: string
  st: TaskStatus
  done: number
  total: number
  alloc: number
  spent: number
  eng: number
  questions: number
  desc: string
  /** Évaluation du CEO (complexité, % du budget) */
  note: string
  objectives: [string, boolean][]
  tree: SubTaskNode[]
  deliverables: [string, string][]
  qa: QAEntry[]
}

export interface CeoProfile {
  name: string
  badge: string
  badgeColor: string
  color: string
  pitch: string
  traits: [string, number][]
}

export interface JournalEntry {
  date: string
  type: string
  color: string
  label: string
  amount: string
  solde: string
}

export type Screen = 'taches' | 'org' | 'inbox' | 'audit' | 'compta' | 'fondation' | 'reglages'
