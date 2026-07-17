import type { CSSProperties, ReactNode } from 'react'
import { STATUS } from '../data/mock'
import type { TaskStatus } from '../types'

export function Avatar({ color, init, size = 32, fontSize }: {
  color: string; init: string; size?: number; fontSize?: number
}) {
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%', background: color, color: '#fff',
      fontSize: fontSize ?? Math.round(size * 0.34), fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>{init}</span>
  )
}

export function SectionLabel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{
      fontSize: 10.5, color: 'var(--text3)', textTransform: 'uppercase',
      letterSpacing: '.07em', fontWeight: 600, marginBottom: 8, ...style,
    }}>{children}</div>
  )
}

export function StatusPill({ st, small }: { st: TaskStatus; small?: boolean }) {
  const [label, color] = STATUS[st]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: small ? 4 : 5,
      fontSize: small ? 10 : 11, fontWeight: 600,
      padding: small ? '1.5px 7px' : '2.5px 9px', borderRadius: small ? 12 : 20,
      color, background: `color-mix(in srgb, ${color} 15%, transparent)`, flexShrink: 0,
    }}>
      {!small && <span style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />}
      {label}
    </span>
  )
}

export function Card({ children, style, className }: {
  children: ReactNode; style?: CSSProperties; className?: string
}) {
  return (
    <div className={className} style={{
      background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, ...style,
    }}>{children}</div>
  )
}

/** Barre budget : consommé (plein) + engagé (translucide) */
export function BudgetBar({ spentPct, engagedPct, height = 4 }: {
  spentPct: number; engagedPct: number; height?: number
}) {
  return (
    <div style={{ height, borderRadius: height / 2, background: 'var(--border)', display: 'flex', overflow: 'hidden' }}>
      <span style={{ width: `${Math.min(100, spentPct)}%`, background: 'var(--accent)' }} />
      <span style={{ width: `${engagedPct}%`, background: 'color-mix(in srgb, var(--accent) 40%, transparent)' }} />
    </div>
  )
}

export function TraitSlider({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ fontSize: 11.5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text2)' }}>
        <span>{label}</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      </div>
      <input type="range" min={0} max={100} defaultValue={value} style={{ width: '100%', height: 14, margin: '2px 0 0' }} />
    </div>
  )
}

export function Toggle({ on }: { on: boolean }) {
  return (
    <span style={{
      width: 34, height: 20, borderRadius: 10, position: 'relative', flexShrink: 0,
      background: on ? '#30d158' : 'var(--border)',
    }}>
      <span style={{
        position: 'absolute', top: 2, width: 16, height: 16, borderRadius: '50%', background: '#fff',
        ...(on ? { right: 2 } : { left: 2 }),
      }} />
    </span>
  )
}
