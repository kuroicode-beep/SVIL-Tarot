// src/pages/DailyPage.tsx — 오늘의 한 장. 날짜 시드로 하루 한 장만 결정적으로 뽑는다.
import { useEffect, useRef, useState } from 'react'
import { getOrCreateDailyDraw, getStreak, saveDailyAiText, todayKey } from '../lib/daily'
import { getCard, type DrawnCard } from '../lib/cards'
import { TarotCardView } from '../components/TarotCardView'
import { dailyCardReading } from '../services/ollama'
import { saveHistory } from '../services/history'
import { ConnectionBadge } from '../components/ConnectionBadge'
import { ReadingPlayer } from '../components/ReadingPlayer'
import { useApp } from '../context/AppContext'

export function DailyPage() {
  const { speak, setLastSpeakText, ollamaOk, registerSaveHandler, runSave, setSaveMessage, t } = useApp()
  const [dateKey] = useState(() => todayKey())
  const [card, setCard] = useState<DrawnCard | null>(null)
  const [aiText, setAiText] = useState('')
  const [streak, setStreak] = useState(0)
  const [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)

  const stateRef = useRef({ card, aiText, dateKey })
  stateRef.current = { card, aiText, dateKey }
  const savingRef = useRef(false)
  const savedRef = useRef<string | null>(null)

  // 카드 자체는 시드로 재현되지만, 저장을 해야 연속일수를 셀 수 있어 진입 시 바로 만든다.
  useEffect(() => {
    void (async () => {
      try {
        const draw = await getOrCreateDailyDraw(dateKey)
        setCard(draw.card)
        setAiText(draw.aiText ?? '')
        setStreak(await getStreak())
        const meta = getCard(draw.card.id)
        setLastSpeakText(
          `${t('daily_today', { date: dateKey })}. ${draw.card.nameKo}. ${
            draw.card.isReversed ? t('reversed') : t('upright')
          }. ${draw.card.isReversed ? meta.reversed : meta.upright}`,
        )
      } catch {
        setLoadError(true)
      }
    })()
  }, [dateKey, setLastSpeakText, t])

  const onSave = async () => {
    const s = stateRef.current
    if (!s.card) {
      setSaveMessage(t('save_none'))
      return
    }
    if (savingRef.current) return
    savingRef.current = true
    try {
      const hist = await saveHistory({
        id: savedRef.current ?? undefined,
        kind: 'daily',
        title: `${t('daily_title')} · ${s.dateKey}`,
        cards: [s.card],
        aiText: s.aiText,
        meta: { date: s.dateKey },
      })
      savedRef.current = hist.id
      // 성공 문구는 버튼 옆 로컬 메시지로만 띄운다. 전역 배너는 실패 전용이라 중복되지 않는다.
      setSavedMsg(t('save_ok'))
    } finally {
      savingRef.current = false
    }
  }

  useEffect(() => {
    registerSaveHandler(() => onSave())
    return () => registerSaveHandler(null)
  }, [registerSaveHandler, t])

  const onAi = async () => {
    if (!card) return
    setBusy(true)
    setError(null)
    try {
      const meta = getCard(card.id)
      const dir = card.isReversed ? t('reversed') : t('upright')
      const meaning = card.isReversed ? meta.reversed : meta.upright
      const text = await dailyCardReading(
        `${card.nameKo}(${card.nameEn}) ${dir} — ${meaning}`,
        dateKey,
      )
      setAiText(text)
      setLastSpeakText(text)
      await saveDailyAiText(dateKey, text)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('load_error'))
    } finally {
      setBusy(false)
    }
  }

  if (loadError) {
    return (
      <main className="page">
        <h1>{t('daily_title')}</h1>
        <p className="error-text" role="alert">
          {t('load_error')}
        </p>
        <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
          {t('retry')}
        </button>
      </main>
    )
  }

  const meta = card ? getCard(card.id) : null

  return (
    <main className="page">
      <h1>{t('daily_title')}</h1>
      <p className="muted">{t('daily_desc')}</p>
      <div className="btn-row">
        <ConnectionBadge label="Ollama" ok={ollamaOk} />
        {streak > 0 && <span className="status-badge status-badge--ok">{t('daily_streak', { n: streak })}</span>}
      </div>

      {!card ? (
        <p className="muted" role="status">
          {t('loading')}
        </p>
      ) : (
        <>
          <div className="panel">
            <h2 style={{ marginTop: 0 }}>{t('daily_today', { date: dateKey })}</h2>
            <div className="spread-row">
              <TarotCardView cardId={card.id} isReversed={card.isReversed} />
            </div>
            {meta && (
              <p className="ai-result">{card.isReversed ? meta.reversed : meta.upright}</p>
            )}
          </div>

          <div className="btn-row">
            <button type="button" className="btn btn--primary" disabled={busy} onClick={() => void onAi()}>
              {busy ? t('daily_ai_busy') : t('daily_ai')}
            </button>
            <button type="button" className="btn" onClick={() => void runSave()}>
              {t('nav_save')}
            </button>
          </div>
        </>
      )}

      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      {savedMsg && <p className="feedback-ok">{savedMsg}</p>}

      {aiText && (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>{t('daily_ai')}</h2>
          <div className="ai-result">{aiText}</div>
          {/* 장문은 읽던 위치를 잃기 쉽다. 문장 단위 낭독으로 주시점을 고정한다. */}
          <ReadingPlayer text={aiText} />
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
