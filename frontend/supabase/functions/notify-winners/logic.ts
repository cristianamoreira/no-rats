export type Member = { id: string; userId: string; name: string; emoji?: string }
export type LogEntry = { memberId: string; date: string; xp: number }
export type Period = 'week' | 'month'

const MS = 86400000

export function addDaysUTC(dateStr: string, n: number): string {
  return new Date(Date.parse(dateStr) + n * MS).toISOString().slice(0, 10)
}

// Segunda como início da semana, base UTC — igual a weekStartOf() do app.
export function weekStartOf(dateStr: string): string {
  const day = new Date(dateStr + 'T00:00:00Z').getUTCDay() // 0=dom
  const offset = (day + 6) % 7
  return addDaysUTC(dateStr, -offset)
}

export function periodWindow(
  period: Period,
  today: string,
): { key: string; label: string; inPeriod: (date: string) => boolean } {
  if (period === 'week') {
    const start = addDaysUTC(weekStartOf(today), -7) // início da semana anterior
    const end = addDaysUTC(start, 6)
    return { key: start, label: 'a semana', inPeriod: (d) => d >= start && d <= end }
  }
  // month: mês anterior a "today"
  const [y, m] = today.split('-').map(Number)
  const prev = new Date(Date.UTC(y, m - 1, 1))
  prev.setUTCMonth(prev.getUTCMonth() - 1)
  const key = prev.toISOString().slice(0, 7) // 'YYYY-MM'
  return { key, label: 'o mês', inPeriod: (d) => d.slice(0, 7) === key }
}

export function computeWinners(
  members: Member[],
  log: LogEntry[],
  inPeriod: (d: string) => boolean,
): { winners: Member[]; maxXp: number } {
  const totals = new Map<string, number>()
  for (const m of members) totals.set(m.id, 0)
  for (const l of log) {
    if (inPeriod(l.date) && totals.has(l.memberId)) {
      totals.set(l.memberId, (totals.get(l.memberId) as number) + (Number(l.xp) || 0))
    }
  }
  let maxXp = 0
  for (const v of totals.values()) if (v > maxXp) maxXp = v
  const winners = maxXp > 0 ? members.filter((m) => totals.get(m.id) === maxXp) : []
  return { winners, maxXp }
}

function label(period: Period): string {
  return period === 'week' ? 'a semana' : 'o mês'
}
export function winnerBodySelf(period: Period): string {
  return `🏆 Você ganhou ${label(period)}!`
}
export function winnerBodyOther(period: Period, name: string): string {
  return `🏆 ${name} ganhou ${label(period)}!`
}
export function ratBody(period: Period): string {
  return period === 'week'
    ? '🐀 Semana sem pontos… o rato venceu!'
    : '🐀 Mês sem pontos… o rato venceu!'
}
