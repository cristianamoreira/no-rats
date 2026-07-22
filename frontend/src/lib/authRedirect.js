import { Capacitor } from '@capacitor/core'

// Esquema de deep link do app nativo (precisa bater com o intent-filter do AndroidManifest
// e estar na lista de Redirect URLs do Supabase).
export const NATIVE_SCHEME = 'br.com.noratsapp'
export const RESET_PATH = 'reset-password'

// Para onde o link do e-mail de recuperação deve voltar.
// - Web: a própria origem (localhost em dev, domínio em produção).
// - App nativo (Capacitor): um deep link com esquema próprio, capturado pelo appUrlOpen.
export function resetRedirectTo() {
  if (Capacitor.isNativePlatform()) return `${NATIVE_SCHEME}://${RESET_PATH}`
  return window.location.origin
}
