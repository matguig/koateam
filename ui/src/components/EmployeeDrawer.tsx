import { Avatar, SectionLabel, TraitSlider } from './common'
import { EMPLOYEES, PERM_COLORS, TRAIT_LABELS, fmt, initials } from '../data/mock'

const HISTORY: { when: string; what: string; cost: number }[] = [
  { when: 'auj. 09:18', what: 'Intervention sur sous-tâche assignée', cost: 0.14 },
  { when: 'hier 16:40', what: 'Livrable produit et transmis au HEAD', cost: 1.22 },
  { when: '14 juil.', what: 'Délégation reçue, plan de travail établi', cost: 0.36 },
  { when: '11 juil.', what: 'Embauche · brief de poste intégré en mémoire', cost: 0.08 },
]

export function EmployeeDrawer({ empId, onClose }: { empId: string; onClose: () => void }) {
  const emp = EMPLOYEES[empId]
  if (!emp) return null

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 40 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 408, background: 'var(--card)',
        borderLeft: '1px solid var(--border)', zIndex: 41, overflowY: 'auto', padding: 22,
        boxShadow: 'var(--shadow)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13 }}>
          <Avatar color={emp.color} init={initials(emp.name)} size={52} fontSize={18} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-.01em' }}>{emp.name}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text2)' }}>{emp.title}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 7, flexWrap: 'wrap' }}>
              <span style={{
                background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 12,
                padding: '2px 9px', fontSize: 11, fontVariantNumeric: 'tabular-nums',
              }}>{emp.model}</span>
              <span style={{
                background: 'color-mix(in srgb, #30d158 14%, transparent)', color: '#30d158',
                borderRadius: 12, padding: '2px 9px', fontSize: 11, fontWeight: 600,
              }}>En poste</span>
            </div>
          </div>
          <button className="hov-text" onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text3)', fontSize: 17,
            cursor: 'pointer', padding: '2px 6px',
          }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '16px 0' }}>
          <div style={{ background: 'var(--card2)', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ fontSize: 10.5, color: 'var(--text3)' }}>Dépense cumulée</div>
            <div style={{ fontWeight: 700, fontSize: 16, fontVariantNumeric: 'tabular-nums' }}>{fmt(emp.spend)}</div>
          </div>
          <div style={{ background: 'var(--card2)', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ fontSize: 10.5, color: 'var(--text3)' }}>Charge actuelle</div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{emp.load}</div>
          </div>
        </div>

        <SectionLabel>Caractère</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
          {emp.traits.map((v, i) => (
            <TraitSlider key={TRAIT_LABELS[i]} label={TRAIT_LABELS[i]} value={v} />
          ))}
        </div>

        <SectionLabel style={{ marginBottom: 6 }}>Scope du poste</SectionLabel>
        <p style={{ margin: '0 0 18px', fontSize: 12.5, lineHeight: 1.55, color: 'var(--text2)' }}>{emp.scope}</p>

        <SectionLabel>Permissions accordées</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
          {emp.perms.map((p) => {
            const [kind, ...rest] = p.split(':')
            const label = rest.join(':')
            return (
              <div key={p} style={{
                display: 'flex', alignItems: 'center', gap: 9, background: 'var(--card2)',
                border: '1px solid var(--border)', borderRadius: 9, padding: '7px 11px', fontSize: 12,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: PERM_COLORS[kind] ?? '#8e8e93', flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{label}</span>
                <a href="#" onClick={(e) => e.preventDefault()} style={{ fontSize: 11, color: '#ff453a' }}>Révoquer</a>
              </div>
            )
          })}
        </div>

        <SectionLabel>Mémoire</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 18 }}>
          {emp.memory.map((text) => (
            <div key={text} style={{
              background: 'var(--card2)', borderRadius: 8, padding: '7px 11px',
              fontSize: 11.5, color: 'var(--text2)', lineHeight: 1.45,
            }}>{text}</div>
          ))}
        </div>

        <SectionLabel>Historique d’interventions</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {HISTORY.map((h) => (
            <div key={h.when} style={{
              display: 'flex', gap: 10, padding: '7px 0', borderTop: '1px solid var(--border)',
              fontSize: 12, alignItems: 'baseline',
            }}>
              <span style={{ color: 'var(--text3)', width: 66, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{h.when}</span>
              <span style={{ flex: 1, color: 'var(--text2)' }}>{h.what}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt(h.cost)}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
