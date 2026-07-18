import { useState } from 'react'
import { Card, Toggle } from '../components/common'
import { useData } from '../data/DataContext'

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

function LiveSettings() {
  const data = useData()
  const s = data.settings!
  const [key, setKey] = useState('')
  const [tick, setTick] = useState(String(s.ritualTickMinutes))
  const [morning, setMorning] = useState(s.morningReportTime)
  const [budget, setBudget] = useState(String(data.budgetAmount))
  const [saved, setSaved] = useState(false)

  const save = async () => {
    await data.actions.saveSettings({
      ...(key.trim() ? { anthropic_api_key: key.trim() } : {}),
      ritual_tick_minutes: Number(tick) || 60,
      morning_report_time: morning,
      budget_amount: Number(budget.replace(',', '.')) || data.budgetAmount,
    })
    setKey('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div style={{ padding: '26px 30px 48px', maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 18px', fontSize: 21, fontWeight: 700, letterSpacing: '-.02em' }}>Réglages</h1>

      <Card style={{ padding: '16px 18px', marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Workspace</div>
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 10, alignItems: 'center', fontSize: 12.5 }}>
          <span style={{ color: 'var(--text2)' }}>Nom</span>
          <span>{data.workspaceName}</span>
          <span style={{ color: 'var(--text2)' }}>Budget mensuel ($)</span>
          <input value={budget} onChange={(e) => setBudget(e.target.value)} style={{ ...inputStyle, width: 130 }} />
          <span style={{ color: 'var(--text2)' }}>Pause automatique</span>
          <span style={{ color: 'var(--text2)' }}>
            À 100 % de l’enveloppe · les tâches passent en <span style={{ color: '#ff453a', fontWeight: 600 }}>pause budget</span>
          </span>
        </div>
      </Card>

      <Card style={{ padding: '16px 18px', marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Rituels</div>
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 10, alignItems: 'center', fontSize: 12.5 }}>
          <span style={{ color: 'var(--text2)' }}>Ronde managériale</span>
          <span>toutes les <input value={tick} onChange={(e) => setTick(e.target.value)} style={{ ...inputStyle, width: 56, textAlign: 'center' }} /> min <span style={{ color: 'var(--text3)' }}>(si activité ou anomalie — la ronde technique, gratuite, tourne en continu)</span></span>
          <span style={{ color: 'var(--text2)' }}>Rapport du matin</span>
          <input type="time" value={morning} onChange={(e) => setMorning(e.target.value)} style={{ ...inputStyle, width: 110 }} />
        </div>
      </Card>

      <Card style={{ padding: '16px 18px', marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Providers IA</div>
        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>
          Anthropic : {s.anthropicConfigured
            ? <span style={{ color: '#30d158', fontWeight: 600 }}>configuré ✓</span>
            : <span style={{ color: '#ff9f0a', fontWeight: 600 }}>non configuré — l'entreprise tourne sur le provider de démonstration (mock, gratuit)</span>}
        </div>
        <div style={{ display: 'flex', gap: 7 }}>
          <input value={key} onChange={(e) => setKey(e.target.value)} type="password"
            placeholder="Clé API Anthropic (sk-ant-…) — stockée localement" style={{ ...inputStyle, flex: 1 }} />
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>
          M2 : stockage dans la base locale du démon · le trousseau système (Keychain) arrive avec la distribution signée (M5).
        </div>
      </Card>

      <Card style={{ padding: '16px 18px', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>Agents CLI locaux</div>
          <button className="hov-text" onClick={async () => { await data.actions.saveSettings({ redetect_cli: true }) }} style={{
            background: 'none', border: '1px solid var(--border)', borderRadius: 8,
            padding: '4px 10px', color: 'var(--text2)', fontSize: 11.5, cursor: 'pointer',
          }}>Redétecter</button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>
          Détectés automatiquement au démarrage — embauchables comme employés (ils travaillent dans la zone de travail de la tâche, facturés par leur propre abonnement).
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5 }}>
          {(s.cliAgents ?? []).map((a) => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: a.found ? 1 : .55 }}>
              <span>{a.label} <span style={{ color: 'var(--text3)' }}>· commande « {a.bin} »</span></span>
              {a.found
                ? <span style={{ color: '#30d158', fontWeight: 600 }}>✓ {a.version}</span>
                : <span style={{ color: 'var(--text3)' }}>non détecté</span>}
            </div>
          ))}
        </div>
      </Card>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={save} style={{
          background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 9,
          padding: '9px 18px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
        }}>Enregistrer</button>
        {saved && <span style={{ color: '#30d158', fontSize: 12.5, fontWeight: 600 }}>✓ Réglages enregistrés</span>}
      </div>
    </div>
  )
}

export function SettingsScreen() {
  const data = useData()
  if (data.live) return <LiveSettings />

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
