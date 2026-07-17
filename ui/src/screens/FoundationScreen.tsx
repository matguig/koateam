import { useState } from 'react'
import { Avatar, Card, SectionLabel } from '../components/common'
import { CEO_PROFILES, initials } from '../data/mock'

function AgencyBubble({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 9, maxWidth: '82%' }}>
      <Avatar color="#8e8e93" init="A&F" size={28} fontSize={9} />
      <div style={{
        background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 12,
        borderTopLeftRadius: 4, padding: '10px 13px', fontSize: 12.5, lineHeight: 1.55,
      }}>{children}</div>
    </div>
  )
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 9, maxWidth: '82%', alignSelf: 'flex-end', flexDirection: 'row-reverse' }}>
      <Avatar color="var(--accent)" init="V" size={28} fontSize={10} />
      <div style={{
        background: 'var(--accent)', color: '#fff', borderRadius: 12, borderTopRightRadius: 4,
        padding: '10px 13px', fontSize: 12.5, lineHeight: 1.55,
      }}>{children}</div>
    </div>
  )
}

export function FoundationScreen() {
  const [picked, setPicked] = useState(0)
  const [signed, setSigned] = useState(false)

  return (
    <div style={{ padding: '26px 30px 48px', maxWidth: 1060, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 21, fontWeight: 700, letterSpacing: '-.02em' }}>Nouveau workspace</h1>
      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 18 }}>
        Étape 2/3 — recrutement du CEO avec le Cabinet Aubert &amp; Fils
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.45fr) 340px', gap: 18, alignItems: 'start' }}>
        <Card style={{ borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <AgencyBubble>
            Bienvenue chez <strong>Aubert &amp; Fils</strong>, cabinet de recrutement de dirigeants virtuels depuis 2024.
            Parlez-nous de votre projet : que doit accomplir cette entreprise ?
          </AgencyBubble>
          <UserBubble>
            Créer et vendre une bibliothèque de presets Lightroom. Objectif : premières ventes sous 6 semaines,
            budget 400 $/mois, providers Anthropic + un modèle local.
          </UserBubble>
          <AgencyBubble>
            Parfait. Avec ce budget, nous conseillons un CEO économe qui délègue aux petits modèles.
            Dernière question : préférez-vous un profil prudent ou offensif sur les dépenses ?
          </AgencyBubble>
          <UserBubble>Prudent, mais qui sait accélérer quand ça compte.</UserBubble>
          <AgencyBubble>
            Voici <strong>3 profils</strong> issus de notre vivier. Les jauges sont ajustables avant signature —
            le caractère se fixe au contrat.
          </AgencyBubble>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 2 }}>
            {CEO_PROFILES.map((c, i) => (
              <div key={c.name} onClick={() => { setPicked(i); setSigned(false) }} style={{
                borderRadius: 12, padding: 13, cursor: 'pointer', background: 'var(--card2)',
                border: picked === i ? '1.5px solid var(--accent)' : '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                  <Avatar color={c.color} init={initials(c.name)} size={32} fontSize={11} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 12.5 }}>{c.name}</div>
                    <div style={{ fontSize: 10.5, color: c.badgeColor, fontWeight: 600 }}>{c.badge}</div>
                  </div>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text2)', lineHeight: 1.45, marginBottom: 10 }}>{c.pitch}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {c.traits.map(([label, v]) => (
                    <div key={label} style={{ fontSize: 10, color: 'var(--text3)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{label}</span><span>{v}</span></div>
                      <input type="range" min={0} max={100} defaultValue={v} style={{ width: '100%', height: 12, margin: 0 }} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card style={{ borderRadius: 14, padding: 18, position: 'sticky', top: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 2 }}>Récapitulatif contractuel</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 14 }}>Workspace « Presets Lightroom »</div>

          <SectionLabel style={{ marginBottom: 5 }}>Mission</SectionLabel>
          <p style={{ margin: '0 0 14px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text2)' }}>
            Concevoir, produire et vendre une bibliothèque de presets Lightroom. Premières ventes sous 6 semaines.
          </p>

          <SectionLabel style={{ marginBottom: 5 }}>Budget</SectionLabel>
          <div style={{ fontSize: 12.5, marginBottom: 14 }}>
            <strong>400,00 $ / mois</strong> <span style={{ color: 'var(--text3)' }}>· pause automatique à 100 %</span>
          </div>

          <SectionLabel style={{ marginBottom: 6 }}>Providers autorisés</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, marginBottom: 14, fontVariantNumeric: 'tabular-nums' }}>
            {[
              ['Sonnet', '3,00 $/Mtok', 'var(--text2)'],
              ['Haiku', '0,80 $/Mtok', 'var(--text2)'],
              ['Fable', '1,60 $/Mtok', 'var(--text2)'],
              ['Qwen 7B (local)', '0,00 $/Mtok', '#30d158'],
            ].map(([name, price, color]) => (
              <div key={name} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{name}</span><span style={{ color }}>{price}</span>
              </div>
            ))}
          </div>

          <SectionLabel style={{ marginBottom: 6 }}>Départements pressentis</SectionLabel>
          <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
            {['Production', 'Marketing'].map((d) => (
              <span key={d} style={{
                background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 14,
                padding: '3px 10px', fontSize: 11.5,
              }}>{d}</span>
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, fontSize: 11.5, color: 'var(--text2)' }}>
              CEO retenu : <strong style={{ color: 'var(--text)' }}>{CEO_PROFILES[picked].name}</strong>
            </div>
            <button onClick={() => setSigned(true)} style={{
              background: signed ? '#30d158' : 'var(--accent)', color: '#fff', border: 'none',
              borderRadius: 9, padding: '9px 16px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
            }}>{signed ? '✓ Contrat signé' : 'Signer le contrat'}</button>
          </div>
        </Card>
      </div>
    </div>
  )
}
