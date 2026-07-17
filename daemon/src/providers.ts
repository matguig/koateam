// Couche multi-provider (SPEC-V1 §5.1, décision 14).
// Les clés API ne quittent JAMAIS le démon : les workers passent par
// l'appel RPC llm.complete, proxifié et comptabilisé ici.

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface LlmResult {
  content: string
  inputTokens: number
  outputTokens: number
}

export interface Provider {
  name: string
  complete(model: string, system: string, messages: ChatMessage[]): Promise<LlmResult>
}

/**
 * Provider factice, déterministe, pour le spike et la CI (aucune clé requise).
 * Il simule une vraie boucle agentique : deux appels d'outil puis un rapport
 * final — le protocole d'action est le même que pour un vrai modèle.
 */
export class MockProvider implements Provider {
  name = 'mock'

  async complete(_model: string, system: string, messages: ChatMessage[]): Promise<LlmResult> {
    const turn = messages.filter((m) => m.role === 'assistant').length
    const goal = messages[0]?.content ?? ''
    const actions = [
      { action: 'tool', tool: 'write_file', args: { path: 'plan.md', content: `# Plan\n\nObjectif : ${goal}\n\n1. Analyser\n2. Produire\n3. Rapporter\n` } },
      { action: 'tool', tool: 'write_file', args: { path: 'livrable.md', content: `# Livrable\n\nTravail effectué pour : ${goal}\n\nRésultat produit par le worker éphémère.\n` } },
      { action: 'final', report: `Mission accomplie : « ${goal} ». 2 fichiers produits (plan.md, livrable.md).` },
    ]
    const chosen = actions[Math.min(turn, actions.length - 1)]
    const inputChars = system.length + messages.reduce((n, m) => n + m.content.length, 0)
    // simule un vrai coût : ~1 token / 4 caractères en entrée, sortie forfaitaire
    return {
      content: JSON.stringify(chosen),
      inputTokens: Math.ceil(inputChars / 4),
      outputTokens: 180,
    }
  }
}

/** Provider Anthropic réel — utilisé dès que ANTHROPIC_API_KEY est présent. */
export class AnthropicProvider implements Provider {
  name = 'anthropic'
  constructor(private apiKey: string) {}

  async complete(model: string, system: string, messages: ChatMessage[]): Promise<LlmResult> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model, max_tokens: 1024, system, messages }),
    })
    if (!res.ok) throw new Error(`anthropic ${res.status}: ${await res.text()}`)
    const data = (await res.json()) as {
      content: { type: string; text?: string }[]
      usage: { input_tokens: number; output_tokens: number }
    }
    const text = data.content.filter((b) => b.type === 'text').map((b) => b.text).join('')
    return { content: text, inputTokens: data.usage.input_tokens, outputTokens: data.usage.output_tokens }
  }
}

export function buildRegistry(): Map<string, Provider> {
  const registry = new Map<string, Provider>()
  registry.set('mock', new MockProvider())
  const key = process.env.ANTHROPIC_API_KEY
  if (key) registry.set('anthropic', new AnthropicProvider(key))
  return registry
}
