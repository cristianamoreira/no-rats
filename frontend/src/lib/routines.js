import { FREQUENCIES } from './constants'
import { daysSince } from './dates'

export function getStatus(routine) {
  const freq = FREQUENCIES[routine.freq] || FREQUENCIES.semanal
  const ds = daysSince(routine.lastDone)
  if (ds === null) {
    return { kind: 'none', color: '#94a3b8', label: 'Sem registro', last: 'Nunca registrada', sort: -0.4 }
  }
  let last
  if (ds === 0) last = 'Última vez: hoje'
  else if (ds === 1) last = 'Última vez: ontem'
  else last = `Última vez: há ${ds} dias`
  if (ds < freq.days) {
    const rem = freq.days - ds
    return { kind: 'ok', color: '#10b981', label: 'Em dia', last, sub: `Próxima em ${rem} ${rem === 1 ? 'dia' : 'dias'}`, sort: -(rem) }
  }
  const over = ds - freq.days
  if (over === 0) return { kind: 'due', color: '#f59e0b', label: 'Vence hoje', last, sort: 0 }
  return { kind: 'late', color: '#ef4444', label: `Atrasada há ${over} ${over === 1 ? 'dia' : 'dias'}`, last, sort: over }
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
