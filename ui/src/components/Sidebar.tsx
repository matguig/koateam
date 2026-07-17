import { Avatar } from './common'
import type { Screen } from '../types'

const NAV: { key: Screen; label: string; icon: JSX.Element; badge?: number }[] = [
  {
    key: 'taches', label: 'Tâches',
    icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M2.5 4h10M2.5 7.5h10M2.5 11h6.5" /></svg>,
  },
  {
    key: 'org', label: 'Organigramme',
    icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="7.5" cy="3.2" r="1.9" /><circle cx="3.4" cy="11.8" r="1.9" /><circle cx="11.6" cy="11.8" r="1.9" /><path d="M7.5 5.1v2.4M7.5 7.5l-3.2 2.6M7.5 7.5l3.2 2.6" /></svg>,
  },
  {
    key: 'inbox', label: 'Inbox', badge: 3,
    icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"><path d="M2 8.5l2.2-5h6.6L13 8.5V12H2z" /><path d="M2 8.5h3.3l1 1.6h2.4l1-1.6H13" /></svg>,
  },
  {
    key: 'audit', label: 'Audit',
    icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="6.5" cy="6.5" r="4" /><path d="M9.6 9.6L13 13" /></svg>,
  },
  {
    key: 'compta', label: 'Comptabilité',
    icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M3 12.5V8M7.5 12.5v-9M12 12.5V6" /></svg>,
  },
  {
    key: 'reglages', label: 'Réglages',
    icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><circle cx="7.5" cy="7.5" r="2.6" /><path d="M7.5 1.4v2M7.5 11.6v2M1.4 7.5h2M11.6 7.5h2M3.2 3.2l1.4 1.4M10.4 10.4l1.4 1.4M11.8 3.2l-1.4 1.4M4.6 10.4l-1.4 1.4" /></svg>,
  },
]

export function Sidebar({ tab, theme, onNavigate, onToggleTheme, onOpenCeo }: {
  tab: Screen
  theme: 'dark' | 'light'
  onNavigate: (s: Screen) => void
  onToggleTheme: () => void
  onOpenCeo: () => void
}) {
  return (
    <aside style={{
      width: 238, flexShrink: 0, background: 'var(--side)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', padding: '14px 12px 12px',
    }}>
      <div style={{ display: 'flex', gap: 7, padding: '2px 4px 0' }}>
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#ff5f57' }} />
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#febc2e' }} />
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#28c840' }} />
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 12, margin: '16px 0 6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#30d158', animation: 'kpulse 2.4s infinite' }} />
          <span style={{ fontWeight: 700, fontSize: 13 }}>Lancement SaaS Photo</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', margin: '3px 0 10px' }}>Workspace actif · 9 employés</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text2)', marginBottom: 5 }}>
          <span>Budget du mois</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}><strong style={{ color: 'var(--text)' }}>240 $</strong> / 400 $</span>
        </div>
        <div style={{ height: 5, borderRadius: 3, background: 'var(--border)', overflow: 'hidden', display: 'flex' }}>
          <span style={{ width: '60%', background: 'var(--accent)' }} />
          <span style={{ width: '21%', background: 'color-mix(in srgb, var(--accent) 40%, transparent)' }} />
        </div>
      </div>

      <button className="hov-link" onClick={() => onNavigate('fondation')} style={{
        display: 'flex', alignItems: 'center', gap: 8, background: 'none',
        border: '1px dashed var(--border)', borderRadius: 10, padding: '8px 12px',
        color: 'var(--text3)', fontSize: 12, cursor: 'pointer', marginBottom: 14,
      }}>
        <span style={{ fontSize: 14, lineHeight: 1 }}>＋</span> Nouveau workspace
      </button>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(({ key, label, icon, badge }) => {
          const on = tab === key
          return (
            <div key={key} onClick={() => onNavigate(key)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px',
              borderRadius: 8, cursor: 'pointer', fontWeight: 500,
              background: on ? 'var(--card)' : 'transparent',
              color: on ? 'var(--text)' : 'var(--text2)',
            }}>
              {icon}{label}
              {badge != null && (
                <span style={{ marginLeft: 'auto', background: '#ff453a', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 9, padding: '1px 6px' }}>{badge}</span>
              )}
            </div>
          )
        })}
      </nav>

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px 10px' }}>
        <span style={{ fontSize: 11, color: 'var(--text3)' }}>Apparence</span>
        <button className="hov-text" onClick={onToggleTheme} style={{
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14,
          padding: '3px 10px', color: 'var(--text2)', fontSize: 11, cursor: 'pointer',
        }}>{theme === 'dark' ? '☾ Sombre' : '☀ Clair'}</button>
      </div>

      <div className="hov-accent" onClick={onOpenCeo} style={{
        display: 'flex', alignItems: 'center', gap: 10, background: 'var(--card)',
        border: '1px solid var(--border)', borderRadius: 12, padding: 10, cursor: 'pointer',
      }}>
        <Avatar color="#bf5af2" init="LF" size={32} fontSize={12} />
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 12, fontWeight: 600 }}>Léa Fontaine · CEO</span>
          <span style={{ display: 'block', fontSize: 11, color: 'var(--accent)' }}>Rapport du matin →</span>
        </span>
      </div>
    </aside>
  )
}
