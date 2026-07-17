import { useState } from 'react'
import { FREQUENCIES, SUGGESTIONS } from '../lib/constants'

const PILL_ACTIVE = { background: '#F4A72B', borderColor: '#221F2B', color: '#221F2B', boxShadow: '2px 2px 0 #221F2B' }
const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

export default function NewRoutinePanel({ members, routines = [], onAdd }) {
  const [rTitle, setRTitle] = useState('')
  const [rFreq, setRFreq] = useState('semanal')
  const [rXp, setRXp] = useState(15)
  const [rOwner, setROwner] = useState('') // '' = Livre
  const [rCustomDays, setRCustomDays] = useState(10)
  const [showSug, setShowSug] = useState(false)

  const setFreqForm = (key) => {
    setRFreq(key)
    if (FREQUENCIES[key]) setRXp(FREQUENCIES[key].xp)
  }
  const useSuggestion = (sug) => {
    setRTitle(sug.title)
    setFreqForm(sug.freq)
    setShowSug(false)
  }
  const submit = () => {
    const t = rTitle.trim()
    if (!t) return onAdd({ title: '', freq: rFreq, xp: rXp, ownerId: rOwner || null }) // hook mostra o aviso de nome
    const dup = routines.some((r) => (r.title || '').trim().toLowerCase() === t.toLowerCase())
    if (dup && !window.confirm(`Já existe uma rotina chamada "${t}". Quer adicionar mesmo assim?`)) return
    onAdd({ title: t, freq: rFreq, xp: rXp, ownerId: rOwner || null, customDays: rCustomDays })
    setRTitle('')
    setShowSug(false)
  }

  const usedTitles = new Set(routines.map((r) => (r.title || '').trim().toLowerCase()))
  const q = norm(rTitle)
  const matches = q.length >= 2
    ? SUGGESTIONS.filter((s) => {
        const t = norm(s.title)
        return t.includes(q) && t !== q && !usedTitles.has(s.title.trim().toLowerCase())
      }).slice(0, 6)
    : []
  const freshSuggestions = SUGGESTIONS.filter((s) => !usedTitles.has(s.title.trim().toLowerCase())).slice(0, 6)

  return (
    <section className="nr-panel">
      <h2 className="nr-h">Nova rotina</h2>
      <div className="nr-row">
        <div className="nr-typeahead">
          <input
            className="nr-input"
            type="text"
            placeholder="Ex: lavar, limpar, varrer…"
            value={rTitle}
            onChange={(e) => { setRTitle(e.target.value); setShowSug(true) }}
            onFocus={() => setShowSug(true)}
            onBlur={() => setShowSug(false)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setShowSug(false) }}
          />
          {showSug && matches.length > 0 && (
            <div className="nr-typeahead-list">
              {matches.map((s) => (
                <button
                  key={s.title}
                  type="button"
                  className="nr-typeahead-item"
                  onMouseDown={(e) => { e.preventDefault(); useSuggestion(s) }}
                >
                  <span>{s.title}</span>
                  <span className="nr-typeahead-freq">{FREQUENCIES[s.freq] ? FREQUENCIES[s.freq].label : ''}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="nr-btn nr-btn-primary" onClick={submit}>Adicionar</button>
      </div>
      <div className="nr-form-grid">
        <div>
          <div className="nr-field-label">Frequência</div>
          <div className="nr-pills">
            {Object.entries(FREQUENCIES).map(([key, f]) => (
              <button key={key} className="nr-pill" onClick={() => setFreqForm(key)} style={rFreq === key ? PILL_ACTIVE : undefined}>{f.label}</button>
            ))}
            <button className="nr-pill" onClick={() => setFreqForm('custom')} style={rFreq === 'custom' ? PILL_ACTIVE : undefined}>Personalizada</button>
          </div>
          {rFreq === 'custom' && (
            <div className="nr-freq-row" style={{ marginTop: '10px' }}>
              <span className="nr-freq-lbl">A cada</span>
              <input className="nr-num" style={{ width: '76px' }} type="number" min="1" value={rCustomDays} onChange={(e) => setRCustomDays(e.target.value)} />
              <span className="nr-freq-lbl">dias</span>
            </div>
          )}
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
      {freshSuggestions.length > 0 && (
        <>
          <div className="nr-field-label" style={{ marginTop: '16px' }}>💡 Sugestões — toque para preencher</div>
          <div className="nr-suggests">
            {freshSuggestions.map((s) => <button key={s.title} className="nr-suggest" onClick={() => useSuggestion(s)}>+ {s.title}</button>)}
          </div>
        </>
      )}
    </section>
  )
}
