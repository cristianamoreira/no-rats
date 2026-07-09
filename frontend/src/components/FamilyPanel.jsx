import { useState } from 'react'
import { EMOJIS } from '../lib/constants'

export default function FamilyPanel({ members, leaderId, houseCode, onAddMember, onRemoveMember, onMakeLeader }) {
  const [pName, setPName] = useState('')
  const [pEmoji, setPEmoji] = useState('🧒')

  const submit = () => {
    onAddMember(pName, pEmoji)
    if (pName.trim()) setPName('')
  }

  return (
    <section className="nr-panel">
      <h2 className="nr-h">👑 Família <span className="nr-hint">(só o líder vê isto)</span></h2>
      <div className="nr-code-box">
        Código da casa: <strong>{houseCode}</strong> <span className="nr-hint">— compartilhe pra família entrar</span>
      </div>
      <div className="nr-row">
        <select className="nr-emoji-select" value={pEmoji} onChange={(e) => setPEmoji(e.target.value)}>
          {EMOJIS.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <input className="nr-input" type="text" placeholder="Adicionar pessoa (ex: filho)…" value={pName} onChange={(e) => setPName(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && submit()} />
        <button className="nr-btn nr-btn-primary" onClick={submit}>Adicionar</button>
      </div>
      <div className="nr-member-chips">
        {members.map((m) => (
          <div key={m.id} className="nr-member-chip" style={{ borderColor: m.color }}>
            <span>{m.emoji} {m.name} {m.id === leaderId ? '👑' : ''}</span>
            {m.id !== leaderId && <button className="nr-mini" title="Tornar líder" onClick={() => onMakeLeader(m.id)}>👑</button>}
            <button className="nr-mini" title="Remover" onClick={() => onRemoveMember(m.id)}>✕</button>
          </div>
        ))}
      </div>
    </section>
  )
}
