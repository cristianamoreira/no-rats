import { useState } from 'react'
import { compressImage } from '../lib/image'

export default function CheckinModal({ routine, onConfirm, onClose }) {
  const [photos, setPhotos] = useState([])

  const addPhotos = (e) => {
    const files = Array.from(e.target.files || [])
    files.forEach((f) => compressImage(f, (url) => setPhotos((p) => [...p, url])))
    e.target.value = ''
  }
  const removeAt = (i) => setPhotos((p) => p.filter((_, idx) => idx !== i))
  const canConfirm = photos.length > 0

  return (
    <div className="nr-modal-bg" onClick={onClose}>
      <div className="nr-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="nr-h" style={{ marginBottom: '4px' }}>📸 Check-in</h3>
        <div className="nr-meta" style={{ marginBottom: '16px' }}>{routine.title} — adicione ao menos uma foto para concluir.</div>
        <div className="nr-photo-grid">
          {photos.map((src, i) => (
            <div className="nr-photo-thumb" key={i}>
              <img src={src} alt={'foto ' + (i + 1)} />
              <button className="nr-photo-del" onClick={() => removeAt(i)} aria-label="Remover foto">✕</button>
            </div>
          ))}
          <label className="nr-photo-add">
            <span>＋<br />Foto</span>
            <input type="file" accept="image/*" capture="environment" multiple style={{ display: 'none' }} onChange={addPhotos} />
          </label>
        </div>
        <div className="nr-modal-actions">
          <button className="nr-btn nr-del" onClick={onClose}>Cancelar</button>
          <button className="nr-btn nr-btn-primary" onClick={() => onConfirm({ photos })} disabled={!canConfirm}>Registrar check-in</button>
        </div>
      </div>
    </div>
  )
}
