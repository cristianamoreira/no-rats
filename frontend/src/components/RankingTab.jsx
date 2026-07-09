import { todayStr, addDays, weekStartOf, ddmm } from '../lib/dates'
import RankBlock from './RankBlock'

export default function RankingTab({ members, log }) {
  const today = todayStr()
  const wkStart = weekStartOf(today)
  const wkEnd = addDays(wkStart, 6)
  const monthCur = today.slice(0, 7)
  const sumPts = (filterFn) =>
    members.map((m) => ({ m, pts: log.filter((l) => l.memberId === m.id && filterFn(l.date)).reduce((a, l) => a + l.xp, 0) })).sort((a, b) => b.pts - a.pts)
  const weekRank = sumPts((d) => d >= wkStart && d <= wkEnd)
  const monthRank = sumPts((d) => d.slice(0, 7) === monthCur)

  return (
    <section>
      <RankBlock title="🏆 Ranking da semana" subtitle={`${ddmm(wkStart)} – ${ddmm(wkEnd)}`} rows={weekRank} />
      <RankBlock title="📅 Ranking do mês" subtitle={monthCur.slice(5, 7) + '/' + monthCur.slice(0, 4)} rows={monthRank} />
    </section>
  )
}
