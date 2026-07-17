import { Avatar, Card, SectionLabel } from '../components/common'

const selectStyle = {
  background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8,
  padding: '7px 10px', color: 'var(--text)', fontSize: 12,
} as const

const EVENTS = [
  {
    kind: 'Délégation · 09:14', cost: '0,09 $', selected: true,
    html: <><strong style={{ color: '#bf5af2' }}>Léa</strong> → <strong style={{ color: '#ff9f0a' }}>Thomas</strong> : « La séquence emails passe en priorité 1. Enveloppe : 8 $ max, deadline demain 18 h. Si le public cible n’est pas clarifié d’ici midi, escalade au propriétaire. »</>,
  },
  {
    kind: 'Délégation · 09:17', cost: '0,05 $',
    html: <><strong style={{ color: '#ff9f0a' }}>Thomas</strong> → <strong style={{ color: '#30d158' }}>Chloé</strong> : « Rédige les 3 premiers emails en te basant sur l’étude concurrence. Ton : direct, pas de jargon. Je te débloque 4,50 $. »</>,
  },
  {
    kind: 'Escalade · 11:58', cost: '0,03 $',
    html: <><strong style={{ color: '#30d158' }}>Chloé</strong> → <strong style={{ color: '#ff9f0a' }}>Thomas</strong> : « Impossible d’écrire l’email 2 sans connaître le public prioritaire. Je mets la sous-tâche en bloquée et je te la remonte. »</>,
  },
  {
    kind: 'Escalade filtrée · 12:02', cost: '0,02 $',
    html: <><strong style={{ color: '#ff9f0a' }}>Thomas</strong> → <strong>Vous</strong> : question transmise à l’inbox — « Quel est le public cible prioritaire ? »</>,
  },
]

const mono = {
  fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11.5, background: 'var(--card2)',
  border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', marginTop: 4,
} as const

export function AuditScreen() {
  return (
    <div style={{ padding: '26px 30px 48px', maxWidth: 1060, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 21, fontWeight: 700, letterSpacing: '-.02em' }}>Audit</h1>
      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>
        1 248 événements ce mois · tout est journalisé, rien ne se perd
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <select style={selectStyle}><option>Employé : tous</option><option>Léa Fontaine</option><option>Thomas Perrin</option><option>Chloé Martin</option><option>Karim Benali</option></select>
        <select style={selectStyle}><option>Tâche : toutes</option><option>Campagne de lancement</option><option>Intégration paiement Stripe</option><option>Landing page produit</option></select>
        <select style={selectStyle}><option>Type : tous</option><option>Conversation</option><option>Raisonnement</option><option>Appel d’outil</option><option>Écriture comptable</option></select>
        <input placeholder="Rechercher dans les traces…" style={{
          flex: 1, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8,
          padding: '7px 11px', color: 'var(--text)', fontSize: 12, outline: 'none',
        }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px minmax(0,1fr)', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {EVENTS.map((ev, i) => (
            <div key={i} className={ev.selected ? undefined : 'hov-border'} style={{
              background: 'var(--card)', borderRadius: 11, padding: '11px 13px', cursor: 'pointer',
              border: ev.selected ? '1px solid var(--accent)' : '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)', marginBottom: 5 }}>
                <span>{ev.kind}</span><span>{ev.cost}</span>
              </div>
              <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>{ev.html}</div>
            </div>
          ))}
        </div>

        <Card style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}>
            <Avatar color="#30d158" init="CM" size={26} fontSize={10} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Trace de raisonnement — Chloé Martin</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>Sous-tâche « Séquence emails » · aujourd’hui 09:18 → 11:58</div>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text2)', fontVariantNumeric: 'tabular-nums' }}>
              12 480 tok in · 3 210 tok out · <strong style={{ color: 'var(--text)' }}>0,14 $</strong>
            </span>
          </div>
          <div style={{
            borderLeft: '2px solid var(--border)', margin: '14px 0 0 12px', paddingLeft: 16,
            display: 'flex', flexDirection: 'column', gap: 12, fontSize: 12.5, lineHeight: 1.55,
          }}>
            <div>
              <SectionLabel style={{ marginBottom: 0 }}>Déclencheur</SectionLabel>
              Message de Thomas Perrin : assignation de la sous-tâche « Séquence emails » avec enveloppe de 4,50 $.
            </div>
            <div>
              <SectionLabel style={{ marginBottom: 0 }}>Réflexion 1</SectionLabel>
              <span style={{ color: 'var(--text2)' }}>« Je dois d’abord relire l’étude concurrence pour aligner le ton. L’email 1 (annonce) ne dépend pas du ciblage, je peux le rédiger tout de suite. »</span>
            </div>
            <div>
              <SectionLabel style={{ marginBottom: 0 }}>Appel d’outil</SectionLabel>
              <div style={mono}>
                lecture_fichier("livrables/etude-concurrence-v3.pdf")<br />
                <span style={{ color: '#30d158' }}>→ OK · 18 pages · résumé chargé en mémoire (2 140 tokens)</span>
              </div>
            </div>
            <div>
              <SectionLabel style={{ marginBottom: 0 }}>Appel d’outil</SectionLabel>
              <div style={mono}>
                ecriture_fichier("livrables/email-1-annonce.md")<br />
                <span style={{ color: '#30d158' }}>→ OK · 412 mots · coût cumulé 0,09 $</span>
              </div>
            </div>
            <div>
              <SectionLabel style={{ marginBottom: 0 }}>Réflexion 2</SectionLabel>
              <span style={{ color: 'var(--text2)' }}>« L’email 2 (bénéfices) exige de choisir entre les 3 segments identifiés dans l’étude. Aucun mandat pour trancher : rigueur avant vitesse. J’escalade à Thomas plutôt que de deviner. »</span>
            </div>
            <div>
              <SectionLabel style={{ marginBottom: 0 }}>Issue</SectionLabel>
              Sous-tâche passée en <span style={{ color: '#ff9f0a', fontWeight: 600 }}>bloquée</span> · question escaladée · 3,15 $ non consommés conservés sur l’enveloppe.
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
