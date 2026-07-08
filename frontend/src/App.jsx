import { useState, useEffect } from 'react'

const FREQUENCIES = {
  diaria: { label: 'Diária', days: 1, xp: 5 },
  semanal: { label: 'Semanal', days: 7, xp: 15 },
  quinzenal: { label: 'Quinzenal', days: 15, xp: 25 },
  mensal: { label: 'Mensal', days: 30, xp: 40 },
}

const COLORS = ['#4f46e5', '#0ea5e9', '#f59e0b', '#ec4899', '#10b981', '#8b5cf6']
const EMOJIS = ['👩', '👨', '🧒', '👧', '👦', '🧑', '👵', '👴', '🐱', '🐶']
const WD_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const MEDALS = ['🥇', '🥈', '🥉']

const SUGGESTIONS = [
  { title: 'Tirar o lixo', freq: 'diaria' },
  { title: 'Regar as plantas', freq: 'semanal' },
  { title: 'Passar pano no chão', freq: 'semanal' },
  { title: 'Aspirar a casa', freq: 'semanal' },
  { title: 'Trocar as toalhas', freq: 'semanal' },
  { title: 'Limpar a geladeira', freq: 'mensal' },
]

const MS = 86400000

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}
function addDays(dateStr, n) {
  return new Date(Date.parse(dateStr) + n * MS).toISOString().slice(0, 10)
}
function daysSince(dateStr) {
  if (!dateStr) return null
  return Math.round((Date.parse(todayStr()) - Date.parse(dateStr)) / MS)
}
function weekStartOf(dateStr) {
  const day = new Date(dateStr + 'T00:00:00Z').getUTCDay()
  const offset = (day + 6) % 7
  return addDays(dateStr, -offset)
}
function ddmm(dateStr) {
  return `${dateStr.slice(8, 10)}/${dateStr.slice(5, 7)}`
}

function compressImage(file, cb) {
  const reader = new FileReader()
  reader.onload = (ev) => {
    const img = new Image()
    img.onload = () => {
      const max = 500
      let w = img.width
      let h = img.height
      if (w > h && w > max) {
        h = Math.round((h * max) / w)
        w = max
      } else if (h >= w && h > max) {
        w = Math.round((w * max) / h)
        h = max
      }
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      c.getContext('2d').drawImage(img, 0, 0, w, h)
      cb(c.toDataURL('image/jpeg', 0.6))
    }
    img.src = ev.target.result
  }
  reader.readAsDataURL(file)
}

function getStatus(routine) {
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

function RatLogo() {
  return (
    <svg viewBox="0 0 96 96" aria-hidden="true">
      <path d="M63 70 C 80 73 84 56 73 52 C 67 49.5 63 56 67 60" fill="none" stroke="#9ca7b8" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M15 82 L33 82 L28 96 L20 96 Z" fill="#f0b24a" />
      <path d="M20 82 L18 96 M24 82 L24 96 M28 82 L30 96" stroke="#d98b2b" strokeWidth="1.3" />
      <path d="M14 82 L34 82" stroke="#c1873f" strokeWidth="3" strokeLinecap="round" />
      <line x1="24" y1="82" x2="44" y2="44" stroke="#c1873f" strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="48" cy="66" rx="17" ry="15" fill="#9ca7b8" />
      <ellipse cx="48" cy="69" rx="9.5" ry="10.5" fill="#cbd3df" />
      <ellipse cx="40" cy="82" rx="5" ry="3.5" fill="#9ca7b8" />
      <ellipse cx="56" cy="82" rx="5" ry="3.5" fill="#9ca7b8" />
      <path d="M44 62 C 40 56 40 50 43 46" fill="none" stroke="#9ca7b8" strokeWidth="7" strokeLinecap="round" />
      <circle cx="43" cy="45" r="5" fill="#aab3c1" />
      <circle cx="33" cy="24" r="9" fill="#9ca7b8" />
      <circle cx="65" cy="24" r="9" fill="#9ca7b8" />
      <circle cx="33" cy="24" r="4.5" fill="#f4a9c7" />
      <circle cx="65" cy="24" r="4.5" fill="#f4a9c7" />
      <circle cx="49" cy="40" r="20" fill="#9ca7b8" />
      <ellipse cx="49" cy="47" rx="11" ry="8" fill="#cbd3df" />
      <circle cx="42" cy="38" r="3.2" fill="#2b3547" />
      <circle cx="56" cy="38" r="3.2" fill="#2b3547" />
      <circle cx="43" cy="37" r="1" fill="#fff" />
      <circle cx="57" cy="37" r="1" fill="#fff" />
      <circle cx="49" cy="45" r="3" fill="#ef6aa0" />
      <path d="M38 46 H 26 M38 49 H 28 M60 46 H 72 M60 49 H 70" stroke="#b8c0cc" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function defaultState() {
  const members = [
    { id: 'm1', name: 'Ana', emoji: '👩', color: COLORS[0], xp: 0, rats: 0 },
    { id: 'm2', name: 'João', emoji: '👨', color: COLORS[1], xp: 0, rats: 0 },
  ]
  const starters = [
    { title: 'Lavar a louça', freq: 'diaria', ownerId: 'm2' },
    { title: 'Lavar roupa', freq: 'semanal', ownerId: 'm1' },
    { title: 'Limpar o banheiro', freq: 'semanal', ownerId: 'm2' },
    { title: 'Trocar a roupa de cama', freq: 'quinzenal', ownerId: 'm1' },
    { title: 'Faxina geral', freq: 'mensal', ownerId: 'm2' },
  ]
  const routines = starters.map((s, i) => ({
    id: 'r' + (Date.now() + i),
    title: s.title,
    freq: s.freq,
    xp: FREQUENCIES[s.freq].xp,
    ownerId: s.ownerId,
    lastDone: null,
    penalized: false,
  }))
  return { members, leaderId: 'm1', activeId: 'm1', routines, log: [] }
}

function loadState() {
  try {
    const raw = localStorage.getItem('norats_v2')
    if (raw) {
      const s = JSON.parse(raw)
      if (Array.isArray(s.members) && Array.isArray(s.routines)) {
        if (!Array.isArray(s.log)) s.log = []
        return s
      }
    }
  } catch (e) {}
  return defaultState()
}

export default function App() {
  const [state, setState] = useState(loadState)
  const [toast, setToast] = useState(null)
  const [tab, setTab] = useState('hoje')
  const [weekOffset, setWeekOffset] = useState(0)
  const [selDay, setSelDay] = useState(todayStr())
  const [modalRoutine, setModalRoutine] = useState(null)
  const [lightbox, setLightbox] = useState(null)

  const [rTitle, setRTitle] = useState('')
  const [rFreq, setRFreq] = useState('semanal')
  const [rXp, setRXp] = useState(15)
  const [rOwner, setROwner] = useState('')

  const [pName, setPName] = useState('')
  const [pEmoji, setPEmoji] = useState('🧒')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2600)
  }

  useEffect(() => {
    try {
      localStorage.setItem('norats_v2', JSON.stringify(state))
    } catch (e) {
      showToast('⚠️ Armazenamento cheio — apague alguns check-ins com foto')
    }
  }, [state])

  useEffect(() => {
    setState((prev) => {
      let changed = false
      const members = prev.members.map((m) => ({ ...m }))
      const routines = prev.routines.map((r) => {
        const st = getStatus(r)
        if (st.kind === 'late' && !r.penalized) {
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
  }, [])

  const { members, leaderId, activeId, routines, log } = state
  const active = members.find((m) => m.id === activeId) || members[0]
  const isLeader = active && active.id === leaderId

  const setActive = (id) => setState((p) => ({ ...p, activeId: id }))
  const setFreqForm = (key) => {
    setRFreq(key)
    setRXp(FREQUENCIES[key].xp)
  }
  const useSuggestion = (sug) => {
    setRTitle(sug.title)
    setFreqForm(sug.freq)
  }

  const addMember = () => {
    if (!pName.trim()) return showToast('✏️ Digite o nome!')
    const id = 'm' + Date.now()
    const color = COLORS[members.length % COLORS.length]
    setState((p) => ({ ...p, members: [...p.members, { id, name: pName.trim(), emoji: pEmoji, color, xp: 0, rats: 0 }] }))
    setPName('')
    showToast(`👋 ${pName.trim()} entrou na família!`)
  }

  const removeMember = (id) => {
    if (members.length <= 1) return showToast('Precisa ter ao menos 1 pessoa.')
    setState((p) => {
      const nextMembers = p.members.filter((m) => m.id !== id)
      const nextLeader = p.leaderId === id ? nextMembers[0].id : p.leaderId
      const nextActive = p.activeId === id ? nextMembers[0].id : p.activeId
      const routines = p.routines.map((r) => (r.ownerId === id ? { ...r, ownerId: nextLeader } : r))
      return { ...p, members: nextMembers, leaderId: nextLeader, activeId: nextActive, routines }
    })
  }

  const makeLeader = (id) => {
    setState((p) => ({ ...p, leaderId: id }))
    showToast('👑 Novo líder da família!')
  }

  const addRoutine = () => {
    if (!rTitle.trim()) return showToast('✏️ Dê um nome para a rotina!')
    const owner = rOwner || leaderId
    setState((p) => ({
      ...p,
      routines: [
        ...p.routines,
        { id: 'r' + Date.now(), title: rTitle.trim(), freq: rFreq, xp: Number(rXp) || FREQUENCIES[rFreq].xp, ownerId: owner, lastDone: null, penalized: false },
      ],
    }))
    setRTitle('')
    showToast('✅ Rotina criada!')
  }

  const completeTask = (id, creditId, photos) => {
    const today = todayStr()
    const routine = routines.find((r) => r.id === id)
    if (!routine) return
    if (routine.lastDone === today) return showToast('✨ Já registrada hoje!')
    const owner = members.find((m) => m.id === routine.ownerId)
    const cid = creditId || routine.ownerId
    const credit = members.find((m) => m.id === cid)
    const entry = { id: 'l' + Date.now(), memberId: cid, title: routine.title, xp: routine.xp, date: today }
    if (photos) {
      if (photos.before) entry.before = photos.before
      if (photos.after) entry.after = photos.after
    }
    setState((p) => ({
      ...p,
      members: p.members.map((m) => (m.id === cid ? { ...m, xp: m.xp + routine.xp } : m)),
      routines: p.routines.map((r) => (r.id === id ? { ...r, lastDone: today, penalized: false } : r)),
      log: [...p.log, entry],
    }))
    const photoTag = photos && (photos.before || photos.after) ? ' 📸' : ''
    if (owner && cid !== owner.id) {
      showToast(`🥷 ${credit.name} roubou a tarefa de ${owner.name}! +${routine.xp} XP${photoTag}`)
    } else {
      showToast(`✅ +${routine.xp} XP para ${credit ? credit.name : 'a casa'}${photoTag}`)
    }
  }

  const updateFreq = (id, newFreq) =>
    setState((p) => ({ ...p, routines: p.routines.map((r) => (r.id === id ? { ...r, freq: newFreq } : r)) }))
  const removeRoutine = (id) =>
    setState((p) => ({ ...p, routines: p.routines.filter((r) => r.id !== id) }))
  const memberById = (id) => members.find((m) => m.id === id)

  const withStatus = routines.map((r) => ({ ...r, status: getStatus(r) }))
  withStatus.sort((a, b) => b.status.sort - a.status.sort)

  const today = todayStr()
  const wkStart = weekStartOf(today)
  const wkEnd = addDays(wkStart, 6)
  const monthCur = today.slice(0, 7)
  const sumPts = (filterFn) =>
    members
      .map((m) => ({ m, pts: log.filter((l) => l.memberId === m.id && filterFn(l.date)).reduce((a, l) => a + l.xp, 0) }))
      .sort((a, b) => b.pts - a.pts)
  const weekRank = sumPts((d) => d >= wkStart && d <= wkEnd)
  const monthRank = sumPts((d) => d.slice(0, 7) === monthCur)

  const calStart = addDays(weekStartOf(today), weekOffset * 7)
  const calDays = []
  for (let i = 0; i < 7; i++) calDays.push(addDays(calStart, i))
  const checkinsOn = (date) => log.filter((l) => l.date === date)
  const membersOn = (date) => {
    const ids = [...new Set(checkinsOn(date).map((l) => l.memberId))]
    return ids.map((id) => memberById(id)).filter(Boolean)
  }
  const selCheckins = checkinsOn(selDay)

  return (
    <div className="nr-app">
      <style>{CSS}</style>
      {toast && <div className="nr-toast">{toast}</div>}

      {modalRoutine && (
        <CheckinModal
          routine={modalRoutine}
          members={members}
          defaultCredit={modalRoutine.ownerId}
          onConfirm={(cid, photos) => {
            completeTask(modalRoutine.id, cid, photos)
            setModalRoutine(null)
          }}
          onClose={() => setModalRoutine(null)}
        />
      )}

      {lightbox && (
        <div className="nr-lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="check-in" />
        </div>
      )}

      <header className="nr-hero">
        <div className="nr-logo"><RatLogo /></div>
        <h1 className="nr-wordmark">No Rats</h1>
        <p className="nr-tagline">O jogo de manter a casa em ordem — em família</p>
      </header>

      <main className="nr-container">
        <div className="nr-field-label" style={{ marginBottom: '12px', fontSize: '15px', color: '#334155' }}>
          Placar geral <span style={{ color: '#94a3b8', fontWeight: 500 }}>· toque para escolher quem é você</span>
        </div>
        <section className="nr-scoreboard">
          {members.map((m) => {
            const isActive = m.id === activeId
            return (
              <button key={m.id} className="nr-player" onClick={() => setActive(m.id)} style={isActive ? { borderColor: m.color, boxShadow: `0 0 0 3px ${m.color}22` } : undefined}>
                <div className="nr-avatar" style={{ background: m.color }}>{m.emoji}</div>
                <div className="nr-player-name">{m.name} {m.id === leaderId ? '👑' : ''}</div>
                <div className="nr-player-stats">
                  <span className="nr-xp-pill">{m.xp} XP</span>
                  <span className="nr-rat-pill" style={m.rats > 0 ? { background: '#fee2e2', color: '#ef4444' } : undefined}>🐀 {m.rats}</span>
                </div>
                {isActive && <div className="nr-you">você</div>}
              </button>
            )
          })}
        </section>

        {isLeader && (
          <section className="nr-panel">
            <h2 className="nr-h">👑 Família <span className="nr-hint">(só o líder vê isto)</span></h2>
            <div className="nr-row">
              <select className="nr-emoji-select" value={pEmoji} onChange={(e) => setPEmoji(e.target.value)}>
                {EMOJIS.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
              <input className="nr-input" type="text" placeholder="Nome da pessoa…" value={pName} onChange={(e) => setPName(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addMember()} />
              <button className="nr-btn nr-btn-primary" onClick={addMember}>Adicionar</button>
            </div>
            <div className="nr-member-chips">
              {members.map((m) => (
                <div key={m.id} className="nr-member-chip" style={{ borderColor: m.color }}>
                  <span>{m.emoji} {m.name} {m.id === leaderId ? '👑' : ''}</span>
                  {m.id !== leaderId && <button className="nr-mini" title="Tornar líder" onClick={() => makeLeader(m.id)}>👑</button>}
                  <button className="nr-mini" title="Remover" onClick={() => removeMember(m.id)}>✕</button>
                </div>
              ))}
            </div>
          </section>
        )}

        {isLeader && (
          <section className="nr-panel">
            <h2 className="nr-h">Nova rotina</h2>
            <div className="nr-row">
              <input className="nr-input" type="text" placeholder="Ex: Lavar as toalhas, tirar o lixo…" value={rTitle} onChange={(e) => setRTitle(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addRoutine()} />
              <button className="nr-btn nr-btn-primary" onClick={addRoutine}>Adicionar</button>
            </div>
            <div className="nr-form-grid">
              <div>
                <div className="nr-field-label">Frequência</div>
                <div className="nr-pills">
                  {Object.entries(FREQUENCIES).map(([key, f]) => (
                    <button key={key} className="nr-pill" onClick={() => setFreqForm(key)} style={rFreq === key ? { background: '#4f46e5', borderColor: '#4f46e5', color: '#fff' } : undefined}>{f.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <div className="nr-field-label">Vale quantos XP?</div>
                <input className="nr-num" type="number" min="1" value={rXp} onChange={(e) => setRXp(e.target.value)} />
              </div>
              <div>
                <div className="nr-field-label">De quem é?</div>
                <select className="nr-owner-select" value={rOwner || leaderId} onChange={(e) => setROwner(e.target.value)}>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.emoji} {m.name}</option>)}
                </select>
              </div>
            </div>
            <div className="nr-field-label" style={{ marginTop: '16px' }}>💡 Sugestões — toque para preencher</div>
            <div className="nr-suggests">
              {SUGGESTIONS.map((s) => <button key={s.title} className="nr-suggest" onClick={() => useSuggestion(s)}>+ {s.title}</button>)}
            </div>
          </section>
        )}

        <div className="nr-toggle">
          <button className={tab === 'hoje' ? 'active' : ''} onClick={() => setTab('hoje')}>Hoje</button>
          <button className={tab === 'calendario' ? 'active' : ''} onClick={() => setTab('calendario')}>Calendário</button>
          <button className={tab === 'ranking' ? 'active' : ''} onClick={() => setTab('ranking')}>Ranking</button>
        </div>

        {tab === 'hoje' && (
          <section>
            <h2 className="nr-list-title">Rotinas da casa · {routines.length}</h2>
            {routines.length === 0 ? (
              <div className="nr-empty"><div style={{ fontSize: '34px', marginBottom: '8px' }}>🧹</div>Nenhuma rotina ainda.</div>
            ) : (
              <div className="nr-tasks">
                {withStatus.map((r) => {
                  const s = r.status
                  const owner = memberById(r.ownerId)
                  const doneToday = r.lastDone === todayStr()
                  const ownerIsActive = active && active.id === r.ownerId
                  return (
                    <div className="nr-task" key={r.id} style={{ borderLeftColor: s.color }}>
                      <div style={{ minWidth: 0 }}>
                        <div className="nr-task-head">
                          <span className="nr-task-title">{r.title}</span>
                          <span className="nr-status" style={{ background: s.color }}>{s.label}</span>
                          {owner && <span className="nr-owner-tag" style={{ background: owner.color }}>{owner.emoji} {owner.name}</span>}
                        </div>
                        <div className="nr-meta">{s.last}{s.sub ? ` · ${s.sub}` : ''} · vale {r.xp} XP</div>
                        {isLeader && (
                          <div className="nr-freq-row">
                            <span className="nr-freq-lbl">Frequência:</span>
                            <select className="nr-freq" value={r.freq} onChange={(e) => updateFreq(r.id, e.target.value)}>
                              {Object.entries(FREQUENCIES).map(([key, f]) => <option key={key} value={key}>{f.label}</option>)}
                            </select>
                          </div>
                        )}
                      </div>
                      <div className="nr-actions">
                        {!doneToday && (
                          <button className="nr-btn nr-photo-btn nr-btn-sm" title="Check-in com foto" onClick={() => setModalRoutine(r)}>📸</button>
                        )}
                        {doneToday ? (
                          <button className="nr-btn nr-done-today">✓ Feita hoje</button>
                        ) : ownerIsActive ? (
                          <button className="nr-btn nr-complete" onClick={() => completeTask(r.id)}>Fiz hoje</button>
                        ) : (
                          <>
                            <button className="nr-btn nr-complete nr-btn-sm" onClick={() => completeTask(r.id)}>Feita</button>
                            <button className="nr-btn nr-steal nr-btn-sm" onClick={() => completeTask(r.id, active.id)} title={`Roubar de ${owner ? owner.name : ''}`}>🥷 Fiz eu</button>
                          </>
                        )}
                        {isLeader && <button className="nr-btn nr-del" title="Excluir" onClick={() => removeRoutine(r.id)}>🗑️</button>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {tab === 'calendario' && (
          <section>
            <div className="nr-cal-nav">
              <button className="nr-mini" onClick={() => setWeekOffset(weekOffset - 1)}>◀</button>
              <span className="nr-cal-range">{ddmm(calStart)} – {ddmm(addDays(calStart, 6))}</span>
              <button className="nr-mini" onClick={() => setWeekOffset(weekOffset + 1)}>▶</button>
            </div>
            <div className="nr-cal-grid">
              {calDays.map((date, i) => {
                const isToday = date === today
                const isSel = date === selDay
                const ppl = membersOn(date)
                return (
                  <button key={date} className={`nr-cal-cell${isSel ? ' sel' : ''}${isToday ? ' today' : ''}`} onClick={() => setSelDay(date)}>
                    <div className="nr-cal-wd">{WD_SHORT[i]}</div>
                    <div className="nr-cal-day">{date.slice(8, 10)}</div>
                    <div className="nr-cal-dots">
                      {ppl.slice(0, 4).map((m) => <span key={m.id} className="nr-dot" style={{ background: m.color }} />)}
                    </div>
                  </button>
                )
              })}
            </div>
            <h2 className="nr-list-title" style={{ marginTop: '20px' }}>
              Check-ins de {selDay === today ? 'hoje' : ddmm(selDay)} · {selCheckins.length}
            </h2>
            {selCheckins.length === 0 ? (
              <div className="nr-empty" style={{ padding: '30px' }}>Nenhum check-in nesse dia.</div>
            ) : (
              <div className="nr-tasks">
                {selCheckins.map((l) => {
                  const m = memberById(l.memberId)
                  const hasPhoto = l.before || l.after
                  return (
                    <div className="nr-checkin" key={l.id}>
                      <div className="nr-checkin-top">
                        <span>
                          {m && <span className="nr-owner-tag" style={{ background: m.color, marginRight: '8px' }}>{m.emoji} {m.name}</span>}
                          <strong>{l.title}</strong>
                        </span>
                        <span className="nr-xp-pill">+{l.xp} XP</span>
                      </div>
                      {hasPhoto && (
                        <div className="nr-checkin-photos">
                          {l.before && (
                            <figure className="nr-ba">
                              <img src={l.before} className="nr-ba-img" onClick={() => setLightbox(l.before)} alt="antes" />
                              <figcaption>Antes</figcaption>
                            </figure>
                          )}
                          {l.after && (
                            <figure className="nr-ba">
                              <img src={l.after} className="nr-ba-img" onClick={() => setLightbox(l.after)} alt="depois" />
                              <figcaption>Depois</figcaption>
                            </figure>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {tab === 'ranking' && (
          <section>
            <RankBlock title="🏆 Ranking da semana" subtitle={`${ddmm(wkStart)} – ${ddmm(wkEnd)}`} rows={weekRank} />
            <RankBlock title="📅 Ranking do mês" subtitle={monthCur.slice(5, 7) + '/' + monthCur.slice(0, 4)} rows={monthRank} />
          </section>
        )}

        <footer className="nr-footer">No Rats · seus dados ficam salvos com segurança neste navegador</footer>
      </main>
    </div>
  )
}

function CheckinModal({ routine, members, defaultCredit, onConfirm, onClose }) {
  const [before, setBefore] = useState(null)
  const [after, setAfter] = useState(null)
  const [credit, setCredit] = useState(defaultCredit)
  const pick = (setter) => (e) => {
    const f = e.target.files && e.target.files[0]
    if (f) compressImage(f, setter)
  }
  return (
    <div className="nr-modal-bg" onClick={onClose}>
      <div className="nr-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="nr-h" style={{ marginBottom: '4px' }}>📸 Check-in</h3>
        <div className="nr-meta" style={{ marginBottom: '16px' }}>{routine.title}</div>
        <div className="nr-photo-slots">
          <label className="nr-photo-slot">
            {before ? <img src={before} className="nr-photo-img" alt="antes" /> : <span className="nr-photo-ph">📷<br />Antes</span>}
            <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={pick(setBefore)} />
          </label>
          <label className="nr-photo-slot">
            {after ? <img src={after} className="nr-photo-img" alt="depois" /> : <span className="nr-photo-ph">✨<br />Depois</span>}
            <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={pick(setAfter)} />
          </label>
        </div>
        <div className="nr-field-label" style={{ marginTop: '16px' }}>Quem fez?</div>
        <select className="nr-owner-select" value={credit} onChange={(e) => setCredit(e.target.value)}>
          {members.map((m) => <option key={m.id} value={m.id}>{m.emoji} {m.name}</option>)}
        </select>
        <div className="nr-modal-actions">
          <button className="nr-btn nr-del" onClick={onClose}>Cancelar</button>
          <button className="nr-btn nr-btn-primary" onClick={() => onConfirm(credit, { before, after })}>Registrar check-in</button>
        </div>
      </div>
    </div>
  )
}

function RankBlock({ title, subtitle, rows }) {
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

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
* { box-sizing: border-box; }
body { margin: 0; }
.nr-app { min-height: 100vh; background: #f1f5f9; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0f172a; -webkit-font-smoothing: antialiased; }
.nr-hero { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 48px 20px 66px; text-align: center; color: #fff; }
.nr-logo { width: 76px; height: 76px; margin: 0 auto; border-radius: 22px; background: #ffffff; border: 1px solid rgba(255,255,255,0.6); display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 28px rgba(0,0,0,0.22); overflow: hidden; }
.nr-logo svg { width: 68px; height: 68px; }
.nr-wordmark { font-size: 34px; font-weight: 800; letter-spacing: -0.025em; margin: 16px 0 6px; }
.nr-tagline { opacity: 0.88; font-size: 15px; margin: 0; font-weight: 500; }
.nr-container { max-width: 880px; margin: -38px auto 0; padding: 0 20px 64px; }
.nr-scoreboard { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; margin-bottom: 26px; }
.nr-player { position: relative; background: #fff; border: 2px solid #e9ecf2; border-radius: 18px; padding: 18px 14px; cursor: pointer; text-align: center; font-family: inherit; box-shadow: 0 4px 16px rgba(15,23,42,0.06); transition: transform 0.15s ease, box-shadow 0.15s ease; }
.nr-player:hover { transform: translateY(-2px); }
.nr-avatar { width: 46px; height: 46px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; margin: 0 auto 8px; }
.nr-avatar-sm { width: 34px; height: 34px; font-size: 18px; margin: 0; }
.nr-player-name { font-weight: 700; font-size: 15px; color: #1e293b; margin-bottom: 8px; }
.nr-player-stats { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; }
.nr-xp-pill { background: #eef2ff; color: #4f46e5; font-weight: 700; font-size: 12px; padding: 3px 9px; border-radius: 999px; white-space: nowrap; }
.nr-rat-pill { background: #f1f5f9; color: #94a3b8; font-weight: 700; font-size: 12px; padding: 3px 9px; border-radius: 999px; }
.nr-you { position: absolute; top: -9px; left: 50%; transform: translateX(-50%); background: #0f172a; color: #fff; font-size: 10px; font-weight: 700; padding: 2px 10px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.05em; }
.nr-panel { background: #fff; border: 1px solid #e9ecf2; border-radius: 18px; padding: 22px; box-shadow: 0 4px 16px rgba(15,23,42,0.06); margin-bottom: 22px; }
.nr-h { font-size: 15px; font-weight: 700; margin: 0 0 14px; color: #1e293b; }
.nr-hint { font-weight: 500; font-size: 12px; color: #94a3b8; }
.nr-row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
.nr-input { flex: 1; min-width: 160px; padding: 12px 15px; font-size: 14px; border: 1.5px solid #e2e8f0; border-radius: 12px; outline: none; font-family: inherit; transition: border-color 0.15s ease; }
.nr-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.12); }
.nr-emoji-select, .nr-owner-select { padding: 12px 10px; font-size: 18px; border: 1.5px solid #e2e8f0; border-radius: 12px; background: #fff; cursor: pointer; font-family: inherit; outline: none; }
.nr-owner-select { font-size: 14px; font-weight: 600; color: #475569; width: 100%; }
.nr-num { width: 100%; padding: 10px 12px; font-size: 14px; font-weight: 600; border: 1.5px solid #e2e8f0; border-radius: 12px; outline: none; font-family: inherit; }
.nr-num:focus, .nr-owner-select:focus { border-color: #6366f1; }
.nr-form-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
@media (min-width: 620px) { .nr-form-grid { grid-template-columns: 2fr 1fr 1.3fr; align-items: start; } }
.nr-field-label { font-size: 13px; color: #475569; font-weight: 700; margin-bottom: 8px; }
.nr-btn { padding: 12px 20px; border: none; border-radius: 12px; font-weight: 700; font-size: 14px; cursor: pointer; font-family: inherit; transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease, color 0.15s ease; white-space: nowrap; }
.nr-btn-sm { padding: 8px 13px; font-size: 12.5px; }
.nr-btn-primary { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #fff; box-shadow: 0 4px 14px rgba(79,70,229,0.35); }
.nr-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 7px 20px rgba(79,70,229,0.45); }
.nr-pills { display: flex; gap: 8px; flex-wrap: wrap; }
.nr-pill { padding: 8px 14px; border-radius: 999px; border: 1.5px solid #e2e8f0; background: #fff; color: #64748b; font-weight: 600; font-size: 13px; cursor: pointer; font-family: inherit; transition: all 0.15s ease; }
.nr-pill:hover { border-color: #cbd5e1; }
.nr-suggests { display: flex; gap: 8px; flex-wrap: wrap; }
.nr-suggest { padding: 6px 12px; border-radius: 999px; border: 1.5px dashed #cbd5e1; background: #fff; color: #64748b; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.15s ease; }
.nr-suggest:hover { border-color: #6366f1; color: #4f46e5; }
.nr-member-chips { display: flex; gap: 8px; flex-wrap: wrap; }
.nr-member-chip { display: flex; align-items: center; gap: 6px; border: 1.5px solid #e2e8f0; border-radius: 999px; padding: 5px 6px 5px 12px; font-size: 13px; font-weight: 600; color: #334155; }
.nr-mini { min-width: 30px; height: 30px; border: 1.5px solid #e2e8f0; border-radius: 50%; background: #fff; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; justify-content: center; font-family: inherit; }
.nr-mini:hover { background: #f1f5f9; }
.nr-toggle { display: inline-flex; background: #e5e9f0; border-radius: 12px; padding: 3px; gap: 2px; margin-bottom: 18px; }
.nr-toggle button { border: none; background: transparent; padding: 8px 16px; border-radius: 9px; font-weight: 700; font-size: 13px; color: #64748b; cursor: pointer; font-family: inherit; }
.nr-toggle button.active { background: #fff; color: #4f46e5; box-shadow: 0 1px 4px rgba(0,0,0,0.10); }
.nr-list-title { font-size: 15px; font-weight: 700; color: #334155; margin: 0 0 14px; }
.nr-tasks { display: grid; gap: 12px; }
.nr-task { display: flex; justify-content: space-between; align-items: center; gap: 12px; background: #fff; border: 1px solid #e9ecf2; border-left: 4px solid #10b981; border-radius: 14px; padding: 14px 16px; box-shadow: 0 2px 8px rgba(15,23,42,0.05); transition: transform 0.15s ease, box-shadow 0.15s ease; }
.nr-task:hover { transform: translateX(2px); box-shadow: 0 6px 16px rgba(15,23,42,0.10); }
.nr-task-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
.nr-task-title { font-size: 16px; font-weight: 600; color: #1e293b; }
.nr-status { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; color: #fff; }
.nr-owner-tag { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; color: #fff; }
.nr-meta { font-size: 13px; color: #64748b; font-weight: 500; }
.nr-freq-row { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
.nr-freq-lbl { font-size: 12px; color: #94a3b8; font-weight: 600; }
.nr-freq { font-family: inherit; font-size: 12px; font-weight: 600; color: #475569; background: #f1f5f9; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 4px 8px; cursor: pointer; outline: none; }
.nr-freq:hover { border-color: #cbd5e1; }
.nr-actions { display: flex; gap: 8px; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end; }
.nr-complete { background: #4f46e5; color: #fff; }
.nr-complete:hover { background: #4338ca; transform: translateY(-1px); }
.nr-steal { background: #fff7ed; color: #ea580c; border: 1.5px solid #fed7aa; }
.nr-steal:hover { background: #ffedd5; }
.nr-photo-btn { background: #f5f3ff; color: #7c3aed; border: 1.5px solid #ddd6fe; }
.nr-photo-btn:hover { background: #ede9fe; }
.nr-done-today { background: #dcfce7; color: #16a34a; cursor: default; }
.nr-del { background: #f1f5f9; color: #94a3b8; }
.nr-del:hover { background: #fee2e2; color: #ef4444; }
.nr-empty { background: #fff; border: 1.5px dashed #cbd5e1; border-radius: 16px; padding: 44px 24px; text-align: center; color: #94a3b8; font-size: 15px; font-weight: 500; }
.nr-cal-nav { display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 14px; }
.nr-cal-range { font-weight: 700; font-size: 14px; color: #334155; }
.nr-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.nr-cal-cell { background: #fff; border: 1.5px solid #e9ecf2; border-radius: 12px; padding: 10px 4px 8px; cursor: pointer; font-family: inherit; text-align: center; transition: all 0.12s ease; }
.nr-cal-cell:hover { border-color: #cbd5e1; }
.nr-cal-cell.today { border-color: #c7d2fe; background: #eef2ff; }
.nr-cal-cell.sel { border-color: #4f46e5; box-shadow: 0 0 0 2px rgba(79,70,229,0.15); }
.nr-cal-wd { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
.nr-cal-day { font-size: 18px; font-weight: 800; color: #1e293b; margin: 2px 0 5px; }
.nr-cal-dots { display: flex; gap: 3px; justify-content: center; min-height: 8px; flex-wrap: wrap; }
.nr-dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
.nr-checkin { background: #fff; border: 1px solid #e9ecf2; border-radius: 14px; padding: 14px 16px; box-shadow: 0 1px 4px rgba(15,23,42,0.04); }
.nr-checkin-top { display: flex; justify-content: space-between; align-items: center; gap: 10px; font-size: 14px; color: #1e293b; }
.nr-checkin-photos { display: flex; gap: 12px; margin-top: 12px; }
.nr-ba { margin: 0; flex: 1; text-align: center; }
.nr-ba-img { width: 100%; height: 130px; object-fit: cover; border-radius: 12px; cursor: pointer; border: 1px solid #e9ecf2; }
.nr-ba figcaption { font-size: 12px; font-weight: 700; color: #64748b; margin-top: 6px; }
.nr-week-empty { font-size: 13px; color: #94a3b8; }
.nr-rank-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 12px; }
.nr-rank-row { display: flex; align-items: center; gap: 12px; padding: 9px 0; border-top: 1px solid #f1f5f9; }
.nr-rank-row:first-of-type { border-top: none; }
.nr-rank-pos { font-size: 18px; font-weight: 800; width: 34px; text-align: center; color: #64748b; }
.nr-rank-name { font-weight: 700; font-size: 15px; color: #1e293b; flex: 1; }
.nr-rank-pts { font-weight: 800; font-size: 15px; color: #4f46e5; }
.nr-footer { text-align: center; margin-top: 40px; color: #94a3b8; font-size: 13px; font-weight: 500; }
.nr-toast { position: fixed; top: 24px; left: 50%; transform: translate(-50%, 0); background: #0f172a; color: #fff; padding: 13px 24px; border-radius: 999px; font-weight: 600; font-size: 14px; box-shadow: 0 14px 36px rgba(0,0,0,0.32); z-index: 1200; animation: nrpop 0.25s ease; max-width: 90vw; text-align: center; }
@keyframes nrpop { from { opacity: 0; transform: translate(-50%, -10px); } to { opacity: 1; transform: translate(-50%, 0); } }
.nr-modal-bg { position: fixed; inset: 0; background: rgba(15,23,42,0.55); display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 1000; animation: nrfade 0.15s ease; }
.nr-modal { background: #fff; border-radius: 20px; padding: 24px; width: 100%; max-width: 420px; box-shadow: 0 24px 60px rgba(0,0,0,0.3); }
.nr-photo-slots { display: flex; gap: 12px; }
.nr-photo-slot { flex: 1; aspect-ratio: 1; border: 2px dashed #cbd5e1; border-radius: 14px; display: flex; align-items: center; justify-content: center; cursor: pointer; overflow: hidden; background: #f8fafc; transition: border-color 0.15s ease; }
.nr-photo-slot:hover { border-color: #a5b4fc; }
.nr-photo-ph { text-align: center; font-size: 22px; color: #94a3b8; font-weight: 700; line-height: 1.5; }
.nr-photo-img { width: 100%; height: 100%; object-fit: cover; }
.nr-modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
.nr-lightbox { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 1300; cursor: zoom-out; animation: nrfade 0.15s ease; }
.nr-lightbox img { max-width: 100%; max-height: 100%; border-radius: 12px; }
@keyframes nrfade { from { opacity: 0; } to { opacity: 1; } }
`
