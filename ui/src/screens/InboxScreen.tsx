import { useState, type ReactNode } from 'react'
import { Avatar, Card } from '../components/common'
import { useData } from '../data/DataContext'
import { initials } from '../data/mock'

function ItemIcon({ bg, children }: { bg: string; children: ReactNode }) {
  return (
    <span style={{
      width: 30, height: 30, borderRadius: 9, background: `color-mix(in srgb, ${bg} 16%, transparent)`,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>{children}</span>
  )
}

const btnPrimary = {
  background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8,
  padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
} as const

const btnGhost = {
  background: 'none', border: '1px solid var(--border)', borderRadius: 8,
  padding: '6px 12px', color: 'var(--text2)', fontSize: 12, cursor: 'pointer',
} as const

const INBOX_ICONS: Record<string, [string, string]> = {
  budget_pause_alert: ['⚠', '#ff453a'],
  deliverable_review: ['✓', '#30d158'],
  question: ['?', '#bf5af2'],
  info: ['ℹ', '#0a84ff'],
}

function LiveInbox() {
  const data = useData()
  return (
    <div style={{ padding: '26px 30px 48px', maxWidth: 780, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 21, fontWeight: 700, letterSpacing: '-.02em' }}>Inbox</h1>
      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 18 }}>
        {data.inbox.length} élément(s) nécessitent votre attention
      </div>
      {data.inbox.length === 0 && (
        <Card style={{ padding: '22px 18px', textAlign: 'center', color: 'var(--text3)', fontSize: 12.5 }}>
          Rien à traiter — l’entreprise travaille. ☕
        </Card>
      )}
      {data.inbox.map((item) => {
        const [icon, color] = INBOX_ICONS[item.type] ?? INBOX_ICONS.info
        const emp = item.employee_id ? data.employees[item.employee_id] : null
        return (
          <Card key={item.id} style={{
            padding: '15px 16px', marginBottom: 10,
            border: item.type === 'budget_pause_alert' ? '1px solid color-mix(in srgb, #ff453a 40%, var(--border))' : undefined,
          }}>
            <div style={{ display: 'flex', gap: 11 }}>
              <span style={{
                width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                background: `color-mix(in srgb, ${color} 16%, transparent)`, color,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14,
              }}>{icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', margin: '3px 0 10px' }}>
                  {emp ? `${emp.name} · ` : ''}{item.body}
                </div>
                <div style={{ display: 'flex', gap: 7 }}>
                  {item.type === 'budget_pause_alert' && item.task_id && (
                    <button style={btnPrimary} onClick={async () => { await data.actions.topupTask(item.task_id!, 0.05); await data.actions.resolveInbox(item.id) }}>Rallonger de 0,05 $</button>
                  )}
                  {item.type === 'deliverable_review' && item.task_id && (
                    <>
                      <button style={btnPrimary} onClick={async () => { await data.actions.archiveTask(item.task_id!); await data.actions.resolveInbox(item.id) }}>Archiver</button>
                      <button style={btnGhost} onClick={async () => { await data.actions.reopenTask(item.task_id!); await data.actions.resolveInbox(item.id) }}>Rouvrir</button>
                    </>
                  )}
                  <button style={btnGhost} onClick={() => data.actions.resolveInbox(item.id)}>Ignorer</button>
                </div>
              </div>
              {emp && <Avatar color={emp.color} init={initials(emp.name)} size={26} fontSize={10} />}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

export function InboxScreen() {
  const data = useData()
  const [perm, setPerm] = useState<'once' | 'always' | 'denied' | null>(null)
  const [answered, setAnswered] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)

  if (data.live) return <LiveInbox />

  const permMsg =
    perm === 'once' ? '✓ Accès shell accordé pour cette exécution — Karim a relancé les tests.'
    : perm === 'always' ? '✓ Accès shell permanent accordé à Karim (révocable depuis sa fiche).'
    : '✕ Accès refusé — Karim cherchera une alternative sans shell.'

  return (
    <div style={{ padding: '26px 30px 48px', maxWidth: 780, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 21, fontWeight: 700, letterSpacing: '-.02em' }}>Inbox</h1>
      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 18 }}>
        3 éléments nécessitent votre attention · triés par urgence
      </div>

      {/* Alerte pause budget */}
      <Card style={{ border: '1px solid color-mix(in srgb, #ff453a 40%, var(--border))', padding: '15px 16px', marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 11 }}>
          <ItemIcon bg="#ff453a">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#ff453a" strokeWidth="1.5" strokeLinecap="round"><path d="M7 1.5L13 12H1z" strokeLinejoin="round" /><path d="M7 5.5v3M7 10.3v.2" /></svg>
          </ItemIcon>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Tâche « Landing page produit » en pause — budget épuisé</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', margin: '3px 0 10px' }}>
              25,00 $ consommés sur 25,00 $ alloués. Julien estime qu’il reste ~2 h de travail (≈ 6,50 $).
            </div>
            <div style={{ display: 'flex', gap: 7 }}>
              <button style={btnPrimary}>Rallonger de 10 $</button>
              <button style={btnGhost}>Réduire le scope</button>
              <button style={{ ...btnGhost, color: '#ff453a' }}>Abandonner</button>
            </div>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>il y a 12 min</span>
        </div>
      </Card>

      {/* Demande de permission */}
      <Card style={{ padding: '15px 16px', marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 11 }}>
          <ItemIcon bg="#ff9f0a">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#ff9f0a" strokeWidth="1.5" strokeLinecap="round"><circle cx="5" cy="5" r="3.2" /><path d="M7.4 7.4L12.5 12.5M10.4 10.4l1.8-1.8" /></svg>
          </ItemIcon>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Karim demande l’accès shell pour lancer les tests</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', margin: '3px 0 10px' }}>
              Tâche « Intégration paiement Stripe » · commande :{' '}
              <code style={{
                fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11, background: 'var(--card2)',
                border: '1px solid var(--border)', borderRadius: 5, padding: '1px 5px',
              }}>npm run test:e2e</code>
            </div>
            {perm === null ? (
              <div style={{ display: 'flex', gap: 7 }}>
                <button style={btnPrimary} onClick={() => setPerm('once')}>Autoriser une fois</button>
                <button style={btnGhost} onClick={() => setPerm('always')}>Toujours autoriser</button>
                <button style={{ ...btnGhost, color: '#ff453a' }} onClick={() => setPerm('denied')}>Refuser</button>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: perm === 'denied' ? '#ff453a' : '#30d158', fontWeight: 600 }}>{permMsg}</div>
            )}
          </div>
          <span style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>il y a 26 min</span>
        </div>
      </Card>

      {/* Question filtrée */}
      <Card style={{ padding: '15px 16px', marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 11 }}>
          <span style={{
            width: 30, height: 30, borderRadius: 9, background: 'color-mix(in srgb, #bf5af2 16%, transparent)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            color: '#bf5af2', fontWeight: 800, fontSize: 15,
          }}>?</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Le HEAD Marketing n’a pas pu répondre : quel est le public cible prioritaire ?</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', margin: '3px 0 10px' }}>
              Remontée par Thomas Perrin · Tâche « Campagne de lancement » · bloque 2 sous-tâches
            </div>
            {!answered ? (
              <div style={{ display: 'flex', gap: 7 }}>
                <input placeholder="Ex. : photographes amateurs, 25-40 ans…" style={{
                  flex: 1, background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 8,
                  padding: '7px 11px', color: 'var(--text)', fontSize: 12.5, outline: 'none',
                }} />
                <button style={{ ...btnPrimary, padding: '6px 13px' }} onClick={() => setAnswered(true)}>Répondre</button>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: '#30d158', fontWeight: 600 }}>
                ✓ Réponse transmise à Thomas — les 2 sous-tâches vont reprendre.
              </div>
            )}
          </div>
          <span style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>il y a 1 h</span>
        </div>
      </Card>

      {/* Livrable à vérifier */}
      <Card style={{ padding: '15px 16px', marginBottom: 10, opacity: .92 }}>
        <div style={{ display: 'flex', gap: 11 }}>
          <ItemIcon bg="#30d158">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="#30d158" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 7l3 3 6-7" /></svg>
          </ItemIcon>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Tâche « Étude concurrence » terminée — livrable à vérifier</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', margin: '3px 0 10px' }}>
              Chloé vous a livré « Étude concurrence v3.pdf » (18 pages) · coût final 22,15 $ · 7,85 $ restitués à l’enveloppe.
            </div>
            <div style={{ display: 'flex', gap: 7 }}>
              <button style={{ ...btnGhost, color: 'var(--text)', fontWeight: 600 }}>Archiver</button>
              <button style={btnGhost}>Rouvrir</button>
            </div>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>hier, 18:42</span>
        </div>
      </Card>

      {/* Rapport du matin */}
      <Card style={{ padding: '15px 16px' }}>
        <div onClick={() => setReportOpen(!reportOpen)} style={{ display: 'flex', gap: 11, cursor: 'pointer', alignItems: 'center' }}>
          <Avatar color="#bf5af2" init="LF" size={30} fontSize={11} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Léa vous a envoyé le rapport du matin ☕</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
              « Bonne nouvelle sur l’étude concurrence, un point de vigilance sur la landing. »
            </div>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>08:00 · {reportOpen ? '▾' : '▸'}</span>
        </div>
        {reportOpen && (
          <div style={{
            borderTop: '1px solid var(--border)', marginTop: 13, paddingTop: 13,
            fontSize: 12.5, lineHeight: 1.6, color: 'var(--text2)',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 12 }}>
              {[
                ['Consommé hier', '18,42 $', 'var(--text)'],
                ['Sous-tâches finies', '3', 'var(--text)'],
                ['Blocages', '1', '#ff9f0a'],
                ['Rythme mensuel', '424 $/mois', 'var(--text)'],
              ].map(([label, value, color]) => (
                <div key={label} style={{ background: 'var(--card2)', borderRadius: 9, padding: '9px 11px' }}>
                  <div style={{ fontSize: 10.5, color: 'var(--text3)' }}>{label}</div>
                  <div style={{ fontWeight: 700, color, fontSize: 15 }}>{value}</div>
                </div>
              ))}
            </div>
            <p style={{ margin: '0 0 8px' }}>
              L’étude concurrence est terminée sous budget (−7,85 $), je recommande d’archiver. La campagne de
              lancement avance bien (4/7), mais la question du public cible bloque la séquence emails de Chloé.
            </p>
            <p style={{ margin: 0 }}>
              ⚠ Au rythme actuel (424 $/mois projetés), nous dépasserons l’enveloppe vers le 26. Je propose de
              basculer les tâches de QA sur le modèle local (0 $) — déjà fait pour Nadia — et de geler
              « Identité de marque » jusqu’au mois prochain.
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}
