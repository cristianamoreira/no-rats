import { useState, useEffect } from 'react'

const DIFFICULTIES = {
  simples: { label: 'Simples', xp: 10, color: '#10b981' },
  medio: { label: 'Médio', xp: 25, color: '#f59e0b' },
  dificil: { label: 'Difícil', xp: 50, color: '#ef4444' },
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

  // Persiste tudo no navegador sempre que algo muda
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

    // Atualiza streak (sequência de dias)
    const today = todayStr()
    if (lastDay !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      setStreak(lastDay === yesterday ? streak + 1 : 1)
      setLastDay(today)
    }

    setXp(newXp)
    setTasks(tasks.filter((t) => t.id !== id))

    if (newLevel > prevLevel) {
      showToast(`🎉 LEVEL UP! Você chegou ao Nível ${newLevel}!`)
    } else {
      showToast(`✅ +${task.xp} XP conquistado!`)
    }
  }

  const deleteTask = (id) => {
    setTasks(tasks.filter((t) => t.id !== id))
  }

  const level = Math.floor(xp / 100) + 1
  const progress = ((xp % 100) / 100) * 100

  const card = {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
    textAlign: 'center',
  }
  const label = {
    fontSize: '12px',
    color: '#666',
    margin: '0 0 8px 0',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        fontFamily: "'Segoe UI', sans-serif",
        padding: '20px',
        margin: 0,
      }}
    >
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#1f2937',
            color: 'white',
            padding: '14px 28px',
            borderRadius: '999px',
            fontWeight: '700',
            fontSize: '15px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
            zIndex: 1000,
          }}
        >
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px', color: 'white' }}>
        <h1 style={{ fontSize: '48px', margin: '0 0 10px 0', fontWeight: '800' }}>🐀 No Rats</h1>
        <p style={{ fontSize: '16px', opacity: 0.9, margin: 0 }}>Gamifique suas tarefas domésticas</p>
      </div>

      {/* Stats */}
      <div
        style={{
          maxWidth: '900px',
          margin: '0 auto 40px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
        }}
      >
        <div style={card}>
          <p style={label}>⭐ XP Total</p>
          <h2 style={{ fontSize: '36px', margin: 0, color: '#667eea', fontWeight: '800' }}>{xp}</h2>
        </div>
        <div style={card}>
          <p style={label}>🎖️ Nível</p>
          <h2 style={{ fontSize: '36px', margin: 0, color: '#764ba2', fontWeight: '800' }}>{level}</h2>
          <div style={{ marginTop: '12px', background: '#eee', borderRadius: '8px', height: '8px' }}>
            <div
              style={{
                background: 'linear-gradient(90deg, #667eea, #764ba2)',
                height: '100%',
                borderRadius: '8px',
                width: `${progress}%`,
                transition: 'width 0.4s ease',
              }}
            />
          </div>
          <p style={{ fontSize: '11px', color: '#999', margin: '8px 0 0 0' }}>{xp % 100}/100 XP</p>
        </div>
        <div style={card}>
          <p style={label}>🔥 Streak</p>
          <h2 style={{ fontSize: '36px', margin: 0, color: '#ef4444', fontWeight: '800' }}>{streak}</h2>
          <p style={{ fontSize: '11px', color: '#999', margin: '8px 0 0 0' }}>
            {streak === 1 ? 'dia seguido' : 'dias seguidos'}
          </p>
        </div>
        <div style={card}>
          <p style={label}>📋 Tarefas</p>
          <h2 style={{ fontSize: '36px', margin: 0, color: '#f093fb', fontWeight: '800' }}>{tasks.length}</h2>
          <p style={{ fontSize: '11px', color: '#999', margin: '8px 0 0 0' }}>pendentes</p>
        </div>
      </div>

      {/* Nova tarefa */}
      <div
        style={{
          maxWidth: '900px',
          margin: '0 auto 40px',
          background: 'white',
          borderRadius: '16px',
          padding: '28px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        }}
      >
        <h3 style={{ margin: '0 0 16px 0', color: '#333', fontSize: '18px', fontWeight: '700' }}>➕ Nova Tarefa</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <input
            type="text"
            placeholder="Ex: Lavar louça, limpar quarto..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && createTask()}
            style={{
              flex: 1,
              minWidth: '200px',
              padding: '12px 16px',
              fontSize: '14px',
              border: '2px solid #eee',
              borderRadius: '12px',
              outline: 'none',
            }}
          />
          <button
            onClick={createTask}
            style={{
              padding: '12px 28px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontWeight: '700',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Criar Tarefa
          </button>
        </div>
        {/* Seletor de dificuldade */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {Object.entries(DIFFICULTIES).map(([key, d]) => (
            <button
              key={key}
              onClick={() => setDifficulty(key)}
              style={{
                padding: '8px 16px',
                borderRadius: '999px',
                border: difficulty === key ? `2px solid ${d.color}` : '2px solid #eee',
                background: difficulty === key ? d.color : 'white',
                color: difficulty === key ? 'white' : '#666',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {d.label} · +{d.xp} XP
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h3 style={{ color: 'white', marginBottom: '16px', fontSize: '18px', fontWeight: '700' }}>
          📝 Minhas Tarefas ({tasks.length})
        </h3>
        {tasks.length === 0 ? (
          <div
            style={{
              background: 'rgba(255,255,255,0.12)',
              borderRadius: '16px',
              padding: '40px',
              textAlign: 'center',
              color: 'white',
            }}
          >
            <p style={{ fontSize: '18px', margin: 0, opacity: 0.85 }}>Nenhuma tarefa! 🎉 Crie uma para começar!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {tasks.map((task) => {
              const d = DIFFICULTIES[task.difficulty] || DIFFICULTIES.simples
              return (
                <div
                  key={task.id}
                  style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>
                      {task.title}
                    </p>
                    <span
                      style={{
                        background: d.color,
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '700',
                      }}
                    >
                      {d.label} · +{task.xp} XP
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button
                      onClick={() => completeTask(task.id)}
                      style={{
                        padding: '8px 16px',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '700',
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      ✓ Completar
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      title="Excluir"
                      style={{
                        padding: '8px 12px',
                        background: '#f3f4f6',
                        color: '#9ca3af',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '700',
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', marginTop: '50px', color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>
        🐀 No Rats · seus dados ficam salvos neste navegador
      </div>
    </div>
  )
}
