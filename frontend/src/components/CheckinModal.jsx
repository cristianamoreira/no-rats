import { useState } from 'react'
import { compressImageToBlob } from '../lib/image'
import { uploadCheckinPhoto } from '../lib/storage'

export default function CheckinModal({ routine, householdId, showToast, onConfirm, onClose }) {
  const [photos, setPhotos] = useState([]) // URLs públicas já enviadas ao Storage
  const [busy, setBusy] = useState(0) // uploads em andamento
  const [error, setError] = useState('')

  const addPhotos = async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length) setError('')
    for (const f of files) {
      setBusy((n) => n + 1)
      try {
        const blob = await compressImageToBlob(f)
        const url = await uploadCheckinPhoto(householdId, routine.id, blob)
        setPhotos((p) => [...p, url])
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[checkin] falha ao adicionar foto:', err)
        const msg = (err && err.message) || 'Não consegui adicionar a foto. Tente de novo.'
        setError(msg)
        showToast && showToast('⚠️ ' + msg)
      } finally {
        setBusy((n) => n - 1)
      }
    }
  }
  const removeAt = (i) => setPhotos((p) => p.filter((_, idx) => idx !== i))
  const uploading = busy > 0
  const canConfirm = photos.length > 0 && !uploading

  return (
    <div className="nr-modal-bg" onClick={onClose}>
      <div className="nr-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="nr-h" style={{ marginBottom: '4px' }}>📸 Check-in</h3>
        <div className="nr-meta" style={{ marginBottom: '16px' }}>{routine.title} — adicione ao menos uma foto para concluir.</div>
        {error && (
          <div className="nr-auth-msg" style={{ marginBottom: '14px', background: 'var(--red-tint)', borderColor: '#F1B0B2', color: '#B4232A' }}>
            {error}
          </div>
        )}
        <div className="nr-photo-grid">
          {photos.map((src, i) => (
            <div className="nr-photo-thumb" key={i}>
              <img src={src} alt={'foto ' + (i + 1)} />
              <button className="nr-photo-del" onClick={() => removeAt(i)} aria-label="Remover foto">✕</button>
            </div>
          ))}
          {uploading ? (
            <div className="nr-photo-add" style={{ opacity: 0.6 }}>
              <span>⏳<br />Enviando</span>
            </div>
          ) : (
            <>
              {/* Câmera: capture abre a câmera na hora (single). */}
              <label className="nr-photo-add">
                <span>📷<br />Tirar</span>
                <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={addPhotos} />
              </label>
              {/* Galeria: sem capture, permite várias e é a alternativa confiável. */}
              <label className="nr-photo-add">
                <span>🖼️<br />Galeria</span>
                <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={addPhotos} />
              </label>
            </>
          )}
        </div>
        <div className="nr-modal-actions">
          <button className="nr-btn nr-del" onClick={onClose}>Cancelar</button>
          <button className="nr-btn nr-btn-primary" onClick={() => onConfirm({ photos })} disabled={!canConfirm}>
            {uploading ? 'Enviando foto…' : 'Registrar check-in'}
          </button>
        </div>
      </div>
    </div>
  )
}
