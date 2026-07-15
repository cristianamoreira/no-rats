// Service worker do No Rats — habilita instalação (PWA) e uso offline básico.
// Estratégia: HTML sempre da rede (offline cai no cache); assets em cache-first
// com atualização em segundo plano. Só intercepta o próprio domínio (Supabase e
// outras APIs passam direto).
const CACHE = 'norats-v3'

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
