export default function FamilyPanel({ members, leaderId, houseCode, onRemoveMember, onMakeLeader, showToast }) {
  const inviteLink = `https://noratsapp.com.br/entrar?casa=${houseCode}`
  const invite = async () => {
    const msg = `Entra na nossa casa no No Rats! ${inviteLink}`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'No Rats', text: 'Entra na nossa casa no No Rats!', url: inviteLink })
      } else {
        await navigator.clipboard.writeText(msg)
        showToast && showToast('🔗 Convite copiado!')
      }
    } catch (e) {
      /* usuário cancelou o compartilhamento — sem ação */
    }
  }
  return (
    <section className="nr-panel">
      <h2 className="nr-h">👑 Família <span className="nr-hint">(só o líder vê isto)</span></h2>
      <div className="nr-code-box">
        Código da casa: <strong>{houseCode}</strong> <span className="nr-hint">— compartilhe pra família entrar</span>
      </div>
      <div className="nr-row">
        <button className="nr-btn nr-btn-primary" onClick={invite}>🔗 Convidar</button>
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
