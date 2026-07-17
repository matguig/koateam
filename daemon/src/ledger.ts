// Comptabilité d'engagement minimale (SPEC-V1 §3.3, décisions 16/17/21).
// Persistance JSON pour le spike ; SQLite en M1.

import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

export type EntryType = 'consumption' | 'allocation' | 'release' | 'topup'

export interface LedgerEntry {
  at: string
  type: EntryType
  amount: number
  missionId?: string
  detail?: Record<string, unknown>
}

export class Ledger {
  private entries: LedgerEntry[] = []
  private file: string

  constructor(dataDir: string) {
    this.file = join(dataDir, 'ledger.jsonl')
    mkdirSync(dirname(this.file), { recursive: true })
    if (existsSync(this.file)) {
      this.entries = readFileSync(this.file, 'utf8')
        .split('\n').filter(Boolean).map((l) => JSON.parse(l))
    }
  }

  append(entry: Omit<LedgerEntry, 'at'>): LedgerEntry {
    const full: LedgerEntry = { at: new Date().toISOString(), ...entry }
    this.entries.push(full)
    appendFileSync(this.file, JSON.stringify(full) + '\n')
    return full
  }

  spentOn(missionId: string): number {
    return this.entries
      .filter((e) => e.missionId === missionId && e.type === 'consumption')
      .reduce((n, e) => n + e.amount, 0)
  }

  totals(): Record<EntryType, number> {
    const t: Record<EntryType, number> = { consumption: 0, allocation: 0, release: 0, topup: 0 }
    for (const e of this.entries) t[e.type] += e.amount
    return t
  }

  all(): LedgerEntry[] {
    return this.entries
  }
}
