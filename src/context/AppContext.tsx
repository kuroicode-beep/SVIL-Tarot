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
  enterFullscreen: () => Promise<void>
  lastSpeakText: string
  setLastSpeakText: (t: string) => void
  registerSaveHandler: (fn: (() => Promise<void> | void) | null) => void
  runSave: () => Promise<void>
  saveMessage: string | null
  setSaveMessage: (m: string | null) => void
}

const STORAGE_KEY = 'svil-tarot-settings'

const defaults: Settings = {
  fontSize: 'md',
  fontId: 'kyobo',
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
  const saveHandlerRef = useRef<(() => Promise<void> | void) | null>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    document.documentElement.dataset.fontSize = settings.fontSize
    document.documentElement.lang = settings.locale
    const font = fontOptions.find((f) => f.id === settings.fontId) ?? fontOptions[1]
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
    stopTts()
    setSpeaking(false)
  }, [])

  const speak = useCallback(
    async (text: string) => {
      setTtsError(null)
      setLastSpeakText(text)
      setSpeaking(true)
      try {
        await speakText(text, { voice: settings.ttsVoice, speedPct: settings.ttsSpeed })
      } catch (e) {
        setTtsError(e instanceof Error ? e.message : 'TTS 실패')
      } finally {
        setSpeaking(false)
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

  const runSave = useCallback(async () => {
    setSaveMessage(null)
    if (!saveHandlerRef.current) {
      setSaveMessage(t('save_none'))
      return
    }
    await saveHandlerRef.current()
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
      enterFullscreen,
      lastSpeakText,
      setLastSpeakText,
      registerSaveHandler,
      runSave,
      saveMessage,
      setSaveMessage,
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
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp outside provider')
  return ctx
}
