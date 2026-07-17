import { useState, useEffect } from 'react'

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}
function isNativeApp() {
  // Dentro do app Capacitor (App Store / Play) não faz sentido oferecer "Instalar"
  return !!(window.Capacitor && (typeof window.Capacitor.isNativePlatform === 'function' ? window.Capacitor.isNativePlatform() : window.Capacitor.isNative))
}
function isIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !window.MSStream
}

export default function InstallBanner() {
  const [deferred, setDeferred] = useState(null)
  const [show, setShow] = useState(false)
  const [iosHint, setIosHint] = useState(false)

  useEffect(() => {
    if (isNativeApp() || isStandalone()) return
    try { if (localStorage.getItem('nr_install_dismissed') === '1') return } catch (e) {}
    const onPrompt = (e) => {
      e.preventDefault()
      setDeferred(e)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    if (isIOS()) { setShow(true); setIosHint(true) } // iOS não dispara beforeinstallprompt
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  if (!show) return null

  const install = async () => {
    if (!deferred) return
    deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
    setShow(false)
  }
  const dismiss = () => {
    setShow(false)
    try { localStorage.setItem('nr_install_dismissed', '1') } catch (e) {}
  }

  return (
    <div className="nr-install">
      <img className="nr-install-icon" src="/rat-logo.png" alt="" />
      <div className="nr-install-txt">
        <b>Instale o No Rats</b>
        {iosHint
          ? <span>No iPhone: toque em Compartilhar e "Adicionar à Tela de Início".</span>
          : <span>Adicione à tela inicial e use como app.</span>}
      </div>
      {!iosHint && <button className="nr-btn nr-btn-primary nr-btn-sm" onClick={install}>Instalar</button>}
      <button className="nr-install-x" onClick={dismiss} aria-label="Dispensar">✕</button>
    </div>
  )
}
