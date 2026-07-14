import { useState } from 'react'
import { FREQUENCIES, SUGGESTIONS } from '../lib/constants'

export default function NewRoutinePanel({ members, onAdd }) {
  const [rTitle, setRTitle] = useState('')
  const [rFreq, setRFreq] = useState('semanal')
  const [rXp, setRXp] = useState(15)
  const [rOwner, setROwner] = useState('') // '' = Livre

  const setFreqForm = (key) => {
    setRFreq(key)
    setRXp(FREQUENCIES[key].xp)
  }
  const useSuggestion = (sug) => {
    setRTitle(sug.title)
    setFreqForm(sug.freq)
  }
  const submit = () => {
    onAdd({ title: rTitle, freq: rFreq, xp: rXp, ownerId: rOwner || null })
    if (rTitle.trim()) setRTitle('')
  }

  return (
    <section className="nr-panel">
      <h2 className="nr-h">Nova rotina</h2>
      <div className="nr-row">
        <input className="nr-input" type="text" placeholder="Ex: Lavar as toalhas, tirar o lixo…" value={rTitle} onChange={(e) => setRTitle(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && submit()} />
        <button className="nr-btn nr-btn-primary" onClick={submit}>Adicionar</button>
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
          <select className="nr-owner-select" value={rOwner} onChange={(e) => setROwner(e.target.value)}>
            <option value="">🎯 Livre (qualquer um)</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.emoji} {m.name}</option>)}
          </select>
        </div>
      </div>
      <div className="nr-field-label" style={{ marginTop: '16px' }}>💡 Sugestões — toque para preencher</div>
      <div className="nr-suggests">
        {SUGGESTIONS.map((s) => <button key={s.title} className="nr-suggest" onClick={() => useSuggestion(s)}>+ {s.title}</button>)}
      </div>
    </section>
  )
}
