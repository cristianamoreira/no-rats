import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { traduz } from '../lib/errors'
import { resetRedirectTo } from '../lib/authRedirect'
import RatLogo from './RatLogo'

export default function AuthScreen() {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [pending, setPending] = useState(false) // conta aguardando confirmação por e-mail
  const [showPw, setShowPw] = useState(false)

  const submit = async () => {
    if (mode === 'signup' && !name.trim()) return setMsg('Digite seu nome.')
    if (!email.trim() || !pw) return setMsg('Preencha email e senha.')
    setBusy(true)
    setMsg('')
    setPending(false)
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw })
      if (error) {
        setMsg(traduz(error.message))
        if (/Email not confirmed/i.test(error.message)) setPending(true)
      }
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
        setPending(true)
      }
    }
    setBusy(false)
  }

  const forgotPw = async () => {
    if (!email.trim()) return setMsg('Digite o email da conta para recuperar a senha.')
    setBusy(true)
    setMsg('')
    setPending(false)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: resetRedirectTo(),
    })
    setMsg(error ? traduz(error.message) : '📧 Enviamos um link para redefinir sua senha. Confira a caixa de entrada e o spam.')
    setBusy(false)
  }

  const resend = async () => {
    if (!email.trim()) return setMsg('Digite o email da conta para reenviar.')
    setBusy(true)
    setMsg('')
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    })
    setMsg(error ? traduz(error.message) : '📧 E-mail de confirmação reenviado! Confira a caixa de entrada e o spam.')
    setBusy(false)
  }

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login')
    setMsg('')
    setPending(false)
  }

  return (
    <div className="nr-auth">
      <div className="nr-auth-shell">
        <div className="nr-auth-pitch">
          <div className="nr-logo"><RatLogo /></div>
          <h1 className="nr-auth-brand">No <em>Rats</em></h1>
          <p className="nr-auth-hook">Ninguém quer ser o rato da casa.</p>
          <p className="nr-auth-lead">Transforme as tarefas de casa num jogo que a família toda joga: cada tarefa vale XP, quem cuida sobe no placar e quem vacila ganha um rato.</p>
          <ul className="nr-auth-points">
            <li><span>🧀</span><div>Fez uma tarefa? <b>Ganha XP</b> e sobe no ranking da semana.</div></li>
            <li><span>🐀</span><div>Deixou vencer? <b>Leva um rato</b> — e a família toda vê.</div></li>
            <li><span>🥷</span><div>Pode <b>roubar a tarefa</b> de quem vacilou e ficar com os pontos.</div></li>
          </ul>
        </div>
        <div className="nr-auth-card">
          <h2 className="nr-auth-title">{mode === 'login' ? 'Entrar' : 'Criar conta'}</h2>
          <p className="nr-auth-sub">{mode === 'login' ? 'Bem-vindo de volta ao placar.' : 'Leva menos de um minuto.'}</p>
          {mode === 'signup' && (
            <input className="nr-input" style={{ width: '100%', marginBottom: '10px' }} type="text" placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} />
          )}
          <input className="nr-input" style={{ width: '100%', marginBottom: '10px' }} type="email" placeholder="Seu email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <div style={{ position: 'relative', marginBottom: '10px' }}>
            <input className="nr-input" style={{ width: '100%', paddingRight: '46px' }} type={showPw ? 'text' : 'password'} placeholder="Senha (mín. 6 caracteres)" value={pw} onChange={(e) => setPw(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && submit()} />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? 'Ocultar senha' : 'Mostrar senha'}
              title={showPw ? 'Ocultar senha' : 'Mostrar senha'}
              style={{ position: 'absolute', top: '50%', right: '8px', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 0, padding: '6px', color: '#888' }}
            >
              {showPw ? (
                // olho aberto — senha visível
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              ) : (
                // olho fechado (riscado) — senha secreta
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19M6.61 6.61A18.5 18.5 0 0 0 2 12s3.5 8 10 8a9.12 9.12 0 0 0 5.39-1.61" />
                  <path d="M9.88 9.88a3 3 0 0 0 4.24 4.24" />
                  <line x1="2" y1="2" x2="22" y2="22" />
                </svg>
              )}
            </button>
          </div>
          {msg && <div className="nr-auth-msg">{msg}</div>}
          <button className="nr-btn nr-btn-primary" style={{ width: '100%', marginTop: '6px' }} onClick={submit} disabled={busy}>
            {busy ? 'Aguarde…' : mode === 'login' ? 'Entrar no jogo' : 'Criar minha conta'}
          </button>
          {pending && (
            <button className="nr-linkbtn" onClick={resend} disabled={busy} style={{ display: 'block' }}>
              Reenviar e-mail de confirmação
            </button>
          )}
          {mode === 'login' && (
            <button className="nr-linkbtn" onClick={forgotPw} disabled={busy} style={{ display: 'block' }}>
              Esqueceu sua senha?
            </button>
          )}
          <button className="nr-linkbtn" onClick={toggleMode}>
            {mode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
          </button>
        </div>
      </div>
    </div>
  )
}
