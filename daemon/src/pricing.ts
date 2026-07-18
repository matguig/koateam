// Table de tarifs embarquée (SPEC-V1 §3.2 / décision 24).
// Overridable par l'utilisateur dans la V1 ; suffisante pour le spike.

export interface ModelPrice {
  provider: string
  model: string
  /** $ par million de tokens */
  inputPerMtok: number
  outputPerMtok: number
}

export const PRICING: ModelPrice[] = [
  { provider: 'anthropic', model: 'claude-sonnet-5', inputPerMtok: 3.0, outputPerMtok: 15.0 },
  { provider: 'anthropic', model: 'claude-haiku-4-5-20251001', inputPerMtok: 0.8, outputPerMtok: 4.0 },
  // Provider factice pour le spike et la CI : tarifé comme un petit modèle,
  // pour que la comptabilité et les budgets soient exercés pour de vrai.
  { provider: 'mock', model: 'mock-fast', inputPerMtok: 0.8, outputPerMtok: 4.0 },
  { provider: 'local', model: 'local-free', inputPerMtok: 0, outputPerMtok: 0 },
  // Agents CLI locaux (Claude Code, Codex) : le coût n'est pas tarifé au token
  // par KoaTeam — il est rapporté par la CLI elle-même et imputé tel quel.
  { provider: 'cli', model: 'claude-code', inputPerMtok: 0, outputPerMtok: 0 },
  { provider: 'cli', model: 'codex', inputPerMtok: 0, outputPerMtok: 0 },
]

export function priceOf(model: string): ModelPrice {
  const p = PRICING.find((p) => p.model === model)
  if (!p) throw new Error(`modèle inconnu de la table de tarifs : ${model}`)
  return p
}

export function costOf(model: string, inputTokens: number, outputTokens: number): number {
  const p = priceOf(model)
  return (inputTokens * p.inputPerMtok + outputTokens * p.outputPerMtok) / 1_000_000
}
