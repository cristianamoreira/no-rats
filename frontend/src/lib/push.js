import { supabase } from './supabase'

// Chave pública VAPID (pode ficar no cliente).
const VAPID_PUBLIC = 'BD_FnBVNyD0mM1rKu45NNr387Me4aJ1Js5K5MFiL6WExvyywjvDWSD9_JxOOTp-hjPokmziFbOaw8RbpvIi5WMc'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export function pushSupported() {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export async function getPushState() {
  if (!pushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = reg && (await reg.pushManager.getSubscription())
  return sub ? 'on' : 'off'
}

export async function enablePush(householdId, userId) {
  if (!pushSupported()) throw new Error('Este navegador não suporta notificações.')
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('Permissão negada. Ative nas configurações do navegador.')
  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
    })
  }
  const json = sub.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert(
    { user_id: userId, household_id: householdId, endpoint: json.endpoint, subscription: json },
    { onConflict: 'user_id,endpoint' }
  )
  if (error) throw new Error(error.message)
  return 'on'
}

export async function disablePush(userId) {
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = reg && (await reg.pushManager.getSubscription())
  if (sub) {
    const endpoint = sub.endpoint
    await sub.unsubscribe()
    await supabase.from('push_subscriptions').delete().eq('user_id', userId).eq('endpoint', endpoint)
  }
  return 'off'
}

// Dispara o push pros outros integrantes (fire-and-forget).
export async function notifyTaskDone(payload) {
  try {
    await supabase.functions.invoke('notify-task', { body: payload })
  } catch (e) {
    // silencioso: notificação é um extra, não pode travar a conclusão
  }
}
