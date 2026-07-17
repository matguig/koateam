import { useState } from 'react'
import { Avatar, BudgetBar, Card, SectionLabel, StatusPill } from '../components/common'
import { EMPLOYEES, STATUS, TASKS, fmt, initials } from '../data/mock'

export function TasksScreen() {
  const [expanded, setExpanded] = useState<string | null>('t2')

  return (
    <div style={{ padding: '26px 30px 48px', maxWidth: 980, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 6 }}>
        <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700, letterSpacing: '-.02em' }}>Tâches</h1>
        <button className="hov-bright" style={{
          background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 9,
          padding: '8px 14px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
        }}>＋ Nouvelle tâche</button>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 18 }}>
        5 tâches · 262,00 $ alloués sur l’enveloppe de 400,00 $
      </div>

      {TASKS.map((t) => {
        const isOpen = expanded === t.id
        const [, statusColor] = STATUS[t.st]
        return (
          <Card key={t.id} style={{ marginBottom: 10, overflow: 'hidden' }}>
            <div className="hov-row" onClick={() => setExpanded(isOpen ? null : t.id)} style={{
              display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 108px 150px 180px',
              gap: 16, alignItems: 'center', padding: '13px 16px', cursor: 'pointer',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                <span style={{ color: 'var(--text3)', fontSize: 10, width: 10 }}>{isOpen ? '▾' : '▸'}</span>
                <span style={{ fontWeight: 600, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</span>
                {t.questions > 0 && (
                  <span style={{
                    background: 'color-mix(in srgb, #bf5af2 16%, transparent)', color: '#bf5af2',
                    fontSize: 10.5, fontWeight: 600, borderRadius: 10, padding: '1px 7px', flexShrink: 0,
                  }}>{t.questions} question</span>
                )}
              </div>
              <span style={{ justifySelf: 'start' }}><StatusPill st={t.st} /></span>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4, fontVariantNumeric: 'tabular-nums' }}>
                  {t.done}/{t.total} sous-tâches
                </div>
                <div style={{ height: 4, borderRadius: 2, background: 'var(--border)' }}>
                  <div style={{ height: 4, borderRadius: 2, background: statusColor, width: `${Math.round((t.done / t.total) * 100)}%` }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text2)', marginBottom: 4, fontVariantNumeric: 'tabular-nums' }}>
                  <span>{fmt(t.spent)}</span>
                  <span style={{ color: 'var(--text3)' }}>/ {fmt(t.alloc)}</span>
                </div>
                <BudgetBar spentPct={Math.round((t.spent / t.alloc) * 100)} engagedPct={Math.round((t.eng / t.alloc) * 100)} />
              </div>
            </div>

            {isOpen && (
              <div style={{
                borderTop: '1px solid var(--border)', background: 'var(--card2)', padding: '18px 18px 20px',
                display: 'grid', gridTemplateColumns: 'minmax(0,1.35fr) minmax(0,1fr)', gap: 26,
              }}>
                <div>
                  <p style={{ margin: '0 0 14px', color: 'var(--text2)', lineHeight: 1.55, fontSize: 12.5 }}>{t.desc}</p>
                  <SectionLabel>Objectifs</SectionLabel>
                  {t.objectives.map(([label, done]) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', fontSize: 12.5 }}>
                      <span style={{
                        width: 15, height: 15, borderRadius: 4,
                        border: `1px solid ${done ? '#30d158' : 'var(--text3)'}`,
                        background: done ? '#30d158' : 'transparent', color: '#fff', fontSize: 10,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>{done ? '✓' : ''}</span>
                      <span style={{ color: done ? 'var(--text3)' : 'var(--text)', textDecoration: done ? 'line-through' : 'none' }}>{label}</span>
                    </div>
                  ))}
                  <div style={{
                    display: 'flex', gap: 9, background: 'color-mix(in srgb, #bf5af2 8%, transparent)',
                    border: '1px solid color-mix(in srgb, #bf5af2 25%, transparent)', borderRadius: 10,
                    padding: '10px 12px', margin: '14px 0',
                  }}>
                    <Avatar color="#bf5af2" init="LF" size={22} fontSize={9} />
                    <div style={{ fontSize: 12, lineHeight: 1.5 }}><strong>Évaluation de Léa</strong> — {t.note}</div>
                  </div>
                  <SectionLabel style={{ margin: '16px 0 8px' }}>Sous-tâches</SectionLabel>
                  {t.tree.map((node, i) => {
                    const e = EMPLOYEES[node.emp]
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: `4.5px 0 4.5px ${node.depth * 24}px`, fontSize: 12.5 }}>
                        <span style={{ color: 'var(--text3)', fontSize: 11 }}>{node.depth ? '└' : ''}</span>
                        <Avatar color={e.color} init={initials(e.name)} size={20} fontSize={8} />
                        <span style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.title}</span>
                        <span style={{ color: 'var(--text3)', fontSize: 11.5, flexShrink: 0 }}>{e.name.split(' ')[0]}</span>
                        <span style={{ marginLeft: 'auto' }}><StatusPill st={node.st} small /></span>
                        <span style={{ width: 52, textAlign: 'right', color: 'var(--text2)', fontSize: 11.5, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                          {node.cost ? fmt(node.cost) : '—'}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <div>
                  <SectionLabel>Livrables</SectionLabel>
                  {t.deliverables.map(([name, meta]) => (
                    <div key={name} style={{
                      display: 'flex', alignItems: 'center', gap: 9, background: 'var(--card)',
                      border: '1px solid var(--border)', borderRadius: 9, padding: '8px 11px',
                      marginBottom: 6, fontSize: 12.5,
                    }}>
                      <svg width="13" height="15" viewBox="0 0 13 15" fill="none" stroke="var(--text3)" strokeWidth="1.3"><path d="M2 1.5h6l3 3v9H2z" /><path d="M8 1.5v3h3" /></svg>
                      <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
                      <span style={{ color: 'var(--text3)', fontSize: 11 }}>{meta}</span>
                    </div>
                  ))}
                  <SectionLabel style={{ margin: '16px 0 8px' }}>Questions &amp; réponses</SectionLabel>
                  {t.qa.map((q, i) => {
                    const isUser = q.emp === 'vous'
                    const color = isUser ? 'var(--accent)' : EMPLOYEES[q.emp].color
                    const init = isUser ? 'V' : initials(EMPLOYEES[q.emp].name)
                    return (
                      <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <Avatar color={color} init={init} size={22} fontSize={9} />
                        <div style={{
                          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10,
                          padding: '8px 11px', fontSize: 12, lineHeight: 1.5, flex: 1,
                        }}>
                          <strong>{q.who}</strong> · <span style={{ color: 'var(--text3)', fontSize: 11 }}>{q.when}</span><br />
                          {q.text}
                        </div>
                      </div>
                    )
                  })}
                  <div style={{ display: 'flex', gap: 7, marginTop: 10 }}>
                    <input placeholder="Répondre à l’équipe…" style={{
                      flex: 1, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 9,
                      padding: '8px 11px', color: 'var(--text)', fontSize: 12.5, outline: 'none',
                    }} />
                    <button style={{
                      background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 9,
                      padding: '0 13px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}>Envoyer</button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
