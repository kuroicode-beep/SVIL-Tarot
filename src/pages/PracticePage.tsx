import { useEffect, useRef, useState } from 'react'
import spreads from '../data/spreads.json'
import { drawCards, formatDrawnForPrompt, type DrawnCard } from '../lib/cards'
import { analyzeSpread, analysisToPrompt } from '../lib/analyze'
import { SpreadCards } from '../components/TarotCardView'
import { adviceFromPractice } from '../services/ollama'
import { saveHistory } from '../services/history'
import { recordServiceConsultation } from '../services/customers'
import { ReadingPlayer } from '../components/ReadingPlayer'
import { useApp } from '../context/AppContext'
import { ConnectionBadge } from '../components/ConnectionBadge'
import { CustomerPicker } from '../components/CustomerPicker'
import { useCustomerQueryParam } from '../hooks/useCustomerQueryParam'

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
  const [customerId, setCustomerId] = useCustomerQueryParam()
  const { speak, setLastSpeakText, ollamaOk, registerSaveHandler, runSave, setSaveMessage, t } = useApp()

  const spread = list.find((s) => s.id === spreadId) ?? list[1]
  const stateRef = useRef({ cards, note, aiText, spread, customerId })
  stateRef.current = { cards, note, aiText, spread, customerId }
  // 저장 버튼과 상단바 저장이 동시에 눌리면 crypto.randomUUID()가 매번 새 id를 만들어
  // 같은 리딩이 기록·상담 양쪽에 중복으로 쌓인다. 실행 중 차단 + 저장된 id 재사용으로 막는다.
  const savingRef = useRef(false)
  const savedRef = useRef<{ historyId: string; consultationId?: string } | null>(null)

  const onSave = async () => {
    const s = stateRef.current
    if (!s.cards.length) {
      setSaveMessage(t('save_none'))
      return
    }
    if (savingRef.current) return
    savingRef.current = true
    try {
      const hist = await saveHistory({
        id: savedRef.current?.historyId,
        kind: 'practice',
        title: `실전 · ${s.spread.nameKo}`,
        cards: s.cards,
        userNote: s.note,
        aiText: s.aiText,
        customerId: s.customerId || undefined,
        meta: { spreadId: s.spread.id },
      })
      let consultationId = savedRef.current?.consultationId
      if (s.customerId) {
        const cons = await recordServiceConsultation({
          id: consultationId,
          customerId: s.customerId,
          serviceType: 'practice',
          title: `실전 타로 · ${s.spread.nameKo}`,
          summary: s.note?.slice(0, 120) || '실전 타로 상담',
          detail: s.note,
          resultText: s.aiText,
          historyId: hist.id,
        })
        consultationId = cons.id
      }
      savedRef.current = { historyId: hist.id, consultationId }
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

  const onDraw = () => {
    setAiText('')
    setSavedMsg(null)
    setError(null)
    // 새 리딩은 새 기록이어야 한다. 이전 저장 id를 물고 가면 앞 리딩을 덮어쓴다.
    savedRef.current = null
    setCards(drawCards(spread.cardCount, spread.positions))
  }

  const onAdvice = async () => {
    if (!cards.length) return
    setBusy(true)
    setError(null)
    try {
      // 규칙 진단을 프롬프트 앞에 붙이면 모델이 배열의 편중을 놓치지 않는다.
      const text = await adviceFromPractice(
        formatDrawnForPrompt(cards),
        note,
        analysisToPrompt(analyzeSpread(cards)),
      )
      setAiText(text)
      setLastSpeakText(text)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('load_error'))
    } finally {
      setBusy(false)
    }
  }

  // 뽑은 카드가 바뀔 때만 다시 계산한다. 순수 규칙 연산이라 네트워크가 필요 없다.
  const analysis = cards.length > 0 ? analyzeSpread(cards) : null

  return (
    <main className="page">
      <h1>{t('home_practice')}</h1>
      <p className="muted">{t('home_practice_hint')}</p>
      <div className="btn-row">
        <ConnectionBadge label="Ollama" ok={ollamaOk} />
      </div>

      <div className="panel">
        <CustomerPicker value={customerId} onChange={setCustomerId} />
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
          {analysis && (
            <div className="panel">
              <h2 style={{ marginTop: 0 }}>{t('analyze_title')}</h2>
              <ul>
                {analysis.notes.map((n) => (
                  <li key={n.key}>{t(n.key, n.params)}</li>
                ))}
              </ul>
            </div>
          )}
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
            <button type="button" className="btn" onClick={() => void runSave()}>
              {t('nav_save')}
            </button>
          </div>
        </>
      )}

      {error && <p className="error-text" role="alert">{error}</p>}
      {savedMsg && <p className="feedback-ok">{savedMsg}</p>}

      {aiText && (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>{t('practice_advice_title')}</h2>
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
