import { useEffect, useRef, useState } from 'react'
import {
  calcSoulCard,
  isValidBirth,
  soulCardDescriptions,
  soulCardMajorIds,
  soulCardNames,
} from '../lib/soulCard'
import { TarotCardView } from '../components/TarotCardView'
import { soulCardAiExplain } from '../services/ollama'
import { saveHistory } from '../services/history'
import { useApp } from '../context/AppContext'
import { ConnectionBadge } from '../components/ConnectionBadge'

export function SoulCardPage() {
  const [y, setY] = useState('')
  const [m, setM] = useState('')
  const [d, setD] = useState('')
  const [number, setNumber] = useState<number | null>(null)
  const [aiText, setAiText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)
  const { speak, setLastSpeakText, ollamaOk, registerSaveHandler, setSaveMessage, t } = useApp()

  const stateRef = useRef({ number, aiText, y, m, d })
  stateRef.current = { number, aiText, y, m, d }

  const onSave = async () => {
    const s = stateRef.current
    if (s.number == null) {
      setSaveMessage(t('save_none'))
      return
    }
    await saveHistory({
      kind: 'soul',
      title: `소울카드 · ${s.number} ${soulCardNames[s.number]}`,
      cards: [
        {
          id: soulCardMajorIds[s.number],
          nameKo: soulCardNames[s.number],
          nameEn: soulCardNames[s.number],
          isReversed: false,
        },
      ],
      aiText: s.aiText || soulCardDescriptions[s.number],
      meta: { number: s.number, birth: `${s.y}-${s.m}-${s.d}` },
    })
    const msg = t('save_ok')
    setSavedMsg(msg)
    setSaveMessage(msg)
  }

  useEffect(() => {
    registerSaveHandler(() => onSave())
    return () => registerSaveHandler(null)
  }, [registerSaveHandler, t])

  const compute = () => {
    setError(null)
    setAiText('')
    setSavedMsg(null)
    if (!isValidBirth(y, m, d)) {
      setError(t('soul_invalid'))
      setNumber(null)
      return
    }
    try {
      const birth = `${y.padStart(4, '0')}${m.padStart(2, '0')}${d.padStart(2, '0')}`
      const n = calcSoulCard(birth)
      setNumber(n)
      const name = soulCardNames[n]
      const base = soulCardDescriptions[n]
      setLastSpeakText(`소울카드 ${n}번 ${name}. ${base}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '계산 실패')
      setNumber(null)
    }
  }

  const onAi = async () => {
    if (number == null) return
    setBusy(true)
    setError(null)
    try {
      const text = await soulCardAiExplain(
        number,
        soulCardNames[number],
        soulCardDescriptions[number],
      )
      setAiText(text)
      setLastSpeakText(text)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI 설명 실패')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page">
      <h1>{t('home_soul')}</h1>
      <p className="muted">{t('soul_desc')}</p>
      <div className="btn-row">
        <ConnectionBadge label="Ollama" ok={ollamaOk} />
      </div>

      <div className="panel">
        <div className="label">{t('soul_birth')}</div>
        <div className="btn-row">
          <label>
            {t('soul_year')}
            <input
              className="field"
              style={{ width: 120, marginLeft: 8 }}
              inputMode="numeric"
              value={y}
              onChange={(e) => setY(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="YYYY"
              aria-label={t('soul_year')}
            />
          </label>
          <label>
            {t('soul_month')}
            <input
              className="field"
              style={{ width: 80, marginLeft: 8 }}
              inputMode="numeric"
              value={m}
              onChange={(e) => setM(e.target.value.replace(/\D/g, '').slice(0, 2))}
              placeholder="MM"
              aria-label={t('soul_month')}
            />
          </label>
          <label>
            {t('soul_day')}
            <input
              className="field"
              style={{ width: 80, marginLeft: 8 }}
              inputMode="numeric"
              value={d}
              onChange={(e) => setD(e.target.value.replace(/\D/g, '').slice(0, 2))}
              placeholder="DD"
              aria-label={t('soul_day')}
            />
          </label>
        </div>
        <div className="btn-row">
          <button type="button" className="btn btn--primary" onClick={compute}>
            {t('soul_calc')}
          </button>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}
      {savedMsg && <p className="feedback-ok">{savedMsg}</p>}

      {number != null && (
        <>
          <div className="panel" style={{ textAlign: 'center' }}>
            <p className="progress">{t('soul_number', { n: number })}</p>
            <h2 style={{ marginTop: 0 }}>{t('soul_voice_of', { name: soulCardNames[number] })}</h2>
            <div className="spread-row">
              <TarotCardView cardId={soulCardMajorIds[number]} large />
            </div>
            <p>{soulCardDescriptions[number]}</p>
          </div>
          <div className="btn-row">
            <button
              type="button"
              className="btn"
              onClick={() => {
                const text = `소울카드 ${number}번 ${soulCardNames[number]}. ${soulCardDescriptions[number]}`
                setLastSpeakText(text)
                void speak(text)
              }}
            >
              {t('nav_tts')}
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={busy}
              onClick={() => void onAi()}
            >
              {busy ? t('soul_ai_busy') : t('soul_ai')}
            </button>
            <button type="button" className="btn" onClick={() => void onSave()}>
              {t('nav_save')}
            </button>
          </div>
        </>
      )}

      {aiText && (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>{t('soul_ai_title')}</h2>
          <div className="ai-result">{aiText}</div>
          <div className="btn-row">
            <button
              type="button"
              className="btn"
              onClick={() => {
                setLastSpeakText(aiText)
                void speak(aiText)
              }}
            >
              {t('nav_tts')}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
