import { useState } from 'react'
import { compressImage } from '../lib/image'

export default function CheckinModal({ routine, onConfirm, onClose }) {
  const [before, setBefore] = useState(null)
  const [after, setAfter] = useState(null)
  const pick = (setter) => (e) => {
    const f = e.target.files && e.target.files[0]
    if (f) compressImage(f, setter)
  }
  const canConfirm = !!(before || after)
  return (
    <div className="nr-modal-bg" onClick={onClose}>
      <div className="nr-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="nr-h" style={{ marginBottom: '4px' }}>📸 Check-in</h3>
        <div className="nr-meta" style={{ marginBottom: '16px' }}>{routine.title} — tire ao menos uma foto para concluir.</div>
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
        <div className="nr-modal-actions">
          <button className="nr-btn nr-del" onClick={onClose}>Cancelar</button>
          <button className="nr-btn nr-btn-primary" onClick={() => onConfirm({ before, after })} disabled={!canConfirm}>Registrar check-in</button>
        </div>
      </div>
    </div>
  )
}
