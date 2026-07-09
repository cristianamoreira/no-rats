import { useToast } from './hooks/useToast'
import { useAuth } from './hooks/useAuth'
import { useHousehold } from './hooks/useHousehold'
import AuthScreen from './components/AuthScreen'
import HouseholdSetup from './components/HouseholdSetup'
import Dashboard from './components/Dashboard'
import Toast from './components/Toast'

export default function App() {
  const { toast, showToast } = useToast()
  const { session, authReady } = useAuth()
  const hh = useHousehold(session, showToast)

  let screen
  if (!authReady || hh.loading) {
    screen = <div className="nr-auth"><div className="nr-spinner">🐭 Carregando…</div></div>
  } else if (!session) {
    screen = <AuthScreen />
  } else if (!hh.householdId || !hh.data) {
    screen = <HouseholdSetup onCreate={hh.createHousehold} onJoin={hh.joinHousehold} onLogout={hh.logout} />
  } else {
    screen = <Dashboard hh={hh} />
  }

  return (
    <>
      {screen}
      <Toast toast={toast} />
    </>
  )
}
