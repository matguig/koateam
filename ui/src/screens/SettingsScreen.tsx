import { Card, Toggle } from '../components/common'

const inputStyle = {
  background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 8,
  padding: '7px 11px', color: 'var(--text)', fontSize: 12.5, outline: 'none',
} as const

const PROVIDERS: [string, string, boolean][] = [
  ['Sonnet', '3,00 $/Mtok', true],
  ['Haiku', '0,80 $/Mtok', true],
  ['Fable', '1,60 $/Mtok', true],
  ['Qwen 7B (local)', '0,00 $/Mtok · votre machine', true],
  ['Opus', '15,00 $/Mtok', false],
]

export function SettingsScreen() {
  return (
    <div style={{ padding: '26px 30px 48px', maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 18px', fontSize: 21, fontWeight: 700, letterSpacing: '-.02em' }}>Réglages</h1>

      <Card style={{ padding: '16px 18px', marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Workspace</div>
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 10, alignItems: 'center', fontSize: 12.5 }}>
          <span style={{ color: 'var(--text2)' }}>Nom</span>
          <input defaultValue="Lancement SaaS Photo" style={inputStyle} />
          <span style={{ color: 'var(--text2)' }}>Budget mensuel</span>
          <input defaultValue="400,00 $" style={{ ...inputStyle, width: 130 }} />
          <span style={{ color: 'var(--text2)' }}>Pause automatique</span>
          <span style={{ color: 'var(--text2)' }}>
            À 100 % de l’enveloppe · les tâches passent en <span style={{ color: '#ff453a', fontWeight: 600 }}>pause budget</span>
          </span>
        </div>
      </Card>

      <Card style={{ padding: '16px 18px', marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Providers IA autorisés</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>
          {PROVIDERS.map(([name, price, on]) => (
            <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: on ? 1 : .55 }}>
              <span>{name} <span style={{ color: 'var(--text3)' }}>· {price}</span></span>
              <Toggle on={on} />
            </div>
          ))}
        </div>
      </Card>

      <Card style={{ border: '1px solid color-mix(in srgb, #ff453a 35%, var(--border))', padding: '16px 18px' }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: '#ff453a' }}>Zone sensible</div>
        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>
          Dissoudre l’entreprise archive tous les employés et gèle la comptabilité. Les traces d’audit restent consultables.
        </div>
        <button style={{
          background: 'none', border: '1px solid #ff453a', borderRadius: 8,
          padding: '7px 13px', color: '#ff453a', fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}>Dissoudre l’entreprise…</button>
      </Card>
    </div>
  )
}
