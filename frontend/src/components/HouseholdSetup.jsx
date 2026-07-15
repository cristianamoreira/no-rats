import { useState } from 'react'
import { EMOJIS } from '../lib/constants'
import RatLogo from './RatLogo'

export default function HouseholdSetup({ onCreate, onJoin, onLogout, initialCode = '', initialMode = 'create', initialName = '' }) {
  const [mode, setMode] = useState(initialMode)
  const [casa, setCasa] = useState('Minha casa')
  const [name, setName] = useState(initialName)
  const [emoji, setEmoji] = useState('👩')
  const [code, setCode] = useState(initialCode)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const go = async () => {
    if (!name.trim()) return setMsg('Digite seu nome.')
    setBusy(true)
    setMsg('')
    try {
      if (mode === 'create') {
        await onCreate(casa.trim() || 'Minha casa', name.trim(), emoji)
      } else {
        if (!code.trim()) { setBusy(false); return setMsg('Digite o código da casa.') }
        await onJoin(code.trim().toUpperCase(), name.trim(), emoji)
      }
    } catch (e) {
      setMsg(e.message || 'Algo deu errado.')
      setBusy(false)
    }
  }

  return (
    <div className="nr-auth">
      <div className="nr-auth-card">
        <div className="nr-logo" style={{ marginBottom: '18px' }}><RatLogo /></div>
        <h1 className="nr-auth-title">Bem-vindo!</h1>
        <div className="nr-toggle" style={{ margin: '14px auto 18px' }}>
          <button className={mode === 'create' ? 'active' : ''} onClick={() => setMode('create')}>Criar casa</button>
          <button className={mode === 'join' ? 'active' : ''} onClick={() => setMode('join')}>Entrar numa casa</button>
        </div>
        {mode === 'create' ? (
          <input className="nr-input" style={{ width: '100%', marginBottom: '10px' }} placeholder="Nome da casa (ex: Casa da Ana)" value={casa} onChange={(e) => setCasa(e.target.value)} />
        ) : (
          <input className="nr-input" style={{ width: '100%', marginBottom: '10px' }} placeholder="Código da casa (ex: A1B2C)" value={code} onChange={(e) => setCode(e.target.value)} />
        )}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <select className="nr-emoji-select" value={emoji} onChange={(e) => setEmoji(e.target.value)}>
            {EMOJIS.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <input className="nr-input" style={{ flex: 1 }} placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        {msg && <div className="nr-auth-msg">{msg}</div>}
        <button className="nr-btn nr-btn-primary" style={{ width: '100%', marginTop: '6px' }} onClick={go} disabled={busy}>
          {busy ? 'Aguarde…' : mode === 'create' ? 'Criar minha casa' : 'Entrar na casa'}
        </button>
        <button className="nr-linkbtn" onClick={onLogout}>Sair da conta</button>
      </div>
    </div>
  )
}
