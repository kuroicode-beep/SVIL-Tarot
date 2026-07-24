import { useEffect, useRef, useState } from 'react'
import spreads from '../data/spreads.json'
import { drawCards, formatDrawnForPrompt, type DrawnCard } from '../lib/cards'
import { SpreadCards } from '../components/TarotCardView'
import { fullAiReading } from '../services/ollama'
import { saveHistory } from '../services/history'
import { useApp } from '../context/AppContext'
import { ConnectionBadge } from '../components/ConnectionBadge'

const CATEGORIES = ['연애', '직업', '금전', '건강', '종합'] as const
type Spread = (typeof spreads)[number]

export function AiTarotPage() {
  const list = spreads as Spread[]
  const [mode, setMode] = useState<'question' | 'category'>('question')
  const [question, setQuestion] = useState('')
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('종합')
  const [spreadId, setSpreadId] = useState('three')
  const [cards, setCards] = useState<DrawnCard[]>([])
  const [result, setResult] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)
  const { speak, setLastSpeakText, ollamaOk, registerSaveHandler, setSaveMessage, t } = useApp()

  const spread = list.find((s) => s.id === spreadId) ?? list[1]
  const stateRef = useRef({ cards, result, mode, question, category, spreadId })
  stateRef.current = { cards, result, mode, question, category, spreadId }

  const onSave = async () => {
    const s = stateRef.current
    if (!s.cards.length) {
      setSaveMessage(t('save_none'))
      return
    }
    await saveHistory({
      kind: 'ai',
      title:
        s.mode === 'question' ? `AI · ${s.question.slice(0, 40) || '질문'}` : `AI · ${s.category}`,
      cards: s.cards,
      aiText: s.result,
      meta: { mode: s.mode, question: s.question, category: s.category, spreadId: s.spreadId },
    })
    const msg = t('save_ok')
    setSavedMsg(msg)
    setSaveMessage(msg)
  }

  useEffect(() => {
    registerSaveHandler(() => onSave())
    return () => registerSaveHandler(null)
  }, [registerSaveHandler, t])

  const run = async () => {
    setBusy(true)
    setError(null)
    setSavedMsg(null)
    try {
      const drawn = drawCards(spread.cardCount, spread.positions)
      setCards(drawn)
      const text = await fullAiReading({
        mode,
        question,
        category,
        cardsText: formatDrawnForPrompt(drawn),
      })
      setResult(text)
      setLastSpeakText(text)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI 타로 실패')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page" id="main">
      <h1>{t('home_ai')}</h1>
      <p className="muted">로컬 LLM(Ollama gemma4:12b)이 리딩을 작성합니다.</p>
      <div className="btn-row">
        <ConnectionBadge label="Ollama" ok={ollamaOk} />
      </div>

      <div className="segment" role="group" aria-label="질문 방식" style={{ margin: '16px 0', width: '100%', maxWidth: 480 }}>
        <button
          type="button"
          className={mode === 'question' ? 'is-on' : ''}
          style={{ flex: 1 }}
          onClick={() => setMode('question')}
        >
          질문 지정
        </button>
        <button
          type="button"
          className={mode === 'category' ? 'is-on' : ''}
          style={{ flex: 1 }}
          onClick={() => setMode('category')}
        >
          카테고리 지정
        </button>
      </div>

      <div className="ai-layout">
        <div className="panel">
          {mode === 'question' ? (
            <div>
              <label className="label" htmlFor="q">
                타로에게 물어보세요
              </label>
              <textarea
                id="q"
                className="field"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="고민하고 계신 내용을 자세히 적어주세요..."
              />
            </div>
          ) : (
            <div>
              <div className="label">카테고리</div>
              <div className="chip-row">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`chip${category === c ? ' is-on' : ''}`}
                    onClick={() => setCategory(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <label className="label" htmlFor="sp">
              스프레드 선택
            </label>
            <select
              id="sp"
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
          </div>

          <div className="btn-row">
            <button
              type="button"
              className="btn btn--primary"
              style={{ width: '100%' }}
              disabled={busy}
              onClick={() => void run()}
            >
              {busy ? '리딩 중…' : 'AI 상담 시작'}
            </button>
          </div>
        </div>

        <div>
          <div className="ai-visual" aria-hidden={cards.length > 0}>
            {cards.length === 0 ? (
              <>
                <div className="card-back" style={{ transform: 'rotate(-6deg)' }} />
                <img
                  src="/deck/17_The_Star_00001_.webp"
                  alt=""
                  style={{
                    width: 96,
                    borderRadius: 10,
                    border: '3px solid var(--accent)',
                    transform: 'translateY(-8px)',
                  }}
                />
                <div className="card-back" style={{ transform: 'rotate(6deg)' }} />
              </>
            ) : (
              <SpreadCards cards={cards} />
            )}
          </div>

          {error && <p className="error-text">{error}</p>}
          {savedMsg && <p className="feedback-ok">{savedMsg}</p>}

          <div className="panel" aria-live="polite">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                marginBottom: 12,
              }}
            >
              <h2 style={{ margin: 0 }}>AI 해석 리포트</h2>
              {result && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setLastSpeakText(result)
                    void speak(result)
                  }}
                >
                  {t('nav_tts')}
                </button>
              )}
            </div>
            {result ? (
              <>
                <div className="ai-result">{result}</div>
                <div className="btn-row">
                  <button type="button" className="btn btn--primary" onClick={() => void onSave()}>
                    {t('nav_save')}
                  </button>
                </div>
              </>
            ) : (
              <p className="muted">카드를 뽑으면 여기에 리딩이 표시됩니다.</p>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
