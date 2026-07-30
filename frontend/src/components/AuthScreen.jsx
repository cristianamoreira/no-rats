import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { traduz } from '../lib/errors'
import RatLogo from './RatLogo'

export default function AuthScreen() {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const submit = async () => {
    if (mode === 'forgot') return sendReset()
    if (!email.trim() || !pw) return setMsg('Preencha email e senha.')
    setBusy(true)
    setMsg('')
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw })
      if (error) setMsg(traduz(error.message))
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: pw,
        options: {
          data: { name: name.trim() },
          emailRedirectTo: window.location.origin,
        },
      })
      if (error) setMsg(traduz(error.message))
      else if (!data.session) {
        setMsg('📧 Enviamos um e-mail de confirmação para a sua caixa de entrada. Confira também o spam e clique no link para ativar sua conta.')
      }
    }
    setBusy(false)
  }

  const sendReset = async () => {
    if (!email.trim()) return setMsg('Digite seu email para recuperar a senha.')
    setBusy(true)
    setMsg('')
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    })
    if (error) setMsg(traduz(error.message))
    else setMsg('📧 Se este email tiver conta, enviamos um link para redefinir a senha. Confira sua caixa de entrada.')
    setBusy(false)
  }

  return (
    <div className="nr-auth">
      <div className="nr-auth-card">
        <div className="nr-logo" style={{ marginBottom: '18px' }}><RatLogo /></div>
        <h1 className="nr-auth-title">No Rats</h1>
        <p className="nr-auth-sub">{mode === 'login' ? 'Entre na sua conta' : mode === 'signup' ? 'Crie sua conta' : 'Recuperar senha'}</p>
        <input className="nr-input" style={{ width: '100%', marginBottom: '10px' }} type="email" placeholder="Seu email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyPress={(e) => mode === 'forgot' && e.key === 'Enter' && submit()} />
        {mode !== 'forgot' && (
          <>
            {mode === 'signup' && (
              <input className="nr-input" style={{ width: '100%', marginBottom: '10px' }} type="text" placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} />
            )}
            <input className="nr-input" style={{ width: '100%', marginBottom: '10px' }} type="password" placeholder="Senha (mín. 6 caracteres)" value={pw} onChange={(e) => setPw(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && submit()} />
          </>
        )}
        {msg && <div className="nr-auth-msg">{msg}</div>}
        <button className="nr-btn nr-btn-primary" style={{ width: '100%', marginTop: '6px' }} onClick={submit} disabled={busy}>
          {busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Criar conta' : 'Enviar link de recuperação'}
        </button>
        {mode === 'login' && (
          <button className="nr-linkbtn" onClick={() => { setMode('forgot'); setMsg('') }}>
            Esqueci minha senha
          </button>
        )}
        {mode === 'forgot' ? (
          <button className="nr-linkbtn" onClick={() => { setMode('login'); setMsg('') }}>
            ← Voltar para o login
          </button>
        ) : (
          <button className="nr-linkbtn" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMsg('') }}>
            {mode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
          </button>
        )}
      </div>
    </div>
  )
}
