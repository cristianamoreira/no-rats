import { useState, useEffect } from 'react'

const FREQUENCIES = {
  diaria: { label: 'Diária', days: 1, xp: 5 },
  semanal: { label: 'Semanal', days: 7, xp: 15 },
  quinzenal: { label: 'Quinzenal', days: 15, xp: 25 },
  mensal: { label: 'Mensal', days: 30, xp: 40 },
}

const STARTERS = [
  { title: 'Lavar a louça', freq: 'diaria' },
  { title: 'Lavar roupa', freq: 'semanal' },
  { title: 'Limpar o banheiro', freq: 'semanal' },
  { title: 'Trocar a roupa de cama', freq: 'quinzenal' },
  { title: 'Faxina geral', freq: 'mensal' },
]

const MS = 86400000

function RatLogo() {
  // Rato de perfil, minimalista — olhando para a direita
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path
        d="M17 41 C 8 44 6 53 13 55 C 18 56 21 51 17 48"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <circle cx="29" cy="17" r="8" fill="currentColor" />
      <path
        d="M53 39
           C 50 30 43 25 35 25
           C 23 25 14 30 14 39
           C 14 46 20 50 28 50
           C 38 50 47 46 52 40 Z"
        fill="currentColor"
      />
      <circle cx="44" cy="35" r="2.3" fill="#6d4fd6" />
      <circle cx="53" cy="39" r="1.9" fill="#6d4fd6" />
    </svg>
  )
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function daysSince(dateStr) {
  if (!dateStr) return null
  return Math.round((Date.parse(todayStr()) - Date.parse(dateStr)) / MS)
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
    return {
      kind: 'ok',
      color: '#10b981',
      label: 'Em dia',
      last,
      sub: `Próxima em ${rem} ${rem === 1 ? 'dia' : 'dias'}`,
      sort: -(rem),
    }
  }

  const over = ds - freq.days
  if (over === 0) {
    return { kind: 'due', color: '#f59e0b', label: 'Vence hoje', last, sort: 0 }
  }
  return {
    kind: 'late',
    color: '#ef4444',
    label: `Atrasada há ${over} ${over === 1 ? 'dia' : 'dias'}`,
    last,
    sort: over,
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem('norats')
    if (raw) {
      const s = JSON.parse(raw)
      if (Array.isArray(s.routines)) return s
    }
  } catch (e) {}
  return {
    routines: STARTERS.map((s, i) => ({ id: Date.now() + i, title: s.title, freq: s.freq, lastDone: null })),
    xp: 0,
    streak: 0,
    lastDay: null,
  }
}

export default function App() {
  const initial = loadState()
  const [routines, setRoutines] = useState(initial.routines)
  const [xp, setXp] = useState(initial.xp)
  const [streak, setStreak] = useState(initial.streak)
  const [lastDay, setLastDay] = useState(initial.lastDay)
  const [title, setTitle] = useState('')
  const [freq, setFreq] = useState('semanal')
  const [toast, setToast] = useState(null)

  useEffect(() => {
    localStorage.setItem('norats', JSON.stringify({ routines, xp, streak, lastDay }))
  }, [routines, xp, streak, lastDay])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2600)
  }

  const addRoutine = () => {
    if (!title.trim()) return showToast('✏️ Dê um nome para a rotina!')
    setRoutines([...routines, { id: Date.now(), title: title.trim(), freq, lastDone: null }])
    setTitle('')
  }

  const markDone = (id) => {
    const routine = routines.find((r) => r.id === id)
    if (!routine) return
    const today = todayStr()
    if (routine.lastDone === today) {
      showToast('✨ Já registrada hoje!')
      return
    }
    const reward = (FREQUENCIES[routine.freq] || FREQUENCIES.semanal).xp
    const prevLevel = Math.floor(xp / 100) + 1
    const newXp = xp + reward
    const newLevel = Math.floor(newXp / 100) + 1
    if (lastDay !== today) {
      const yesterday = new Date(Date.now() - MS).toISOString().slice(0, 10)
      setStreak(lastDay === yesterday ? streak + 1 : 1)
      setLastDay(today)
    }
    setXp(newXp)
    setRoutines(routines.map((r) => (r.id === id ? { ...r, lastDone: today } : r)))
    if (newLevel > prevLevel) showToast(`🎉 LEVEL UP! Você chegou ao Nível ${newLevel}!`)
    else showToast(`✅ Registrada! +${reward} XP`)
  }

  const removeRoutine = (id) => setRoutines(routines.filter((r) => r.id !== id))
  const updateFreq = (id, newFreq) =>
    setRoutines(routines.map((r) => (r.id === id ? { ...r, freq: newFreq } : r)))

  const level = Math.floor(xp / 100) + 1
  const progress = ((xp % 100) / 100) * 100
  const withStatus = routines.map((r) => ({ ...r, status: getStatus(r) }))
  withStatus.sort((a, b) => b.status.sort - a.status.sort)
  const attention = withStatus.filter((r) => r.status.kind === 'late' || r.status.kind === 'due').length

  return (
    <div className="nr-app">
      <style>{CSS}</style>
      {toast && <div className="nr-toast">{toast}</div>}

      <header className="nr-hero">
        <div className="nr-logo"><RatLogo /></div>
        <h1 className="nr-wordmark">No Rats</h1>
        <p className="nr-tagline">O registro inteligente das tarefas da sua casa</p>
      </header>

      <main className="nr-container">
        <section className="nr-stats">
          <div className="nr-card nr-stat">
            <div className="nr-chip" style={{ background: '#eef2ff' }}>⭐</div>
            <div className="nr-stat-val" style={{ color: '#4f46e5' }}>{xp}</div>
            <div className="nr-stat-label">XP Total</div>
          </div>
          <div className="nr-card nr-stat">
            <div className="nr-chip" style={{ background: '#f3e8ff' }}>🎖️</div>
            <div className="nr-stat-val" style={{ color: '#7c3aed' }}>{level}</div>
            <div className="nr-stat-label">Nível</div>
            <div className="nr-prog"><div className="nr-prog-fill" style={{ width: `${progress}%` }} /></div>
            <div className="nr-sub">{xp % 100}/100 XP</div>
          </div>
          <div className="nr-card nr-stat">
            <div className="nr-chip" style={{ background: '#fef3c7' }}>🔥</div>
            <div className="nr-stat-val" style={{ color: '#f59e0b' }}>{streak}</div>
            <div className="nr-stat-label">{streak === 1 ? 'Dia seguido' : 'Dias seguidos'}</div>
          </div>
          <div className="nr-card nr-stat">
            <div className="nr-chip" style={{ background: attention ? '#fee2e2' : '#dcfce7' }}>{attention ? '⚠️' : '✅'}</div>
            <div className="nr-stat-val" style={{ color: attention ? '#ef4444' : '#10b981' }}>{attention}</div>
            <div className="nr-stat-label">Precisam de atenção</div>
          </div>
        </section>

        <section className="nr-panel">
          <h2 className="nr-h">Nova rotina</h2>
          <div className="nr-row">
            <input
              className="nr-input"
              type="text"
              placeholder="Ex: Lavar as toalhas, regar as plantas…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addRoutine()}
            />
            <button className="nr-btn nr-btn-primary" onClick={addRoutine}>Adicionar</button>
          </div>
          <div className="nr-field-label">Com que frequência?</div>
          <div className="nr-pills">
            {Object.entries(FREQUENCIES).map(([key, f]) => {
              const active = freq === key
              return (
                <button
                  key={key}
                  className="nr-pill"
                  onClick={() => setFreq(key)}
                  style={active ? { background: '#4f46e5', borderColor: '#4f46e5', color: '#fff' } : undefined}
                >
                  {f.label} · +{f.xp} XP
                </button>
              )
            })}
          </div>
        </section>

        <section>
          <h2 className="nr-list-title">Minhas rotinas · {routines.length}</h2>
          {routines.length === 0 ? (
            <div className="nr-empty">
              <div style={{ fontSize: '34px', marginBottom: '8px' }}>🧹</div>
              Nenhuma rotina ainda. Adicione a primeira acima!
            </div>
          ) : (
            <div className="nr-tasks">
              {withStatus.map((r) => {
                const s = r.status
                const doneToday = r.lastDone === todayStr()
                return (
                  <div className="nr-task" key={r.id} style={{ borderLeftColor: s.color }}>
                    <div style={{ minWidth: 0 }}>
                      <div className="nr-task-head">
                        <span className="nr-task-title">{r.title}</span>
                        <span className="nr-status" style={{ background: s.color }}>{s.label}</span>
                      </div>
                      <div className="nr-meta">{s.last}{s.sub ? ` · ${s.sub}` : ''}</div>
                      <div className="nr-freq-row">
                        <span className="nr-freq-lbl">Frequência:</span>
                        <select className="nr-freq" value={r.freq} onChange={(e) => updateFreq(r.id, e.target.value)}>
                          {Object.entries(FREQUENCIES).map(([key, f]) => (
                            <option key={key} value={key}>{f.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="nr-actions">
                      <button
                        className={`nr-btn ${doneToday ? 'nr-done-today' : 'nr-complete'}`}
                        onClick={() => markDone(r.id)}
                      >
                        {doneToday ? '✓ Feita hoje' : 'Fiz hoje'}
                      </button>
                      <button className="nr-btn nr-del" title="Excluir" onClick={() => removeRoutine(r.id)}>🗑️</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <footer className="nr-footer">No Rats · seus dados ficam salvos com segurança neste navegador</footer>
      </main>
    </div>
  )
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
* { box-sizing: border-box; }
body { margin: 0; }
.nr-app { min-height: 100vh; background: #f1f5f9; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0f172a; -webkit-font-smoothing: antialiased; }
.nr-hero { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 52px 20px 70px; text-align: center; color: #fff; }
.nr-logo { width: 76px; height: 76px; margin: 0 auto; border-radius: 22px; background: rgba(255,255,255,0.16); border: 1px solid rgba(255,255,255,0.28); display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 28px rgba(0,0,0,0.22); }
.nr-logo svg { width: 46px; height: 46px; color: #fff; }
.nr-wordmark { font-size: 36px; font-weight: 800; letter-spacing: -0.025em; margin: 18px 0 6px; }
.nr-tagline { opacity: 0.88; font-size: 15px; margin: 0; font-weight: 500; }
.nr-container { max-width: 880px; margin: -40px auto 0; padding: 0 20px 64px; }
.nr-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 16px; margin-bottom: 22px; }
.nr-card { background: #fff; border: 1px solid #e9ecf2; border-radius: 18px; padding: 20px; box-shadow: 0 4px 16px rgba(15,23,42,0.06); transition: transform 0.2s ease, box-shadow 0.2s ease; }
.nr-card:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(15,23,42,0.10); }
.nr-stat { display: flex; flex-direction: column; gap: 8px; }
.nr-chip { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 19px; }
.nr-stat-val { font-size: 30px; font-weight: 800; line-height: 1; letter-spacing: -0.02em; }
.nr-stat-label { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
.nr-sub { font-size: 11px; color: #94a3b8; font-weight: 500; }
.nr-prog { height: 7px; background: #eef2f7; border-radius: 999px; overflow: hidden; margin-top: 4px; }
.nr-prog-fill { height: 100%; background: linear-gradient(90deg, #4f46e5, #7c3aed); border-radius: 999px; transition: width 0.4s ease; }
.nr-panel { background: #fff; border: 1px solid #e9ecf2; border-radius: 18px; padding: 22px; box-shadow: 0 4px 16px rgba(15,23,42,0.06); margin-bottom: 26px; }
.nr-h { font-size: 15px; font-weight: 700; margin: 0 0 14px; }
.nr-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
.nr-input { flex: 1; min-width: 200px; padding: 12px 15px; font-size: 14px; border: 1.5px solid #e2e8f0; border-radius: 12px; outline: none; font-family: inherit; transition: border-color 0.15s ease; }
.nr-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.12); }
.nr-field-label { font-size: 12px; color: #64748b; font-weight: 600; margin-bottom: 10px; }
.nr-btn { padding: 12px 22px; border: none; border-radius: 12px; font-weight: 700; font-size: 14px; cursor: pointer; font-family: inherit; transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease, color 0.15s ease; white-space: nowrap; }
.nr-btn-primary { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #fff; box-shadow: 0 4px 14px rgba(79,70,229,0.35); }
.nr-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 7px 20px rgba(79,70,229,0.45); }
.nr-pills { display: flex; gap: 10px; flex-wrap: wrap; }
.nr-pill { padding: 8px 15px; border-radius: 999px; border: 1.5px solid #e2e8f0; background: #fff; color: #64748b; font-weight: 600; font-size: 13px; cursor: pointer; font-family: inherit; transition: all 0.15s ease; }
.nr-pill:hover { border-color: #cbd5e1; }
.nr-list-title { font-size: 15px; font-weight: 700; color: #334155; margin: 0 0 14px; }
.nr-tasks { display: grid; gap: 12px; }
.nr-task { display: flex; justify-content: space-between; align-items: center; gap: 12px; background: #fff; border: 1px solid #e9ecf2; border-left: 4px solid #10b981; border-radius: 14px; padding: 14px 16px; box-shadow: 0 2px 8px rgba(15,23,42,0.05); transition: transform 0.15s ease, box-shadow 0.15s ease; }
.nr-task:hover { transform: translateX(2px); box-shadow: 0 6px 16px rgba(15,23,42,0.10); }
.nr-task-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 6px; }
.nr-task-title { font-size: 16px; font-weight: 600; color: #1e293b; }
.nr-status { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; color: #fff; }
.nr-meta { font-size: 13px; color: #64748b; font-weight: 500; }
.nr-freq-row { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
.nr-freq-lbl { font-size: 12px; color: #94a3b8; font-weight: 600; }
.nr-freq { font-family: inherit; font-size: 12px; font-weight: 600; color: #475569; background: #f1f5f9; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 4px 8px; cursor: pointer; outline: none; transition: border-color 0.15s ease; }
.nr-freq:hover { border-color: #cbd5e1; }
.nr-freq:focus { border-color: #6366f1; }
.nr-actions { display: flex; gap: 8px; flex-shrink: 0; }
.nr-complete { background: #4f46e5; color: #fff; }
.nr-complete:hover { background: #4338ca; transform: translateY(-1px); }
.nr-done-today { background: #dcfce7; color: #16a34a; cursor: default; }
.nr-del { background: #f1f5f9; color: #94a3b8; }
.nr-del:hover { background: #fee2e2; color: #ef4444; }
.nr-empty { background: #fff; border: 1.5px dashed #cbd5e1; border-radius: 16px; padding: 44px 24px; text-align: center; color: #94a3b8; font-size: 15px; font-weight: 500; }
.nr-footer { text-align: center; margin-top: 40px; color: #94a3b8; font-size: 13px; font-weight: 500; }
.nr-toast { position: fixed; top: 24px; left: 50%; transform: translate(-50%, 0); background: #0f172a; color: #fff; padding: 13px 24px; border-radius: 999px; font-weight: 600; font-size: 14px; box-shadow: 0 14px 36px rgba(0,0,0,0.32); z-index: 1000; animation: nrpop 0.25s ease; }
@keyframes nrpop { from { opacity: 0; transform: translate(-50%, -10px); } to { opacity: 1; transform: translate(-50%, 0); } }
`
