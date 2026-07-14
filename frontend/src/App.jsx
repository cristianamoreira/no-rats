import { useState, useEffect } from 'react'
import { useToast } from './hooks/useToast'
import { useAuth } from './hooks/useAuth'
import { useHousehold } from './hooks/useHousehold'
import AuthScreen from './components/AuthScreen'
import HouseholdSetup from './components/HouseholdSetup'
import Dashboard from './components/Dashboard'
import Toast from './components/Toast'

function readInviteCode() {
  try {
    const url = new URL(window.location.href)
    const c = url.searchParams.get('casa')
    if (c) {
      sessionStorage.setItem('norats_invite', c)
      url.searchParams.delete('casa')
      window.history.replaceState({}, '', url.pathname + url.search)
      return c.toUpperCase()
    }
    return (sessionStorage.getItem('norats_invite') || '').toUpperCase()
  } catch (e) {
    return ''
  }
}

export default function App() {
  const { toast, showToast } = useToast()
  const { session, authReady } = useAuth()
  const hh = useHousehold(session, showToast)
  const [inviteCode] = useState(readInviteCode)

  useEffect(() => {
    if (hh.householdId) {
      try { sessionStorage.removeItem('norats_invite') } catch (e) {}
    }
  }, [hh.householdId])

  let screen
  if (!authReady || hh.loading) {
    screen = <div className="nr-auth"><div className="nr-spinner">🐭 Carregando…</div></div>
  } else if (!session) {
    screen = <AuthScreen />
  } else if (!hh.householdId || !hh.data) {
    screen = (
      <HouseholdSetup
        onCreate={hh.createHousehold}
        onJoin={hh.joinHousehold}
        onLogout={hh.logout}
        initialCode={inviteCode}
        initialMode={inviteCode ? 'join' : 'create'}
      />
    )
  } else {
    screen = <Dashboard hh={hh} showToast={showToast} />
  }

  return (
    <>
      {screen}
      <Toast toast={toast} />
    </>
  )
}
