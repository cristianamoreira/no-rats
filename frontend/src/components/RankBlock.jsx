import { MEDALS } from '../lib/constants'

export default function RankBlock({ title, subtitle, rows }) {
  const hasPts = rows.some((r) => r.pts > 0)
  return (
    <div className="nr-panel" style={{ marginBottom: '18px' }}>
      <div className="nr-rank-head">
        <h2 className="nr-h" style={{ margin: 0 }}>{title}</h2>
        <span className="nr-hint">{subtitle}</span>
      </div>
      {!hasPts ? (
        <div className="nr-week-empty" style={{ padding: '8px 0' }}>Ninguém pontuou ainda neste período.</div>
      ) : (
        rows.map((r, i) => (
          <div className="nr-rank-row" key={r.m.id}>
            <span className="nr-rank-pos">{MEDALS[i] || `${i + 1}º`}</span>
            <div className="nr-avatar nr-avatar-sm" style={{ background: r.m.color }}>{r.m.emoji}</div>
            <span className="nr-rank-name">{r.m.name}</span>
            <span className="nr-rank-pts">{r.pts} XP</span>
          </div>
        ))
      )}
    </div>
  )
}
