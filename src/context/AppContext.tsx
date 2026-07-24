import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { checkOllama } from '../services/ollama'
import { checkTts, listVoices, speakText, stopTts } from '../services/tts'

export type FontSize = 'sm' | 'md' | 'lg'

type Settings = {
  fontSize: FontSize
  ttsVoice: string
  ttsSpeed: number
}

type AppContextValue = {
  settings: Settings
  setFontSize: (v: FontSize) => void
  setTtsVoice: (v: string) => void
  setTtsSpeed: (v: number) => void
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
}

const STORAGE_KEY = 'svil-tarot-settings'

const defaults: Settings = {
  fontSize: 'md',
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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    document.documentElement.dataset.fontSize = settings.fontSize
  }, [settings])

  const refreshStatus = useCallback(async () => {
    const [o, t, v] = await Promise.all([checkOllama(), checkTts(), listVoices()])
    setOllamaOk(o)
    setTtsOk(t)
    setVoices(v)
  }, [])

  useEffect(() => {
    void refreshStatus()
    const id = window.setInterval(() => void refreshStatus(), 30_000)
    return () => window.clearInterval(id)
  }, [refreshStatus])

  const setFontSize = (fontSize: FontSize) => setSettings((s) => ({ ...s, fontSize }))
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

  const value = useMemo(
    () => ({
      settings,
      setFontSize,
      setTtsVoice,
      setTtsSpeed,
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
    }),
    [
      settings,
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
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp outside provider')
  return ctx
}
