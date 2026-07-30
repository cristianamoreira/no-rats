import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { traduz } from '../lib/errors'
import RatLogo from './RatLogo'

export default function ResetPasswordScreen({ onDone }) {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const submit = async () => {
    if (pw.length < 6) return setMsg('A senha precisa ter no mínimo 6 caracteres.')
    if (pw !== pw2) return setMsg('As senhas não conferem.')
    setBusy(true)
    setMsg('')
    const { error } = await supabase.auth.updateUser({ password: pw })
    if (error) {
      setMsg(traduz(error.message))
      setBusy(false)
      return
    }
    setMsg('✅ Senha alterada! Entrando…')
    onDone()
  }

  return (
    <div className="nr-auth">
      <div className="nr-auth-card">
        <div className="nr-logo" style={{ marginBottom: '18px' }}><RatLogo /></div>
        <h1 className="nr-auth-title">No Rats</h1>
        <p className="nr-auth-sub">Defina uma nova senha</p>
        <input className="nr-input" style={{ width: '100%', marginBottom: '10px' }} type="password" placeholder="Nova senha (mín. 6 caracteres)" value={pw} onChange={(e) => setPw(e.target.value)} />
        <input className="nr-input" style={{ width: '100%', marginBottom: '10px' }} type="password" placeholder="Repita a nova senha" value={pw2} onChange={(e) => setPw2(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && submit()} />
        {msg && <div className="nr-auth-msg">{msg}</div>}
        <button className="nr-btn nr-btn-primary" style={{ width: '100%', marginTop: '6px' }} onClick={submit} disabled={busy}>
          {busy ? 'Aguarde…' : 'Salvar nova senha'}
        </button>
      </div>
    </div>
  )
}
