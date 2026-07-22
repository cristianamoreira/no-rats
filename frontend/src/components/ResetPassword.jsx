import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { traduz } from '../lib/errors'
import RatLogo from './RatLogo'

export default function ResetPassword({ onDone }) {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [showPw, setShowPw] = useState(false)

  const submit = async () => {
    if (pw.length < 6) return setMsg('A senha precisa ter pelo menos 6 caracteres.')
    if (pw !== pw2) return setMsg('As senhas não conferem.')
    setBusy(true)
    setMsg('')
    const { error } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (error) {
      setMsg(traduz(error.message))
    } else {
      onDone()
    }
  }

  return (
    <div className="nr-auth">
      <div className="nr-auth-shell">
        <div className="nr-auth-card" style={{ margin: '0 auto' }}>
          <div className="nr-logo" style={{ marginBottom: '12px' }}><RatLogo /></div>
          <h2 className="nr-auth-title">Definir nova senha</h2>
          <p className="nr-auth-sub">Escolha uma nova senha para voltar ao placar.</p>
          <div style={{ position: 'relative', marginBottom: '10px' }}>
            <input className="nr-input" style={{ width: '100%', paddingRight: '46px' }} type={showPw ? 'text' : 'password'} placeholder="Nova senha (mín. 6 caracteres)" value={pw} onChange={(e) => setPw(e.target.value)} />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? 'Ocultar senha' : 'Mostrar senha'}
              title={showPw ? 'Ocultar senha' : 'Mostrar senha'}
              style={{ position: 'absolute', top: '50%', right: '8px', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 0, padding: '6px', color: '#888' }}
            >
              {showPw ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19M6.61 6.61A18.5 18.5 0 0 0 2 12s3.5 8 10 8a9.12 9.12 0 0 0 5.39-1.61" />
                  <path d="M9.88 9.88a3 3 0 0 0 4.24 4.24" />
                  <line x1="2" y1="2" x2="22" y2="22" />
                </svg>
              )}
            </button>
          </div>
          <input className="nr-input" style={{ width: '100%', marginBottom: '10px' }} type={showPw ? 'text' : 'password'} placeholder="Repita a nova senha" value={pw2} onChange={(e) => setPw2(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && submit()} />
          {msg && <div className="nr-auth-msg">{msg}</div>}
          <button className="nr-btn nr-btn-primary" style={{ width: '100%', marginTop: '6px' }} onClick={submit} disabled={busy}>
            {busy ? 'Aguarde…' : 'Salvar nova senha'}
          </button>
        </div>
      </div>
    </div>
  )
}
