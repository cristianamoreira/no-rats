import { useState, useEffect } from 'react'

const DIFFICULTIES = {
  simples: { label: 'Simples', xp: 10, color: '#10b981' },
  medio: { label: 'Médio', xp: 25, color: '#f59e0b' },
  dificil: { label: 'Difícil', xp: 50, color: '#ef4444' },
}

function RatLogo() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="18" cy="19" r="11" fill="currentColor" />
      <circle cx="46" cy="19" r="11" fill="currentColor" />
      <circle cx="18" cy="19" r="5" fill="rgba(255,255,255,0.35)" />
      <circle cx="46" cy="19" r="5" fill="rgba(255,255,255,0.35)" />
      <path
        d="M32 15 C 44 15 50 25 50 36 C 50 48 42 55 32 55 C 22 55 14 48 14 36 C 14 25 20 15 32 15 Z"
        fill="currentColor"
      />
      <circle cx="25" cy="34" r="2.6" fill="#fff" />
      <circle cx="39" cy="34" r="2.6" fill="#fff" />
      <circle cx="32" cy="43" r="3.2" fill="#fff" />
      <path
        d="M32 44 H 13 M32 46 H 16 M32 44 H 51 M32 46 H 48"
        stroke="#fff"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.65"
      />
    </svg>
  )
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function loadState() {
  try {
    const raw = localStorage.getItem('norats')
    if (raw) return JSON.parse(raw)
  } catch (e) {}
  return { tasks: [], xp: 0, streak: 0, lastDay: null }
}

export default function App() {
  const initial = loadState()
  const [tasks, setTasks] = useState(initial.tasks)
  const [xp, setXp] = useState(initial.xp)
  const [streak, setStreak] = useState(initial.streak)
  const [lastDay, setLastDay] = useState(initial.lastDay)
  const [title, setTitle] = useState('')
  const [difficulty, setDifficulty] = useState('simples')
  const [toast, setToast] = useState(null)

  useEffect(() => {
    localStorage.setItem('norats', JSON.stringify({ tasks, xp, streak, lastDay }))
  }, [tasks, xp, streak, lastDay])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const createTask = () => {
    if (!title.trim()) return showToast('✏️ Digite um título!')
    const d = DIFFICULTIES[difficulty]
    setTasks([...tasks, { id: Date.now(), title: title.trim(), xp: d.xp, difficulty }])
    setTitle('')
  }

  const completeTask = (id) => {
    const task = tasks.find((t) => t.id === id)
    if (!task) return
    const prevLevel = Math.floor(xp / 100) + 1
    const newXp = xp + task.xp
    const newLevel = Math.floor(newXp / 100) + 1
    const today = todayStr()
    if (lastDay !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      setStreak(lastDay === yesterday ? streak + 1 : 1)
      setLastDay(today)
    }
    setXp(newXp)
    setTasks(tasks.filter((t) => t.id !== id))
    if (newLevel > prevLevel) showToast(`🎉 LEVEL UP! Você chegou ao Nível ${newLevel}!`)
    else showToast(`✅ +${task.xp} XP conquistado!`)
  }

  const deleteTask = (id) => setTasks(tasks.filter((t) => t.id !== id))

  const level = Math.floor(xp / 100) + 1
  const progress = ((xp % 100) / 100) * 100

  return (
    <div className="nr-app">
      <style>{CSS}</style>

      {toast && <div className="nr-toast">{toast}</div>}

      <header className="nr-hero">
        <div className="nr-logo">
          <RatLogo />
        </div>
        <h1 className="nr-wordmark">No Rats</h1>
        <p className="nr-tagline">Transforme suas tarefas domésticas em conquistas</p>
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
            <div className="nr-prog">
              <div className="nr-prog-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="nr-sub">{xp % 100}/100 XP</div>
          </div>

          <div className="nr-card nr-stat">
            <div className="nr-chip" style={{ background: '#fef3c7' }}>🔥</div>
            <div className="nr-stat-val" style={{ color: '#f59e0b' }}>{streak}</div>
            <div className="nr-stat-label">{streak === 1 ? 'Dia seguido' : 'Dias seguidos'}</div>
          </div>

          <div className="nr-card nr-stat">
            <div className="nr-chip" style={{ background: '#fce7f3' }}>📋</div>
            <div className="nr-stat-val" style={{ color: '#db2777' }}>{tasks.length}</div>
            <div className="nr-stat-label">Pendentes</div>
          </div>
        </section>

        <section className="nr-panel">
          <h2 className="nr-h">Nova tarefa</h2>
          <div className="nr-row">
            <input
              className="nr-input"
              type="text"
              placeholder="Ex: Lavar a louça, limpar o quarto…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && createTask()}
            />
            <button className="nr-btn nr-btn-primary" onClick={createTask}>
              Adicionar
            </button>
          </div>
          <div className="nr-pills">
            {Object.entries(DIFFICULTIES).map(([key, d]) => {
              const active = difficulty === key
              return (
                <button
                  key={key}
                  className="nr-pill"
                  onClick={() => setDifficulty(key)}
                  style={active ? { background: d.color, borderColor: d.color, color: '#fff' } : undefined}
                >
                  {d.label} · +{d.xp} XP
                </button>
              )
            })}
          </div>
        </section>

        <section>
          <h2 className="nr-list-title">Minhas tarefas · {tasks.length}</h2>
          {tasks.length === 0 ? (
            <div className="nr-empty">
              <div style={{ fontSize: '34px', marginBottom: '8px' }}>🧹</div>
              Tudo limpo por aqui! Adicione sua primeira tarefa acima.
            </div>
          ) : (
            <div className="nr-tasks">
              {tasks.map((task) => {
                const d = DIFFICULTIES[task.difficulty] || DIFFICULTIES.simples
                return (
                  <div className="nr-task" key={task.id} style={{ borderLeftColor: d.color }}>
                    <div style={{ minWidth: 0 }}>
                      <div className="nr-task-title">{task.title}</div>
                      <span className="nr-badge" style={{ background: d.color }}>
                        {d.label} · +{task.xp} XP
                      </span>
                    </div>
                    <div className="nr-actions">
                      <button className="nr-btn nr-complete" onClick={() => completeTask(task.id)}>
                        ✓ Completar
                      </button>
                      <button className="nr-btn nr-del" title="Excluir" onClick={() => deleteTask(task.id)}>
                        🗑️
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <footer className="nr-footer">
          No Rats · seus dados ficam salvos com segurança neste navegador
        </footer>
      </main>
    </div>
  )
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
* { box-sizing: border-box; }
body { margin: 0; }
.nr-app {
  min-height: 100vh;
  background: #f1f5f9;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #0f172a;
  -webkit-font-smoothing: antialiased;
}
.nr-hero {
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  padding: 52px 20px 70px;
  text-align: center;
  color: #fff;
}
.nr-logo {
  width: 76px; height: 76px;
  margin: 0 auto;
  border-radius: 22px;
  background: rgba(255,255,255,0.16);
  border: 1px solid rgba(255,255,255,0.28);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 10px 28px rgba(0,0,0,0.22);
}
.nr-logo svg { width: 46px; height: 46px; color: #fff; }
.nr-wordmark { font-size: 36px; font-weight: 800; letter-spacing: -0.025em; margin: 18px 0 6px; }
.nr-tagline { opacity: 0.88; font-size: 15px; margin: 0; font-weight: 500; }
.nr-container { max-width: 880px; margin: -40px auto 0; padding: 0 20px 64px; }
.nr-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 16px; margin-bottom: 22px; }
.nr-card {
  background: #fff; border: 1px solid #e9ecf2; border-radius: 18px; padding: 20px;
  box-shadow: 0 4px 16px rgba(15,23,42,0.06);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.nr-card:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(15,23,42,0.10); }
.nr-stat { display: flex; flex-direction: column; gap: 8px; }
.nr-chip { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 19px; }
.nr-stat-val { font-size: 30px; font-weight: 800; line-height: 1; letter-spacing: -0.02em; }
.nr-stat-label { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
.nr-sub { font-size: 11px; color: #94a3b8; font-weight: 500; }
.nr-prog { height: 7px; background: #eef2f7; border-radius: 999px; overflow: hidden; margin-top: 4px; }
.nr-prog-fill { height: 100%; background: linear-gradient(90deg, #4f46e5, #7c3aed); border-radius: 999px; transition: width 0.4s ease; }
.nr-panel {
  background: #fff; border: 1px solid #e9ecf2; border-radius: 18px; padding: 22px;
  box-shadow: 0 4px 16px rgba(15,23,42,0.06); margin-bottom: 26px;
}
.nr-h { font-size: 15px; font-weight: 700; margin: 0 0 14px; }
.nr-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
.nr-input { flex: 1; min-width: 200px; padding: 12px 15px; font-size: 14px; border: 1.5px solid #e2e8f0; border-radius: 12px; outline: none; font-family: inherit; transition: border-color 0.15s ease; }
.nr-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.12); }
.nr-btn { padding: 12px 22px; border: none; border-radius: 12px; font-weight: 700; font-size: 14px; cursor: pointer; font-family: inherit; transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease, color 0.15s ease; }
.nr-btn-primary { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #fff; box-shadow: 0 4px 14px rgba(79,70,229,0.35); }
.nr-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 7px 20px rgba(79,70,229,0.45); }
.nr-pills { display: flex; gap: 10px; flex-wrap: wrap; }
.nr-pill { padding: 8px 15px; border-radius: 999px; border: 1.5px solid #e2e8f0; background: #fff; color: #64748b; font-weight: 600; font-size: 13px; cursor: pointer; font-family: inherit; transition: all 0.15s ease; }
.nr-pill:hover { border-color: #cbd5e1; }
.nr-list-title { font-size: 15px; font-weight: 700; color: #334155; margin: 0 0 14px; }
.nr-tasks { display: grid; gap: 12px; }
.nr-task {
  display: flex; justify-content: space-between; align-items: center; gap: 12px;
  background: #fff; border: 1px solid #e9ecf2; border-left: 4px solid #10b981; border-radius: 14px;
  padding: 14px 16px; box-shadow: 0 2px 8px rgba(15,23,42,0.05);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.nr-task:hover { transform: translateX(2px); box-shadow: 0 6px 16px rgba(15,23,42,0.10); }
.nr-task-title { font-size: 16px; font-weight: 600; color: #1e293b; margin-bottom: 7px; }
.nr-badge { display: inline-block; padding: 3px 11px; border-radius: 999px; font-size: 11px; font-weight: 700; color: #fff; }
.nr-actions { display: flex; gap: 8px; flex-shrink: 0; }
.nr-complete { background: #10b981; color: #fff; }
.nr-complete:hover { background: #059669; transform: translateY(-1px); }
.nr-del { background: #f1f5f9; color: #94a3b8; }
.nr-del:hover { background: #fee2e2; color: #ef4444; }
.nr-empty { background: #fff; border: 1.5px dashed #cbd5e1; border-radius: 16px; padding: 44px 24px; text-align: center; color: #94a3b8; font-size: 15px; font-weight: 500; }
.nr-footer { text-align: center; margin-top: 40px; color: #94a3b8; font-size: 13px; font-weight: 500; }
.nr-toast {
  position: fixed; top: 24px; left: 50%; transform: translate(-50%, 0);
  background: #0f172a; color: #fff; padding: 13px 24px; border-radius: 999px;
  font-weight: 600; font-size: 14px; box-shadow: 0 14px 36px rgba(0,0,0,0.32);
  z-index: 1000; animation: nrpop 0.25s ease;
}
@keyframes nrpop { from { opacity: 0; transform: translate(-50%, -10px); } to { opacity: 1; transform: translate(-50%, 0); } }
`
