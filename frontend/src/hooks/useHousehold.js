import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { COLORS, FREQUENCIES } from '../lib/constants'
import { normalizeData, newCode } from '../lib/household'
import { seedRoutines, getStatus } from '../lib/routines'
import { todayStr } from '../lib/dates'

export function useHousehold(session, showToast) {
  const [loading, setLoading] = useState(true)
  const [householdId, setHouseholdId] = useState(null)
  const [houseCode, setHouseCode] = useState('')
  const [data, setData] = useState(null)
  const skipSave = useRef(false)
  const saveTimer = useRef(null)
  const writeIdRef = useRef(null)

  // Load the household whenever the session changes.
  useEffect(() => {
    if (!session) {
      setData(null)
      setHouseholdId(null)
      setLoading(false)
      return
    }
    setLoading(true)
    ;(async () => {
      const { data: mem } = await supabase.from('memberships').select('household_id').eq('user_id', session.user.id).maybeSingle()
      if (!mem) {
        setHouseholdId(null)
        setData(null)
        setLoading(false)
        return
      }
      const { data: hh } = await supabase.from('households').select('id,code,data').eq('id', mem.household_id).maybeSingle()
      if (hh) {
        setHouseholdId(hh.id)
        setHouseCode(hh.code || '')
        skipSave.current = true
        setData(normalizeData(hh.data))
      }
      setLoading(false)
    })()
  }, [session])

  // Debounced save to the cloud, tagged with a write id so realtime can ignore our own echo.
  useEffect(() => {
    if (!householdId || data == null) return
    if (skipSave.current) {
      skipSave.current = false
      return
    }
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      const wid = Math.random().toString(36).slice(2)
      writeIdRef.current = wid
      supabase.from('households').update({ data: { ...data, _w: wid }, updated_at: new Date().toISOString() }).eq('id', householdId).then(({ error }) => {
        if (error) showToast('⚠️ Não consegui salvar na nuvem')
      })
    }, 700)
  }, [data, householdId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Apply rat penalties for overdue routines when the household is first loaded.
  useEffect(() => {
    if (!householdId) return
    setData((prev) => {
      if (!prev) return prev
      let changed = false
      const members = prev.members.map((m) => ({ ...m }))
      const routines = prev.routines.map((r) => {
        const st = getStatus(r)
        if (st.kind === 'late' && !r.penalized && r.ownerId) {
          const owner = members.find((m) => m.id === r.ownerId)
          if (owner) {
            owner.rats += 1
            changed = true
          }
          return { ...r, penalized: true }
        }
        return r
      })
      return changed ? { ...prev, members, routines } : prev
    })
    // eslint-disable-next-line
  }, [householdId])

  // Live sync: pick up changes made by other members of the household.
  useEffect(() => {
    if (!householdId) return
    const channel = supabase
      .channel('household-' + householdId)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'households', filter: 'id=eq.' + householdId }, (payload) => {
        const nd = payload.new && payload.new.data
        if (!nd) return
        if (nd._w && nd._w === writeIdRef.current) return
        skipSave.current = true
        setData(normalizeData(nd))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [householdId])

  const logout = async () => {
    await supabase.auth.signOut()
    setHouseCode('')
  }

  const createHousehold = async (casaName, myName, myEmoji) => {
    const code = newCode()
    const myId = 'm' + Date.now()
    const initData = {
      members: [{ id: myId, userId: session.user.id, name: myName, emoji: myEmoji, color: COLORS[0], xp: 0, rats: 0 }],
      leaderId: myId,
      routines: seedRoutines(),
      log: [],
    }
    // create_household is a SECURITY DEFINER RPC that inserts the household and the
    // creator's membership atomically, so the client never needs a permissive
    // direct-insert policy on households/memberships.
    const { data: hid, error } = await supabase.rpc('create_household', { house_name: casaName, invite_code: code, init_data: initData })
    if (error) throw new Error('Erro ao criar casa: ' + error.message)
    setHouseholdId(hid)
    setHouseCode(code)
    skipSave.current = true
    setData(initData)
    setLoading(false)
    showToast('🏠 Casa criada! Código: ' + code)
  }

  const joinHousehold = async (code, myName, myEmoji) => {
    const { data: hid, error } = await supabase.rpc('join_household', { invite_code: code })
    if (error) throw new Error('Código inválido ou erro ao entrar.')
    const { data: hh, error: e2 } = await supabase.from('households').select('id,code,data').eq('id', hid).single()
    if (e2) throw new Error('Erro ao carregar a casa.')
    const d = normalizeData(hh.data)
    let myId = (d.members.find((m) => m.userId === session.user.id) || {}).id
    if (!myId) {
      myId = 'm' + Date.now()
      d.members.push({ id: myId, userId: session.user.id, name: myName, emoji: myEmoji, color: COLORS[d.members.length % COLORS.length], xp: 0, rats: 0 })
      await supabase.from('households').update({ data: d }).eq('id', hid)
    }
    setHouseholdId(hid)
    setHouseCode(hh.code || '')
    skipSave.current = true
    setData(d)
    setLoading(false)
    showToast('🏠 Você entrou na casa!')
  }

  const removeMember = (id) => {
    if (data.members.length <= 1) return showToast('Precisa ter ao menos 1 pessoa.')
    setData((p) => {
      const nextMembers = p.members.filter((m) => m.id !== id)
      const nextLeader = p.leaderId === id ? nextMembers[0].id : p.leaderId
      const routines = p.routines.map((r) => (r.ownerId === id ? { ...r, ownerId: null } : r))
      return { ...p, members: nextMembers, leaderId: nextLeader, routines }
    })
  }

  const makeLeader = (id) => {
    setData((p) => ({ ...p, leaderId: id }))
    showToast('👑 Novo líder da família!')
  }

  const addRoutine = ({ title, freq, xp, ownerId }) => {
    const t = (title || '').trim()
    if (!t) return showToast('✏️ Dê um nome para a rotina!')
    setData((p) => ({
      ...p,
      routines: [...p.routines, { id: 'r' + Date.now(), title: t, freq, xp: Number(xp) || FREQUENCIES[freq].xp, ownerId: ownerId || null, lastDone: null, penalized: false }],
    }))
    showToast('✅ Rotina criada!')
  }

  const completeTask = (id, photos) => {
    const today = todayStr()
    const routine = data.routines.find((r) => r.id === id)
    if (!routine) return
    if (routine.lastDone === today) return showToast('✨ Já registrada hoje!')
    const me = data.members.find((m) => m.userId === session.user.id)
    if (!me) return
    const owner = routine.ownerId ? data.members.find((m) => m.id === routine.ownerId) : null
    const entry = { id: 'l' + Date.now(), memberId: me.id, title: routine.title, xp: routine.xp, date: today }
    if (photos) {
      if (photos.before) entry.before = photos.before
      if (photos.after) entry.after = photos.after
    }
    setData((p) => ({
      ...p,
      members: p.members.map((m) => (m.id === me.id ? { ...m, xp: m.xp + routine.xp } : m)),
      routines: p.routines.map((r) => (r.id === id ? { ...r, lastDone: today, penalized: false } : r)),
      log: [...p.log, entry],
    }))
    const photoTag = photos && (photos.before || photos.after) ? ' 📸' : ''
    if (owner && owner.id !== me.id) {
      showToast(`🥷 ${me.name} roubou a tarefa de ${owner.name}! +${routine.xp} XP${photoTag}`)
    } else {
      showToast(`✅ +${routine.xp} XP para ${me.name}${photoTag}`)
    }
  }

  const updateFreq = (id, newFreq) =>
    setData((p) => ({ ...p, routines: p.routines.map((r) => (r.id === id ? { ...r, freq: newFreq } : r)) }))
  const removeRoutine = (id) =>
    setData((p) => ({ ...p, routines: p.routines.filter((r) => r.id !== id) }))

  const me = data && session ? data.members.find((m) => m.userId === session.user.id) : undefined

  return {
    loading,
    householdId,
    houseCode,
    data,
    me,
    createHousehold,
    joinHousehold,
    logout,
    removeMember,
    makeLeader,
    addRoutine,
    completeTask,
    updateFreq,
    removeRoutine,
  }
}
