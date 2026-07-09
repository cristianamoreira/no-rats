import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { traduz } from '../lib/errors'
import RatLogo from './RatLogo'

export default function AuthScreen() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const submit = async () => {
    if (!email.trim() || !pw) return setMsg('Preencha email e senha.')
    setBusy(true)
    setMsg('')
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw })
      if (error) setMsg(traduz(error.message))
    } else {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: pw })
      if (error) setMsg(traduz(error.message))
      else if (!data.session) setMsg('📧 Enviamos um email de confirmação. Confirme e depois faça login.')
    }
    setBusy(false)
  }

  return (
    <div className="nr-auth">
      <div className="nr-auth-card">
        <div className="nr-logo" style={{ marginBottom: '18px' }}><RatLogo /></div>
        <h1 className="nr-auth-title">No Rats</h1>
        <p className="nr-auth-sub">{mode === 'login' ? 'Entre na sua conta' : 'Crie sua conta'}</p>
        <input className="nr-input" style={{ width: '100%', marginBottom: '10px' }} type="email" placeholder="Seu email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="nr-input" style={{ width: '100%', marginBottom: '10px' }} type="password" placeholder="Senha (mín. 6 caracteres)" value={pw} onChange={(e) => setPw(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && submit()} />
        {msg && <div className="nr-auth-msg">{msg}</div>}
        <button className="nr-btn nr-btn-primary" style={{ width: '100%', marginTop: '6px' }} onClick={submit} disabled={busy}>
          {busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
        </button>
        <button className="nr-linkbtn" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMsg('') }}>
          {mode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
        </button>
      </div>
    </div>
  )
}
