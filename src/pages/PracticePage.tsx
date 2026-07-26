import { useEffect, useRef, useState } from 'react'
import spreads from '../data/spreads.json'
import { drawCards, formatDrawnForPrompt, type DrawnCard } from '../lib/cards'
import { SpreadCards } from '../components/TarotCardView'
import { adviceFromPractice } from '../services/ollama'
import { saveHistory } from '../services/history'
import { recordServiceConsultation } from '../services/customers'
import { useApp } from '../context/AppContext'
import { ConnectionBadge } from '../components/ConnectionBadge'
import { CustomerPicker } from '../components/CustomerPicker'

type Spread = (typeof spreads)[number]

export function PracticePage() {
  const list = spreads as Spread[]
  const [spreadId, setSpreadId] = useState('three')
  const [cards, setCards] = useState<DrawnCard[]>([])
  const [note, setNote] = useState('')
  const [aiText, setAiText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)
  const [customerId, setCustomerId] = useState('')
  const { speak, setLastSpeakText, ollamaOk, registerSaveHandler, setSaveMessage, t } = useApp()

  const spread = list.find((s) => s.id === spreadId) ?? list[1]
  const stateRef = useRef({ cards, note, aiText, spread, customerId })
  stateRef.current = { cards, note, aiText, spread, customerId }

  const onSave = async () => {
    const s = stateRef.current
    if (!s.cards.length) {
      setSaveMessage(t('save_none'))
      return
    }
    const hist = await saveHistory({
      kind: 'practice',
      title: `실전 · ${s.spread.nameKo}`,
      cards: s.cards,
      userNote: s.note,
      aiText: s.aiText,
      customerId: s.customerId || undefined,
      meta: { spreadId: s.spread.id },
    })
    if (s.customerId) {
      await recordServiceConsultation({
        customerId: s.customerId,
        serviceType: 'practice',
        title: `실전 타로 · ${s.spread.nameKo}`,
        summary: s.note?.slice(0, 120) || '실전 타로 상담',
        detail: s.note,
        resultText: s.aiText,
        historyId: hist.id,
      })
    }
    const msg = t('save_ok')
    setSavedMsg(msg)
    setSaveMessage(msg)
  }

  useEffect(() => {
    registerSaveHandler(() => onSave())
    return () => registerSaveHandler(null)
  }, [registerSaveHandler, t])

  const onDraw = () => {
    setAiText('')
    setSavedMsg(null)
    setError(null)
    setCards(drawCards(spread.cardCount, spread.positions))
  }

  const onAdvice = async () => {
    if (!cards.length) return
    setBusy(true)
    setError(null)
    try {
      const text = await adviceFromPractice(formatDrawnForPrompt(cards), note)
      setAiText(text)
      setLastSpeakText(text)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI 조언 실패')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page">
      <h1>{t('home_practice')}</h1>
      <p className="muted">{t('home_practice_hint')}</p>
      <div className="btn-row">
        <ConnectionBadge label="Ollama" ok={ollamaOk} />
      </div>

      <div className="panel">
        <CustomerPicker value={customerId} onChange={(id) => setCustomerId(id)} />
        <label className="label" htmlFor="spread" style={{ marginTop: 12 }}>
          {t('practice_spread')}
        </label>
        <select
          id="spread"
          className="field"
          value={spreadId}
          onChange={(e) => setSpreadId(e.target.value)}
        >
          {list.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nameKo}
            </option>
          ))}
        </select>
        <div className="btn-row">
          <button type="button" className="btn btn--primary" onClick={onDraw}>
            {t('practice_draw')}
          </button>
        </div>
      </div>

      {cards.length > 0 && (
        <>
          <SpreadCards cards={cards} />
          <div className="panel">
            <label className="label" htmlFor="note">
              {t('practice_note_label')}
            </label>
            <textarea
              id="note"
              className="field"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('practice_note_ph')}
            />
          </div>
          <div className="btn-row">
            <button
              type="button"
              className="btn btn--primary"
              disabled={busy}
              onClick={() => void onAdvice()}
            >
              {busy ? t('practice_advice_busy') : t('practice_advice')}
            </button>
            <button type="button" className="btn" onClick={() => void onSave()}>
              {t('nav_save')}
            </button>
          </div>
        </>
      )}

      {error && <p className="error-text">{error}</p>}
      {savedMsg && <p className="feedback-ok">{savedMsg}</p>}

      {aiText && (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>{t('practice_advice_title')}</h2>
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
