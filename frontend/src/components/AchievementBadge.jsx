/**
 * AchievementBadge - Exibe um único achievement desbloqueado
 *
 * Props:
 *   achievement: { id, achievement: {...}, unlocked_at, days_ago, seen }
 *   onDismiss: (id) => void - callback ao descartar notificação
 */
export default function AchievementBadge({ achievement, onDismiss }) {
  const { id, achievement: ach, unlocked_at, days_ago, seen } = achievement

  const handleDismiss = async () => {
    onDismiss?.(id)
  }

  return (
    <div className="achievement-badge">
      <div className="achievement-icon" title={ach.name}>
        {ach.icon}
      </div>

      <div className="achievement-content">
        <h3 className="achievement-name">{ach.name}</h3>
        <p className="achievement-desc">{ach.description}</p>

        <div className="achievement-meta">
          <span className="achievement-category badge-{ach.category}">
            {ach.category}
          </span>

          {ach.reward_xp > 0 && (
            <span className="achievement-xp">+{ach.reward_xp} XP</span>
          )}

          {days_ago !== undefined && (
            <span className="achievement-time">
              {days_ago === 0
                ? 'Agora mesmo'
                : `${days_ago} dia${days_ago !== 1 ? 's' : ''} atrás`}
            </span>
          )}
        </div>
      </div>

      {!seen && (
        <button
          className="achievement-dismiss"
          onClick={handleDismiss}
          title="Descartar"
          aria-label="Descartar notificação"
        >
          ✕
        </button>
      )}

      {seen && (
        <div className="achievement-seen-mark" title="Visto">
          ✓
        </div>
      )}
    </div>
  )
}
