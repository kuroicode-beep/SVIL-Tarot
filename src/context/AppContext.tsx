import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { checkOllama } from '../services/ollama'
import { checkTts, listVoices, speakText, stopTts } from '../services/tts'
import {
  fontOptions,
  translate,
  type FontId,
  type Locale,
} from '../i18n'

export type FontSize = 'sm' | 'md' | 'lg'

type Settings = {
  fontSize: FontSize
  fontId: FontId
  locale: Locale
  ttsVoice: string
  ttsSpeed: number
}

type AppContextValue = {
  settings: Settings
  setFontSize: (v: FontSize) => void
  setFontId: (v: FontId) => void
  setLocale: (v: Locale) => void
  setTtsVoice: (v: string) => void
  setTtsSpeed: (v: number) => void
  t: (key: string, params?: Record<string, string | number>) => string
  ollamaOk: boolean | null
  ttsOk: boolean | null
  voices: string[]
  refreshStatus: () => Promise<void>
  speak: (text: string) => Promise<void>
  stopSpeak: () => void
  speaking: boolean
  ttsError: string | null
  setTtsError: (m: string | null) => void
  enterFullscreen: () => Promise<void>
  lastSpeakText: string
  setLastSpeakText: (t: string) => void
  registerSaveHandler: (fn: (() => Promise<void> | void) | null) => void
  runSave: () => Promise<void>
  saveMessage: string | null
  setSaveMessage: (m: string | null) => void
  /** 저장 배너를 색이 아니라 값으로 구분하기 위한 플래그. */
  saveFailed: boolean
}

const STORAGE_KEY = 'svil-tarot-settings'

const defaults: Settings = {
  fontSize: 'md',
  fontId: 'lineseed',
  locale: 'ko',
  ttsVoice: 'default',
  ttsSpeed: 100,
}

const AppContext = createContext<AppContextValue | null>(null)

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults
    return { ...defaults, ...JSON.parse(raw) }
  } catch {
    return defaults
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [ollamaOk, setOllamaOk] = useState<boolean | null>(null)
  const [ttsOk, setTtsOk] = useState<boolean | null>(null)
  const [voices, setVoices] = useState<string[]>([])
  const [speaking, setSpeaking] = useState(false)
  const [ttsError, setTtsError] = useState<string | null>(null)
  const [lastSpeakText, setLastSpeakText] = useState('')
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [saveFailed, setSaveFailed] = useState(false)
  const saveHandlerRef = useRef<(() => Promise<void> | void) | null>(null)
  // 마지막 speak 호출만 speaking·ttsError를 갱신하게 한다.
  // 연속 호출 시 먼저 끝난 쪽의 finally가 나중 호출의 상태를 지워 '중지' 수단이 사라진다.
  const speakSeqRef = useRef(0)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    document.documentElement.dataset.fontSize = settings.fontSize
    document.documentElement.lang = settings.locale
    // 알 수 없는 fontId면 SVIL 표준 기본값(라인시드, 목록 첫 항목)으로 되돌린다.
    const font = fontOptions.find((f) => f.id === settings.fontId) ?? fontOptions[0]
    document.documentElement.style.setProperty('--font-ui', font.css)
  }, [settings])

  const refreshStatus = useCallback(async () => {
    const [o, tts, v] = await Promise.all([checkOllama(), checkTts(), listVoices()])
    setOllamaOk(o)
    setTtsOk(tts)
    setVoices(v)
  }, [])

  useEffect(() => {
    void refreshStatus()
    const id = window.setInterval(() => void refreshStatus(), 30_000)
    return () => window.clearInterval(id)
  }, [refreshStatus])

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      translate(settings.locale, key, params),
    [settings.locale],
  )

  const setFontSize = (fontSize: FontSize) => setSettings((s) => ({ ...s, fontSize }))
  const setFontId = (fontId: FontId) => setSettings((s) => ({ ...s, fontId }))
  const setLocale = (locale: Locale) => setSettings((s) => ({ ...s, locale }))
  const setTtsVoice = (ttsVoice: string) => setSettings((s) => ({ ...s, ttsVoice }))
  const setTtsSpeed = (ttsSpeed: number) => setSettings((s) => ({ ...s, ttsSpeed }))

  const stopSpeak = useCallback(() => {
    speakSeqRef.current += 1
    stopTts()
    setSpeaking(false)
  }, [])

  const speak = useCallback(
    async (text: string) => {
      const mySeq = ++speakSeqRef.current
      setTtsError(null)
      setLastSpeakText(text)
      setSpeaking(true)
      try {
        await speakText(text, { voice: settings.ttsVoice, speedPct: settings.ttsSpeed })
      } catch (e) {
        // 중단(abort)은 사용자가 의도한 것이라 오류로 알리지 않는다.
        const aborted = e instanceof Error && (e.name === 'AbortError' || e.message === 'ABORTED')
        if (!aborted && speakSeqRef.current === mySeq) {
          setTtsError(e instanceof Error ? e.message : 'TTS_FAILED')
        }
      } finally {
        if (speakSeqRef.current === mySeq) setSpeaking(false)
      }
    },
    [settings.ttsVoice, settings.ttsSpeed],
  )

  const enterFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen().catch(() => undefined)
    }
  }, [])

  const registerSaveHandler = useCallback((fn: (() => Promise<void> | void) | null) => {
    saveHandlerRef.current = fn
  }, [])

  // 저장 실패가 조용히 삼켜지면 사용자는 저장된 줄 알고 화면을 떠난다.
  // 호출부가 대부분 `void runSave()`라 rejection이 사라지므로 여기서 반드시 잡는다.
  const runSave = useCallback(async () => {
    setSaveMessage(null)
    setSaveFailed(false)
    if (!saveHandlerRef.current) {
      setSaveMessage(t('save_none'))
      return
    }
    try {
      await saveHandlerRef.current()
    } catch {
      setSaveFailed(true)
      setSaveMessage(t('save_fail'))
    }
  }, [t])

  const value = useMemo(
    () => ({
      settings,
      setFontSize,
      setFontId,
      setLocale,
      setTtsVoice,
      setTtsSpeed,
      t,
      ollamaOk,
      ttsOk,
      voices,
      refreshStatus,
      speak,
      stopSpeak,
      speaking,
      ttsError,
      setTtsError,
      enterFullscreen,
      lastSpeakText,
      setLastSpeakText,
      registerSaveHandler,
      runSave,
      saveMessage,
      setSaveMessage,
      saveFailed,
    }),
    [
      settings,
      t,
      ollamaOk,
      ttsOk,
      voices,
      refreshStatus,
      speak,
      stopSpeak,
      speaking,
      ttsError,
      enterFullscreen,
      lastSpeakText,
      registerSaveHandler,
      runSave,
      saveMessage,
      saveFailed,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp outside provider')
  return ctx
}
