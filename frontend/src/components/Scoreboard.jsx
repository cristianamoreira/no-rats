export default function Scoreboard({ members, leaderId, meId }) {
  return (
    <section className="nr-scoreboard">
      {members.map((m) => {
        const isMe = m.id === meId
        return (
          <div key={m.id} className="nr-player" style={isMe ? { borderColor: m.color, boxShadow: `0 0 0 3px ${m.color}22` } : undefined}>
            <div className="nr-avatar" style={{ background: m.color }}>{m.emoji}</div>
            <div className="nr-player-name">{m.name} {m.id === leaderId ? '👑' : ''}</div>
            <div className="nr-player-stats">
              <span className="nr-xp-pill">{m.xp} XP</span>
              <span className="nr-rat-pill" style={m.rats > 0 ? { background: '#fee2e2', color: '#ef4444' } : undefined}>🐀 {m.rats}</span>
            </div>
            {isMe && <div className="nr-you">você</div>}
          </div>
        )
      })}
    </section>
  )
}
