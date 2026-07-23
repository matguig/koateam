import { Avatar } from '../components/common'
import { useData } from '../data/DataContext'
import { fmt, initials } from '../data/mock'
import type { Employee } from '../types'

function MemberCard({ emp, tag, indent, onOpen }: {
  emp: Employee; tag?: 'HEAD' | 'CDD'; indent?: boolean; onOpen: (id: string) => void
}) {
  const tagColor = tag === 'HEAD' ? '#0a84ff' : '#ff6482'
  return (
    <div className="hov-accent" onClick={() => onOpen(emp.id)} style={{
      background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 11,
      padding: '10px 12px', display: 'flex', gap: 10, cursor: 'pointer',
      marginLeft: indent ? 22 : 0,
    }}>
      <Avatar color={emp.color} init={initials(emp.name)} size={32} fontSize={11} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>
          {emp.name}
          {tag && (
            <span style={{
              fontSize: 9.5, fontWeight: 700, borderRadius: 8, padding: '1px 6px',
              color: tagColor, background: `color-mix(in srgb, ${tagColor} 15%, transparent)`,
            }}>{tag}</span>
          )}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text2)' }}>{emp.title}</div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
          {emp.model} · dépensé {fmt(emp.spend)} · {emp.load}
        </div>
      </div>
    </div>
  )
}

export function OrgScreen({ onOpenEmployee }: { onOpenEmployee: (id: string) => void }) {
  const data = useData()
  const all = Object.values(data.employees)
  const actives = all.filter((e) => !e.archived)
  const archived = all.filter((e) => e.archived)
  const ceo = actives.find((e) => e.role === 'ceo')
  const departments = [...new Set(actives.filter((e) => e.department).map((e) => e.department!))]
  const totalSpend = actives.reduce((n, e) => n + e.spend, 0)

  return (
    <div style={{ padding: '26px 30px 48px', maxWidth: 1080, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 21, fontWeight: 700, letterSpacing: '-.02em' }}>Organigramme</h1>
      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 24 }}>
        {actives.length} employés actifs · {departments.length} départements · masse « salariale » du mois : {fmt(totalSpend)}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{
          background: 'var(--card)', border: '1.5px solid var(--accent)', borderRadius: 12,
          padding: '11px 18px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Avatar color="var(--accent)" init="V" size={30} fontSize={11} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Vous</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>Propriétaire · budget {fmt(data.budgetAmount)}/mois</div>
          </div>
        </div>
        <div style={{ width: 1, height: 22, background: 'var(--border)' }} />
        {ceo && (
          <div className="hov-accent" onClick={() => onOpenEmployee(ceo.id)} style={{
            background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12,
            padding: '12px 16px', display: 'flex', gap: 11, cursor: 'pointer', width: 290,
          }}>
            <Avatar color={ceo.color} init={initials(ceo.name)} size={38} fontSize={13} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>
                {ceo.name}{' '}
                <span style={{
                  background: 'color-mix(in srgb, #bf5af2 16%, transparent)', color: '#bf5af2',
                  fontSize: 9.5, fontWeight: 700, borderRadius: 8, padding: '1px 6px', marginLeft: 4,
                }}>CEO</span>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text2)' }}>{ceo.title.split('·').pop()?.trim()}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{ceo.model} · dépensé {fmt(ceo.spend)}</div>
            </div>
          </div>
        )}
        <div style={{ width: 1, height: 22, background: 'var(--border)' }} />
        <div style={{ width: 520, height: 1, background: 'var(--border)' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(departments.length, 1)}, 1fr)`, gap: 24, marginTop: -1 }}>
        {departments.map((dept) => {
          const members = actives.filter((e) => e.department === dept)
          const heads = members.filter((e) => e.role === 'head')
          const specialists = members.filter((e) => e.role === 'specialist')
          const spend = members.reduce((n, e) => n + e.spend, 0)
          return (
            <div key={dept}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 auto' }} />
              </div>
              <div style={{
                background: 'color-mix(in srgb, var(--card) 60%, transparent)',
                border: '1px solid var(--border)', borderRadius: 14, padding: 14,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{dept}</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>{members.length} employés · {fmt(spend)}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {heads.map((e) => <MemberCard key={e.id} emp={e} tag="HEAD" onOpen={onOpenEmployee} />)}
                  {specialists.map((e) => (
                    <MemberCard key={e.id} emp={e} tag={e.contract === 'mission' && e.title.includes('CDD') ? 'CDD' : undefined} indent onOpen={onOpenEmployee} />
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {(archived.length > 0 || !data.live) && (
        <div style={{ marginTop: 28 }}>
          <div style={{
            fontSize: 10.5, color: 'var(--text3)', textTransform: 'uppercase',
            letterSpacing: '.07em', fontWeight: 600, marginBottom: 10,
          }}>Anciens</div>
          {!data.live && (
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 11,
              padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'center', maxWidth: 420, opacity: .55,
            }}>
              <span style={{
                width: 32, height: 32, borderRadius: '50%', background: '#8e8e93', color: '#fff',
                fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center',
                justifyContent: 'center', filter: 'grayscale(1)', flexShrink: 0,
              }}>PG</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 12.5 }}>Paul Girard</div>
                <div style={{ fontSize: 11.5, color: 'var(--text2)' }}>Analyste data · Haiku · 0,80 $/Mtok · dépensé 14,20 $ · archivé le 9 juil.</div>
              </div>
              <button className="hov-text" style={{
                background: 'none', border: '1px solid var(--border)', borderRadius: 8,
                padding: '5px 11px', color: 'var(--text2)', fontSize: 11.5, cursor: 'pointer',
              }}>Réveiller</button>
            </div>
          )}
          {archived.map((e) => (
            <div key={e.id} style={{
              background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 11,
              padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'center', maxWidth: 480, opacity: .55, marginBottom: 6,
            }}>
              <Avatar color="#8e8e93" init={initials(e.name)} size={32} fontSize={11} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 12.5 }}>{e.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {e.title} · dépensé {fmt(e.spend)}{e.missionReport ? ' · rapport de mission archivé' : ''}
                </div>
              </div>
              <button className="hov-text" onClick={() => onOpenEmployee(e.id)} style={{
                background: 'none', border: '1px solid var(--border)', borderRadius: 8,
                padding: '5px 11px', color: 'var(--text2)', fontSize: 11.5, cursor: 'pointer', flexShrink: 0,
              }}>Fiche</button>
              <button className="hov-text" onClick={() => data.actions.wakeEmployee(e.id)} style={{
                background: 'none', border: '1px solid var(--border)', borderRadius: 8,
                padding: '5px 11px', color: 'var(--text2)', fontSize: 11.5, cursor: 'pointer', flexShrink: 0,
              }}>Réveiller</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
