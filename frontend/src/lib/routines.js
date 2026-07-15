import { FREQUENCIES } from './constants'
import { daysSince } from './dates'

// Quantos dias uma rotina "vale" — suporta os presets e a frequência custom (a cada N dias).
export function freqDays(routine) {
  if (routine.freq === 'custom') return Math.max(1, Math.round(Number(routine.customDays)) || 7)
  return (FREQUENCIES[routine.freq] || FREQUENCIES.semanal).days
}

// Rótulo amigável da frequência.
export function freqLabel(routine) {
  if (routine.freq === 'custom') {
    const n = freqDays(routine)
    return n === 1 ? 'Todo dia' : `A cada ${n} dias`
  }
  return (FREQUENCIES[routine.freq] || FREQUENCIES.semanal).label
}

export function getStatus(routine) {
  const days = freqDays(routine)
  const ds = daysSince(routine.lastDone)
  if (ds === null) {
    return { kind: 'none', color: '#8C93A1', label: 'Sem registro', last: 'Nunca registrada', sort: -0.4 }
  }
  let last
  if (ds === 0) last = 'Última vez: hoje'
  else if (ds === 1) last = 'Última vez: ontem'
  else last = `Última vez: há ${ds} dias`
  if (ds < days) {
    const rem = days - ds
    return { kind: 'ok', color: '#2FA46B', label: 'Em dia', last, sub: `Próxima em ${rem} ${rem === 1 ? 'dia' : 'dias'}`, sort: -(rem) }
  }
  const over = ds - days
  if (over === 0) return { kind: 'due', color: '#F4A72B', label: 'Vence hoje', last, sort: 0 }
  return { kind: 'late', color: '#E5484D', label: `Atrasada há ${over} ${over === 1 ? 'dia' : 'dias'}`, last, sort: over }
}

export function seedRoutines() {
  const starters = [
    { title: 'Lavar a louça', freq: 'diaria' },
    { title: 'Lavar roupa', freq: 'semanal' },
    { title: 'Limpar o banheiro', freq: 'semanal' },
    { title: 'Trocar a roupa de cama', freq: 'quinzenal' },
    { title: 'Faxina geral', freq: 'mensal' },
  ]
  return starters.map((s, i) => ({
    id: 'r' + (Date.now() + i),
    title: s.title,
    freq: s.freq,
    xp: FREQUENCIES[s.freq].xp,
    ownerId: null,
    lastDone: null,
    penalized: false,
  }))
}
