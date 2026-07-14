export default function FamilyPanel({ members, leaderId, houseCode, onRemoveMember, onMakeLeader }) {
  return (
    <section className="nr-panel">
      <h2 className="nr-h">👑 Família <span className="nr-hint">(só o líder vê isto)</span></h2>
      <div className="nr-code-box">
        Código da casa: <strong>{houseCode}</strong> <span className="nr-hint">— compartilhe pra família entrar</span>
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
