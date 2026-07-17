export const MS = 86400000

export function todayStr() {
  return new Date().toISOString().slice(0, 10)
}
export function addDays(dateStr, n) {
  return new Date(Date.parse(dateStr) + n * MS).toISOString().slice(0, 10)
}
export function daysSince(dateStr) {
  if (!dateStr) return null
  return Math.round((Date.parse(todayStr()) - Date.parse(dateStr)) / MS)
}
export function weekStartOf(dateStr) {
  const day = new Date(dateStr + 'T00:00:00Z').getUTCDay()
  const offset = (day + 6) % 7
  return addDays(dateStr, -offset)
}
export function ddmm(dateStr) {
  return `${dateStr.slice(8, 10)}/${dateStr.slice(5, 7)}`
}
// Horário HH:MM a partir de um timestamp ISO.
export function hm(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch (e) {
    return ''
  }
}
