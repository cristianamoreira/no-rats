import { useState } from 'react'
import { compressImage } from '../lib/image'

export default function CheckinModal({ routine, members, defaultCredit, onConfirm, onClose }) {
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
