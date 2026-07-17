// Service worker do No Rats — habilita instalação (PWA) e uso offline básico.
// Estratégia: HTML sempre da rede (offline cai no cache); assets em cache-first
// com atualização em segundo plano. Só intercepta o próprio domínio (Supabase e
// outras APIs passam direto).
const CACHE = 'norats-v4'

// Push: mostra a notificação quando chega do servidor.
self.addEventListener('push', (e) => {
  let data = {}
  try { data = e.data ? e.data.json() : {} } catch (_) { data = { body: e.data ? e.data.text() : '' } }
  const title = data.title || 'No Rats'
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: data.url || '/' },
  }
  e.waitUntil(self.registration.showNotification(title, options))
})

// Clique na notificação: foca a aba aberta ou abre o app.
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = (e.notification.data && e.notification.data.url) || '/'
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ('focus' in c) return c.focus() }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      await self.clients.claim()
    })()
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return // não mexe em Supabase / fontes / etc.

  // Navegações (HTML): rede primeiro, offline usa o cache.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          caches.open(CACHE).then((c) => c.put(req, res.clone()))
          return res
        })
        .catch(() => caches.match(req).then((c) => c || caches.match('/index.html')))
    )
    return
  }

  // Assets: cache-first + revalida em segundo plano.
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req)
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) cache.put(req, res.clone())
          return res
        })
        .catch(() => cached)
      return cached || network
    })
  )
})
