// public/sw.js — 오프라인 캐시 서비스워커. 로컬 우선 앱이라 네트워크 없이도 열려야 한다.

// 빌드마다 해시가 바뀌는 에셋을 미리 나열할 수 없으므로 프리캐시는 최소한만 하고
// 나머지는 런타임에 캐시한다. 버전을 올리면 옛 캐시를 통째로 버린다.
const CACHE = 'svil-tarot-v1'

// 앱 셸. 이 셋만 있으면 오프라인에서도 화면이 뜬다.
const SHELL = ['./', './index.html', './manifest.webmanifest', './favicon.svg']

self.addEventListener('install', (event) => {
  // 개별 파일이 실패해도 설치 자체는 성공시킨다. 하나 때문에 오프라인 지원이 통째로 죽는 걸 막는다.
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

// Ollama·TTS는 로컬 서버라 캐시하면 안 된다(옛 응답이 살아나면 더 나쁘다).
function isLocalService(url) {
  return (
    url.pathname.startsWith('/ollama') ||
    url.pathname.startsWith('/tts-api') ||
    url.port === '11434' ||
    url.port === '8765'
  )
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (isLocalService(url)) return

  // 화면 이동은 SPA라 전부 index.html로 떨어진다. 네트워크가 되면 최신을 쓰고, 안 되면 캐시된 셸을 준다.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          void caches.open(CACHE).then((c) => c.put('./index.html', copy))
          return res
        })
        .catch(() => caches.match('./index.html').then((r) => r ?? Response.error())),
    )
    return
  }

  // 덱 이미지·폰트·빌드 에셋은 내용이 바뀌면 파일명이 바뀌므로 캐시 우선이 안전하고 빠르다.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request)
        .then((res) => {
          // opaque·에러 응답을 캐시하면 깨진 자원이 영구히 박힌다.
          if (!res.ok || res.type === 'opaque') return res
          const copy = res.clone()
          void caches.open(CACHE).then((c) => c.put(request, copy))
          return res
        })
        .catch(() => cached ?? Response.error())
    }),
  )
})
