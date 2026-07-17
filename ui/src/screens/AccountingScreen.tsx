import { Card, SectionLabel } from '../components/common'
import { BURN_VALUES, EMP_SPEND, JOURNAL, MODEL_SPEND, fmt } from '../data/mock'

function DistributionBars({ rows, max }: { rows: [string, number, string][]; max: number }) {
  return (
    <>
      {rows.map(([name, value, color]) => (
        <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 11.5 }}>
          <span style={{ width: 76, color: 'var(--text2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
          <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--border)' }}>
            <div style={{ height: 6, borderRadius: 3, background: color, width: `${Math.round((value / max) * 100)}%` }} />
          </div>
          <span style={{ width: 48, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text2)' }}>{fmt(value)}</span>
        </div>
      ))}
    </>
  )
}

export function AccountingScreen() {
  return (
    <div style={{ padding: '26px 30px 48px', maxWidth: 1020, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 21, fontWeight: 700, letterSpacing: '-.02em' }}>Comptabilité</h1>
      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 18 }}>
        Juillet 2026 · enveloppe 400,00 $ · chaque cent est tracé
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 14 }}>
        {[
          ['Consommé', '240,00 $', 'var(--text)', '60 % de l’enveloppe · J17/31'],
          ['Engagé', '85,00 $', '#ff9f0a', 'réservé sur 3 tâches en cours'],
          ['Disponible', '75,00 $', '#30d158', 'projection fin de mois : −24 $ ⚠'],
        ].map(([label, value, color, sub]) => (
          <Card key={label} style={{ padding: '16px 18px' }}>
            <SectionLabel style={{ marginBottom: 0, fontSize: 11 }}>{label}</SectionLabel>
            <div style={{ fontSize: 27, fontWeight: 700, letterSpacing: '-.02em', marginTop: 4, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text2)', marginTop: 2 }}>{sub}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 12, marginBottom: 14 }}>
        <Card style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Burn-down du mois</span>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>budget restant, par jour</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 110 }}>
            {BURN_VALUES.map((v, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: '100%', borderRadius: '3px 3px 0 0',
                  background: i === BURN_VALUES.length - 1 ? 'var(--accent)' : 'color-mix(in srgb, var(--accent) 45%, transparent)',
                  height: Math.round((v / 400) * 100),
                }} />
                <span style={{ fontSize: 9, color: 'var(--text3)' }}>{i + 1}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card style={{ padding: '16px 18px' }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Répartition</div>
          <SectionLabel style={{ marginBottom: 7 }}>Par employé</SectionLabel>
          <DistributionBars rows={EMP_SPEND} max={50.94} />
          <SectionLabel style={{ margin: '12px 0 7px' }}>Par modèle</SectionLabel>
          <DistributionBars rows={MODEL_SPEND} max={185.24} />
        </Card>
      </div>

      <Card style={{ padding: '6px 0' }}>
        <div style={{ fontWeight: 700, fontSize: 13, padding: '12px 18px 8px' }}>Journal des écritures</div>
        {JOURNAL.map((j, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '90px 110px minmax(0,1fr) 90px 90px',
            gap: 12, alignItems: 'center', padding: '8px 18px',
            borderTop: '1px solid var(--border)', fontSize: 12,
          }}>
            <span style={{ color: 'var(--text3)', fontVariantNumeric: 'tabular-nums' }}>{j.date}</span>
            <span style={{
              justifySelf: 'start', fontSize: 10.5, fontWeight: 700, borderRadius: 10, padding: '2px 8px',
              color: j.color, background: `color-mix(in srgb, ${j.color} 15%, transparent)`,
            }}>{j.type}</span>
            <span style={{ color: 'var(--text2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.label}</span>
            <span style={{
              textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums',
              color: j.amount.startsWith('+') ? '#30d158' : j.amount ? 'var(--text)' : 'var(--text3)',
            }}>{j.amount}</span>
            <span style={{ textAlign: 'right', color: 'var(--text3)', fontVariantNumeric: 'tabular-nums' }}>{j.solde}</span>
          </div>
        ))}
      </Card>
    </div>
  )
}
