import { useEffect, useRef, useState } from 'react'
import spreads from '../data/spreads.json'
import { drawCards, formatDrawnForPrompt, type DrawnCard } from '../lib/cards'
import { SpreadCards } from '../components/TarotCardView'
import { adviceFromPractice } from '../services/ollama'
import { saveHistory } from '../services/history'
import { useApp } from '../context/AppContext'
import { ConnectionBadge } from '../components/ConnectionBadge'

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
  const { speak, setLastSpeakText, ollamaOk, registerSaveHandler, setSaveMessage, t } = useApp()

  const spread = list.find((s) => s.id === spreadId) ?? list[1]
  const stateRef = useRef({ cards, note, aiText, spread })
  stateRef.current = { cards, note, aiText, spread }

  const onSave = async () => {
    const s = stateRef.current
    if (!s.cards.length) {
      setSaveMessage(t('save_none'))
      return
    }
    await saveHistory({
      kind: 'practice',
      title: `실전 · ${s.spread.nameKo}`,
      cards: s.cards,
      userNote: s.note,
      aiText: s.aiText,
      meta: { spreadId: s.spread.id },
    })
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
        <label className="label" htmlFor="spread">
          스프레드
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
            셔플 후 뽑기
          </button>
        </div>
      </div>

      {cards.length > 0 && (
        <>
          <SpreadCards cards={cards} />
          <div className="panel">
            <label className="label" htmlFor="note">
              나의 해설
            </label>
            <textarea
              id="note"
              className="field"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="카드가 말해 주는 것을 자유롭게 적어 보세요."
            />
          </div>
          <div className="btn-row">
            <button
              type="button"
              className="btn btn--primary"
              disabled={busy}
              onClick={() => void onAdvice()}
            >
              {busy ? 'AI 조언 생성 중…' : 'AI 조언 받기'}
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
          <h2 style={{ marginTop: 0 }}>AI 조언</h2>
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
