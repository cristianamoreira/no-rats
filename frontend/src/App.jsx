import { useState } from 'react'

export default function App() {
  const [tasks, setTasks] = useState([])
  const [title, setTitle] = useState('')
  const [xp, setXp] = useState(0)

  const createTask = () => {
    if (!title) return alert('Digite um título!')
    const newTask = {
      id: Date.now(),
      title,
      xp: 10,
    }
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

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>🐀 No Rats MVP</h1>
      <div style={{ background: '#f0f0f0', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <p>⭐ XP Total: {xp}</p>
        <p>Nível: {Math.floor(xp / 100) + 1}</p>
      </div>
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Nova tarefa..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ padding: '10px', width: '300px' }}
        />
        <button onClick={createTask} style={{ padding: '10px 20px', marginLeft: '10px', background: 'green', color: 'white' }}>
          + Criar Tarefa
        </button>
      </div>
      <h2>📋 Tarefas ({tasks.length})</h2>
      {tasks.map(task => (
        <div key={task.id} style={{ background: '#e8f4f8', padding: '10px', marginBottom: '10px', borderRadius: '4px' }}>
          <p><strong>{task.title}</strong> - {task.xp} XP</p>
          <button onClick={() => completeTask(task.id)} style={{ background: 'blue', color: 'white', padding: '5px 10px' }}>
            ✓ Completar
          </button>
        </div>
      ))}
    </div>
  )
}
