export default function Scoreboard({ members, leaderId, activeId, onSelect }) {
  return (
    <section className="nr-scoreboard">
      {members.map((m) => {
        const isActive = m.id === activeId
        return (
          <button key={m.id} className="nr-player" onClick={() => onSelect(m.id)} style={isActive ? { borderColor: m.color, boxShadow: `0 0 0 3px ${m.color}22` } : undefined}>
            <div className="nr-avatar" style={{ background: m.color }}>{m.emoji}</div>
            <div className="nr-player-name">{m.name} {m.id === leaderId ? '👑' : ''}</div>
            <div className="nr-player-stats">
              <span className="nr-xp-pill">{m.xp} XP</span>
              <span className="nr-rat-pill" style={m.rats > 0 ? { background: '#fee2e2', color: '#ef4444' } : undefined}>🐀 {m.rats}</span>
            </div>
            {isActive && <div className="nr-you">você</div>}
          </button>
        )
      })}
    </section>
  )
}
