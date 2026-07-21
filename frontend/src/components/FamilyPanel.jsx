import { useState } from 'react'

export default function FamilyPanel({ members, leaderId, houseCode, onRemoveMember, onMakeLeader, onToggleCanCreate, showToast }) {
  const [email, setEmail] = useState('')
  const inviteLink = `https://noratsapp.com.br/entrar?casa=${houseCode}`
  const inviteMsg = `Entra na nossa casa no No Rats! ${inviteLink}`

  // Abre o WhatsApp direto com a mensagem já preenchida (é só escolher o contato e enviar).
  const inviteWhatsapp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(inviteMsg)}`, '_blank', 'noopener')
  }

  // Abre o app de e-mail com destinatário, assunto e corpo já preenchidos.
  const inviteEmail = () => {
    const to = email.trim()
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      showToast && showToast('✉️ Digite um e-mail válido.')
      return
    }
    const subject = 'Convite pra nossa casa no No Rats'
    const body = `Oi! Entra na nossa casa no No Rats — o jogo das tarefas de casa.\n\nÉ só clicar no link:\n${inviteLink}\n\nOu use o código da casa: ${houseCode}`
    window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    setEmail('')
  }

  return (
    <section className="nr-panel">
      <h2 className="nr-h">👑 Família <span className="nr-hint">(só o líder vê isto)</span></h2>
      <div className="nr-code-box">
        Código da casa: <strong>{houseCode}</strong> <span className="nr-hint">— compartilhe pra família entrar</span>
      </div>
      <div className="nr-row">
        <button className="nr-btn nr-btn-primary" onClick={inviteWhatsapp}>💬 Convidar por WhatsApp</button>
      </div>
      <div className="nr-row" style={{ marginTop: '8px', gap: '8px' }}>
        <input
          className="nr-input"
          style={{ flex: 1, minWidth: 0 }}
          type="email"
          placeholder="E-mail da pessoa"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && inviteEmail()}
        />
        <button className="nr-btn" onClick={inviteEmail}>✉️ Enviar</button>
      </div>
      <div className="nr-hint" style={{ marginTop: '6px' }}>✏️ = pode criar tarefas. Toque para liberar ou bloquear cada pessoa.</div>
      <div className="nr-member-chips">
        {members.map((m) => (
          <div key={m.id} className="nr-member-chip" style={{ borderColor: m.color }}>
            <span>{m.emoji} {m.name} {m.id === leaderId ? '👑' : ''}</span>
            {m.id !== leaderId && (
              <button
                className="nr-mini"
                title={m.canCreate ? `${m.name} pode criar tarefas — tocar para bloquear` : `Permitir que ${m.name} crie tarefas`}
                style={{ opacity: m.canCreate ? 1 : 0.35 }}
                onClick={() => onToggleCanCreate(m.id)}
              >✏️</button>
            )}
            {m.id !== leaderId && <button className="nr-mini" title="Tornar líder" onClick={() => onMakeLeader(m.id)}>👑</button>}
            <button className="nr-mini" title="Remover" onClick={() => onRemoveMember(m.id)}>✕</button>
          </div>
        ))}
      </div>
    </section>
  )
}
