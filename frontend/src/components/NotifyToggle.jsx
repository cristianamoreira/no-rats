import { useState, useEffect } from 'react'
import { getPushState, enablePush, disablePush } from '../lib/push'

export default function NotifyToggle({ householdId, userId, showToast }) {
  const [state, setState] = useState('loading')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    getPushState().then((s) => alive && setState(s))
    return () => { alive = false }
  }, [])

  if (state === 'loading' || state === 'unsupported') return null

  const toggle = async () => {
    setBusy(true)
    try {
      if (state === 'on') {
        setState(await disablePush(userId))
        showToast('🔕 Notificações desligadas')
      } else {
        setState(await enablePush(householdId, userId))
        showToast('🔔 Notificações ligadas!')
      }
    } catch (e) {
      showToast('⚠️ ' + (e.message || 'Não consegui ativar'))
      setState(await getPushState())
    }
    setBusy(false)
  }

  const denied = state === 'denied'
  const on = state === 'on'
  return (
    <div className="nr-notify">
      <span className="nr-notify-txt">
        {denied
          ? '🔕 Notificações bloqueadas — libere nas configurações do navegador.'
          : on
            ? '🔔 Você recebe avisos quando a família conclui tarefas.'
            : '🔔 Quer ser avisado no celular quando a família concluir tarefas?'}
      </span>
      {!denied && (
        <button
          className={'nr-btn nr-btn-sm ' + (on ? 'nr-del' : 'nr-btn-primary')}
          onClick={toggle}
          disabled={busy}
        >
          {busy ? '…' : on ? 'Desligar' : 'Ativar'}
        </button>
      )}
    </div>
  )
}
