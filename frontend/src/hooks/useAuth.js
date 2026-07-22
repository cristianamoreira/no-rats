import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { supabase } from '../lib/supabase'

// Extrai tokens do fragmento (#access_token=...&type=recovery) de uma URL de deep link.
function parseRecoveryUrl(url) {
  const hash = (url || '').split('#')[1]
  if (!hash) return null
  const p = new URLSearchParams(hash)
  const access_token = p.get('access_token')
  const refresh_token = p.get('refresh_token')
  if (!access_token || !refresh_token) return null
  return { access_token, refresh_token, type: p.get('type') }
}

export function useAuth() {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [recovery, setRecovery] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
    })

    // App nativo (Capacitor): o link de recuperação volta como deep link
    // (br.com.noratsapp://reset-password#access_token=...&type=recovery).
    // O supabase-js não detecta isso sozinho, então tratamos manualmente.
    let appSub
    if (Capacitor.isNativePlatform()) {
      App.addListener('appUrlOpen', async ({ url }) => {
        const tokens = parseRecoveryUrl(url)
        if (!tokens) return
        await supabase.auth.setSession({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
        })
        if (tokens.type === 'recovery') setRecovery(true)
      }).then((h) => { appSub = h })
    }

    return () => {
      sub.subscription.unsubscribe()
      if (appSub) appSub.remove()
    }
  }, [])

  const clearRecovery = () => setRecovery(false)

  return { session, authReady, recovery, clearRecovery }
}
