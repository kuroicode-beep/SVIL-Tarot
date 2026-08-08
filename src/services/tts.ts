// src/services/tts.ts — 로컬 TTS 서버 호출과 재생 수명주기(취소·타임아웃·정리) 관리

const TTS_BASE = import.meta.env.DEV ? '/tts-api' : 'http://127.0.0.1:8765'

// 로컬 TTS가 응답하지 않을 때 무한 대기로 '중지도 안 되고 아무 일도 안 나는' 상태가 되지 않도록 상한을 둔다.
const GENERATE_TIMEOUT_MS = 15_000

let currentAudio: HTMLAudioElement | null = null
let currentUrl: string | null = null
let currentResolve: (() => void) | null = null
// 오디오가 만들어지기 전(생성 요청 대기 중)에도 중지할 수 있어야 하므로 컨트롤러를 모듈 스코프에 둔다.
let currentController: AbortController | null = null
// 중지·재호출 때마다 올라가는 세대 번호. 값이 달라진 요청의 결과는 버려서 음성이 겹치지 않게 한다.
let generation = 0

// abort는 사용자의 '중지'나 재호출로 인한 정상 흐름이므로 오류로 취급하지 않는다.
function isAbortError(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { name?: string }).name === 'AbortError'
}

/**
 * 이 계층은 사용자의 로케일을 모른다. 그래서 완성된 문장이 아니라 i18n 키만 던지고,
 * 번역은 화면(AppShell·SettingsPage)이 t()로 한다.
 * 서버 상태 코드는 `tts_err_http`에 {status} 파라미터로 넘긴다.
 */
export const TTS_ERR = {
  timeout: 'tts_err_timeout',
  playFailed: 'tts_err_play',
  http: 'tts_err_http',
} as const

/** 화면이 `t(code, params)`로 바로 쓸 수 있게 코드와 파라미터를 함께 담는다. */
export class TtsError extends Error {
  readonly code: string
  readonly params?: Record<string, string | number>
  constructor(code: string, params?: Record<string, string | number>) {
    super(code)
    this.name = 'TtsError'
    this.code = code
    this.params = params
  }
}

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

// 재생 여부와 무관하게 먼저 세대를 올리고 요청을 끊는다. 그래야 '생성 대기 중 중지'가 나중에 튀어나오지 않는다.
export function stopTts() {
  generation += 1
  currentController?.abort()
  currentController = null
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
  // 진행 중이던 재생 Promise는 오류가 아닌 '정상 중단'으로 resolve한다.
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

  // 이 호출의 세대를 고정해 두고 단계마다 최신인지 확인한다. 다르면 이미 중지·재호출된 것이다.
  const myGen = ++generation
  const controller = new AbortController()
  currentController = controller
  // AbortSignal.timeout은 abort 사유를 덮어써 사용자의 '중지'와 구분이 안 되므로 같은 컨트롤러로 직접 끊는다.
  let timedOut = false
  const timer = window.setTimeout(() => {
    timedOut = true
    controller.abort()
  }, GENERATE_TIMEOUT_MS)

  let blob: Blob | undefined
  try {
    const res = await fetch(`${TTS_BASE}/api/tts/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: trimmed.slice(0, 2000),
        engine: 'qwen3',
        voice_name: opts.voice || 'default',
        speed_pct: opts.speedPct ?? 100,
      }),
      signal: controller.signal,
    })
    if (myGen !== generation) return
    if (!res.ok) {
      // 서버 본문은 사용자에게 의미가 없고 개인정보가 섞일 수 있어 화면에 올리지 않는다. 콘솔에만 남긴다.
      console.error('[TTS]', res.status, (await res.text()).slice(0, 200))
      throw new TtsError(TTS_ERR.http, { status: res.status })
    }
    blob = await res.blob()
  } catch (e) {
    // 중지·재호출로 버려진 요청은 조용히 끝낸다. 사용자에게 오류로 보이면 안 된다.
    if (myGen !== generation) return
    if (timedOut) throw new TtsError(TTS_ERR.timeout, { sec: GENERATE_TIMEOUT_MS / 1000 })
    if (isAbortError(e)) return
    throw e
  } finally {
    window.clearTimeout(timer)
    if (currentController === controller) currentController = null
  }

  // 응답을 읽는 사이에도 중지될 수 있으므로 오디오를 만들기 직전에 한 번 더 확인한다.
  if (!blob || myGen !== generation) return

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
      // 블롭 URL을 놔두면 페이지가 살아 있는 동안 메모리를 계속 잡는다.
      URL.revokeObjectURL(url)
    }
    audio.onended = () => {
      cleanup()
      resolve()
    }
    audio.onerror = () => {
      cleanup()
      if (myGen !== generation) {
        resolve()
        return
      }
      reject(new TtsError(TTS_ERR.playFailed))
    }
    void audio.play().catch((e) => {
      cleanup()
      // pause()로 끊긴 재생은 실패가 아니라 중지다.
      if (isAbortError(e) || myGen !== generation) {
        resolve()
        return
      }
      reject(new TtsError(TTS_ERR.playFailed))
    })
  })
}
