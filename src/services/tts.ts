const TTS_BASE = import.meta.env.DEV ? '/tts-api' : 'http://127.0.0.1:8765'

let currentAudio: HTMLAudioElement | null = null

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

export function stopTts() {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.src = ''
    currentAudio = null
  }
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
  await new Promise<void>((resolve, reject) => {
    audio.onended = () => {
      URL.revokeObjectURL(url)
      currentAudio = null
      resolve()
    }
    audio.onerror = () => {
      URL.revokeObjectURL(url)
      currentAudio = null
      reject(new Error('TTS 재생 실패'))
    }
    void audio.play().catch(reject)
  })
}
