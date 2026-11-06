import AchievementBadge from './AchievementBadge'

/**
 * AchievementsList - Exibe grade de achievements desbloqueadas do usuário
 *
 * Props:
 *   achievements: Array de UserAchievement
 *   loading: boolean
 *   onDismiss: (id) => void - callback ao descartar notificação
 *   showUnseenOnly: boolean - mostrar apenas não vistos
 */
export default function AchievementsList({
  achievements = [],
  loading = false,
  onDismiss = () => {},
  showUnseenOnly = false,
}) {
  const filtered = showUnseenOnly
    ? achievements.filter((a) => !a.seen)
    : achievements

  if (loading) {
    return (
      <div className="achievements-list loading">
        <div className="achievements-spinner">Carregando achievements...</div>
      </div>
    )
  }

  if (!achievements || achievements.length === 0) {
    return (
      <div className="achievements-list empty">
        <p className="achievements-empty-text">
          Nenhum achievement desbloqueado ainda.
          <br />
          Complete tarefas para desbloquear!
        </p>
      </div>
    )
  }

  if (filtered.length === 0) {
    return (
      <div className="achievements-list empty">
        <p className="achievements-empty-text">
          Você já viu todos os achievements! 👀
        </p>
      </div>
    )
  }

  return (
    <div className="achievements-list">
      <div className="achievements-grid">
        {filtered.map((achievement) => (
          <AchievementBadge
            key={achievement.id}
            achievement={achievement}
            onDismiss={onDismiss}
          />
        ))}
      </div>

      {filtered.length < achievements.length && (
        <p className="achievements-note">
          +{achievements.length - filtered.length} achievements já visto
          {achievements.length - filtered.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
