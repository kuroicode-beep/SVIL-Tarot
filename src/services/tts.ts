const TTS_BASE = import.meta.env.DEV ? '/tts-api' : 'http://127.0.0.1:8765'

let currentAudio: HTMLAudioElement | null = null
let currentUrl: string | null = null
let currentResolve: (() => void) | null = null

export async function checkTts(): Promise<boolean> {
  try {
    const res = await fetch(`${TTS_BASE}/api/tts/status`, { signal: AbortSignal.timeout(3000) })
    return res.ok
  } catch {
    return false
  }
}

export async function listVoices(): Promise<string[]> {
  try {
    const res = await fetch(`${TTS_BASE}/api/tts/voices`, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return []
    const data = (await res.json()) as { voices?: string[] } | string[]
    if (Array.isArray(data)) return data
    return data.voices ?? []
  } catch {
    return []
  }
}

// 재생 중인 오디오를 정리한다. 진행 중이던 재생 Promise는 오류가 아닌 '정상 중단'으로 resolve한다.
export function stopTts() {
  if (!currentAudio) return
  const audio = currentAudio
  const url = currentUrl
  const resolve = currentResolve
  currentAudio = null
  currentUrl = null
  currentResolve = null
  audio.onended = null
  audio.onerror = null
  audio.pause()
  audio.src = ''
  if (url) URL.revokeObjectURL(url)
  resolve?.()
}

export async function speakText(
  text: string,
  opts: { voice?: string; speedPct?: number },
): Promise<void> {
  stopTts()
  const trimmed = text.trim()
  if (!trimmed) return

  const res = await fetch(`${TTS_BASE}/api/tts/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: trimmed.slice(0, 2000),
      engine: 'qwen3',
      voice_name: opts.voice || 'default',
      speed_pct: opts.speedPct ?? 100,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`TTS 오류 (${res.status}): ${err.slice(0, 200)}`)
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)
  currentAudio = audio
  currentUrl = url
  await new Promise<void>((resolve, reject) => {
    currentResolve = resolve
    // 이 재생만 정리한다. stopTts로 이미 교체됐다면 건드리지 않는다.
    const cleanup = () => {
      if (currentAudio === audio) {
        currentAudio = null
        currentUrl = null
        currentResolve = null
      }
      URL.revokeObjectURL(url)
    }
    audio.onended = () => {
      cleanup()
      resolve()
    }
    audio.onerror = () => {
      cleanup()
      reject(new Error('TTS 재생 실패'))
    }
    void audio.play().catch((e) => {
      cleanup()
      reject(e instanceof Error ? e : new Error('TTS 재생 실패'))
    })
  })
}
