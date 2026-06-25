import { useState } from 'react'

export default function App() {
  const [tasks, setTasks] = useState([])
  const [title, setTitle] = useState('')
  const [xp, setXp] = useState(0)

  const createTask = () => {
    if (!title.trim()) return alert('Digite um título!')
    const newTask = { id: Date.now(), title, xp: 10 }
    setTasks([...tasks, newTask])
    setTitle('')
  }

  const completeTask = (id) => {
    const task = tasks.find(t => t.id === id)
    if (task) {
      setXp(xp + task.xp)
      setTasks(tasks.filter(t => t.id !== id))
      alert(`✅ +${task.xp} XP!`)
    }
  }

  const level = Math.floor(xp / 100) + 1

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', fontFamily: "'Segoe UI', sans-serif", padding: '20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px', color: 'white' }}>
        <h1 style={{ fontSize: '48px', margin: '0 0 10px 0', fontWeight: '800' }}>🐀 No Rats</h1>
        <p style={{ fontSize: '16px', opacity: 0.9 }}>Gamifique suas tarefas</p>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto 40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: '#666', margin: '0 0 8px 0', textTransform: 'uppercase' }}>⭐ XP Total</p>
          <h2 style={{ fontSize: '36px', margin: '0', color: '#667eea', fontWeight: '800' }}>{xp}</h2>
        </div>
        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: '#666', margin: '0 0 8px 0', textTransform: 'uppercase' }}>🎖️ Nível</p>
          <h2 style={{ fontSize: '36px', margin: '0', color: '#764ba2', fontWeight: '800' }}>{level}</h2>
          <div style={{ marginTop: '12px', background: '#eee', borderRadius: '8px', height: '8px' }}>
            <div style={{ background: 'linear-gradient(90deg, #667eea, #764ba2)', height: '100%', width: `${((xp % 100) / 100) * 100}%` }} />
          </div>
        </div>
        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: '#666', margin: '0 0 8px 0', textTransform: 'uppercase' }}>📋 Tarefas</p>
          <h2 style={{ fontSize: '36px', margin: '0', color: '#f093fb', fontWeight: '800' }}>{tasks.length}</h2>
        </div>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto 40px', background: 'white', borderRadius: '16px', padding: '28px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#333', fontSize: '18px', fontWeight: '700' }}>➕ Nova Tarefa</h3>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input type="text" placeholder="Ex: Lavar louça..." value={title} onChange={(e) => setTitle(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && createTask()} style={{ flex: 1, padding: '12px 16px', fontSize: '14px', border: '2px solid #eee', borderRadius: '12px' }} />
          <button onClick={createTask} style={{ padding: '12px 28px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}>
            Criar
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h3 style={{ color: 'white', marginBottom: '16px' }}>📝 Tarefas ({tasks.length})</h3>
        {tasks.length === 0 ? (
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '16px', padding: '40px', textAlign: 'center', color: 'white' }}>
            <p>Nenhuma tarefa! 🎉 Crie uma para começar!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {tasks.map(task => (
              <div key={task.id} style={{ background: 'white', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>{task.title}</p>
                  <span style={{ background: '#f093fb', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>+{task.xp} XP</span>
                </div>
                <button onClick={() => completeTask(task.id)} style={{ padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>
                  ✓ Completar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
