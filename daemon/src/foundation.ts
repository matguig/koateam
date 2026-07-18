// Le cabinet de recrutement (SPEC-V1 §5.1, décisions 19/23) : la fondation
// d'un workspace est une conversation, pas un formulaire.
//
// M2 : interview scriptée et déterministe (fonctionne hors-ligne, testable en
// CI). Quand un vrai provider sera le moteur (M3), le script devient le
// squelette de son prompt — les étapes et le contrat de sortie sont identiques.

import type { Store, Workspace } from './store.js'

export interface CeoProfile {
  name: string
  badge: string
  color: string
  pitch: string
  /** [Remise en question, Aversion au risque, Rigueur, Concision, Formalisme, Gestion budgétaire] */
  traits: number[]
}

export const CEO_PROFILES: CeoProfile[] = [
  {
    name: 'Léa Fontaine', badge: 'Recommandée', color: '#bf5af2',
    pitch: 'Structurée, orientée process. Économe par défaut, sait débloquer du budget quand le ROI est démontré.',
    traits: [62, 70, 85, 55, 60, 90],
  },
  {
    name: 'Marc-Antoine Vidal', badge: 'Profil offensif', color: '#0a84ff',
    pitch: 'Va vite, dépense vite. Excellent pour un sprint de lancement, à surveiller sur la durée.',
    traits: [45, 25, 60, 50, 40, 45],
  },
  {
    name: 'Élise Rambert', badge: 'Profil créatif', color: '#ff6482',
    pitch: 'Créative, tolère le risque et l’ambiguïté. Idéale pour un produit qui cherche encore sa forme.',
    traits: [75, 40, 55, 45, 30, 60],
  },
]

interface FoundationSession {
  stage: 'project' | 'budget' | 'profiles'
  name: string
  mission: string
  budget: number
}

export interface ModelTiering {
  ceo: string
  head: string
  specialist: string
}

export class Foundation {
  private session: FoundationSession = { stage: 'project', name: '', mission: '', budget: 20 }

  constructor(
    private store: Store,
    /** Choix des modèles à l'embauche : vrais modèles Claude si le provider
     *  Anthropic est configuré, provider de démonstration sinon. */
    private pickModels: () => ModelTiering = () => ({ ceo: 'mock-fast', head: 'mock-fast', specialist: 'mock-fast' }),
  ) {}

  reset(): void {
    this.session = { stage: 'project', name: '', mission: '', budget: 20 }
  }

  greeting(): string {
    return 'Bienvenue chez Aubert & Fils, cabinet de recrutement de dirigeants virtuels. ' +
      'Parlez-nous de votre projet : que doit accomplir cette entreprise ?'
  }

  message(text: string): { reply: string; stage: string; profiles?: CeoProfile[]; draft: Omit<FoundationSession, 'stage'> } {
    const s = this.session
    if (s.stage === 'project') {
      s.mission = text.trim()
      s.name = text.trim().split(/[.,!\n]/)[0].slice(0, 40) || 'Nouveau projet'
      s.stage = 'budget'
      return {
        reply: `Très bien — mission notée : « ${s.mission.slice(0, 120)} ». Quel budget mensuel (en $) confiez-vous à cette entreprise ? C'est un plafond dur : le CEO devra faire avec.`,
        stage: s.stage, draft: { ...s },
      }
    }
    if (s.stage === 'budget') {
      const parsed = parseFloat(text.replace(',', '.').replace(/[^\d.]/g, ''))
      s.budget = Number.isFinite(parsed) && parsed > 0 ? parsed : 20
      s.stage = 'profiles'
      return {
        reply: `Parfait, ${s.budget.toFixed(2)} $/mois. Voici 3 profils issus de notre vivier — les jauges sont ajustables avant signature, le caractère se fixe au contrat. Qui embauchez-vous ?`,
        stage: s.stage, profiles: CEO_PROFILES, draft: { ...s },
      }
    }
    return {
      reply: 'Il ne reste qu’à choisir un profil et signer le contrat.',
      stage: s.stage, profiles: CEO_PROFILES, draft: { ...s },
    }
  }

  sign(input: {
    ceoIndex: number
    traits?: number[]
    name?: string
    mission?: string
    budget?: number
    departments?: string[]
  }): Workspace {
    if (this.store.getWorkspace()) throw new Error('un workspace existe déjà (multi-workspaces : V2)')
    const profile = CEO_PROFILES[input.ceoIndex] ?? CEO_PROFILES[0]
    const s = this.session
    const departments = input.departments?.length ? input.departments : ['Marketing', 'Dev']

    const budget = input.budget ?? s.budget
    if (!Number.isFinite(budget) || budget <= 0) throw new Error('budget invalide')
    const models = this.pickModels()
    const ws = this.store.createWorkspace({
      name: (input.name ?? s.name).trim() || 'Nouvelle entreprise',
      mission: (input.mission ?? s.mission).trim() || 'Mission à préciser avec le CEO.',
      budget_amount: budget,
    })

    const ceo = this.store.hire({
      workspace_id: ws.id, name: profile.name, title: 'CEO · Direction générale',
      role: 'ceo', department: null, manager_id: null, contract: 'permanent',
      color: profile.color, model: models.ceo, autonomy: 'ask_sensitive',
      scope: 'Décompose les tâches, structure les départements, arbitre les budgets et remonte l’essentiel.',
      character: input.traits ?? profile.traits,
      perms: ['org:embauche / licenciement', 'web:recherche web'],
      memory: [`Mission de l'entreprise : ${input.mission ?? s.mission}`],
    })

    const HEAD_POOL: Record<string, { name: string; color: string }> = {
      Marketing: { name: 'Thomas Perrin', color: '#ff9f0a' },
      Dev: { name: 'Karim Benali', color: '#0a84ff' },
      Production: { name: 'Sarah Nguyen', color: '#30d158' },
      Juridique: { name: 'Paul Weiss', color: '#ac8e68' },
      Comptabilité: { name: 'Nadia Belkacem', color: '#64d2ff' },
      'Client Success': { name: 'Hugo Lambert', color: '#ffd60a' },
    }
    const SPECIALIST_POOL: Record<string, { name: string; title: string; color: string }> = {
      Marketing: { name: 'Chloé Martin', title: 'Rédactrice · Marketing', color: '#30d158' },
      Dev: { name: 'Sofia Costa', title: 'Développeuse · Dev', color: '#ac8e68' },
      Production: { name: 'Inès Moreau', title: 'Productrice · Production', color: '#ff6482' },
    }

    for (const dept of departments) {
      const head = HEAD_POOL[dept] ?? { name: `HEAD ${dept}`, color: '#8e8e93' }
      const h = this.store.hire({
        workspace_id: ws.id, name: head.name, title: `HEAD ${dept}`, role: 'head',
        department: dept, manager_id: ceo.id, contract: 'permanent', color: head.color,
        model: models.head, autonomy: 'ask_sensitive',
        scope: `Pilote le département ${dept} : décompose, délègue, contrôle la qualité avant de faire remonter.`,
        character: [55, 50, 75, 65, 50, 70], perms: [`fs:zone ${dept}`, 'web:recherche web'], memory: [],
      })
      const spec = SPECIALIST_POOL[dept]
      if (spec) {
        this.store.hire({
          workspace_id: ws.id, name: spec.name, title: spec.title, role: 'specialist',
          department: dept, manager_id: h.id, contract: 'mission', color: spec.color,
          model: models.specialist, autonomy: 'ask_sensitive',
          scope: `Spécialiste ${dept} au scope étroit — escalade plutôt que deviner.`,
          character: [65, 55, 80, 70, 45, 65], perms: [`fs:zone ${dept}`], memory: [],
        })
      }
    }

    this.store.messageAdd({
      workspace_id: ws.id, from_id: ceo.id, to_id: 'user',
      content: `Contrat signé — je prends la direction de « ${ws.name} ». J'ai mis en place ${departments.join(' et ')}. Confiez-nous une première tâche quand vous voulez.`,
    })
    this.store.inboxAdd({
      workspace_id: ws.id, type: 'info',
      title: `${profile.name} a pris ses fonctions`,
      body: `Départements fondés : ${departments.join(', ')}. Budget : ${ws.budget_amount.toFixed(2)} $/mois (plafond dur).`,
      employee_id: ceo.id,
    })
    this.reset()
    return ws
  }
}
