export function normalizeData(d) {
  const safe = d && typeof d === 'object' ? d : {}
  return {
    members: Array.isArray(safe.members) ? safe.members : [],
    leaderId: safe.leaderId || (Array.isArray(safe.members) && safe.members[0] ? safe.members[0].id : null),
    routines: Array.isArray(safe.routines) ? safe.routines : [],
    log: Array.isArray(safe.log) ? safe.log : [],
  }
}

export function newCode() {
  return Math.random().toString(36).slice(2, 7).toUpperCase()
}
