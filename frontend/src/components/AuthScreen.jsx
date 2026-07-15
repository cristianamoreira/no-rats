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
          <input className="nr-input" style={{ width: '100%', marginBottom: '10px' }} type="email" placeholder="Seu email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="nr-input" style={{ width: '100%', marginBottom: '10px' }} type="password" placeholder="Senha (mín. 6 caracteres)" value={pw} onChange={(e) => setPw(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && submit()} />
          {msg && <div className="nr-auth-msg">{msg}</div>}
          <button className="nr-btn nr-btn-primary" style={{ width: '100%', marginTop: '6px' }} onClick={submit} disabled={busy}>
            {busy ? 'Aguarde…' : mode === 'login' ? 'Entrar no jogo' : 'Criar minha conta'}
          </button>
          <button className="nr-linkbtn" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMsg('') }}>
            {mode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
          </button>
        </div>
      </div>
    </div>
  )
}
