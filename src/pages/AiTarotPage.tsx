import { useState } from 'react'
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
  const { speak, setLastSpeakText, ollamaOk } = useApp()

  const spread = list.find((s) => s.id === spreadId) ?? list[1]

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

  const onSave = async () => {
    if (!cards.length) return
    await saveHistory({
      kind: 'ai',
      title: mode === 'question' ? `AI · ${question.slice(0, 40) || '질문'}` : `AI · ${category}`,
      cards,
      aiText: result,
      meta: { mode, question, category, spreadId },
    })
    setSavedMsg('저장됨 — 기록 메뉴에서 확인할 수 있습니다.')
  }

  return (
    <main className="page">
      <h1>AI 타로</h1>
      <p className="muted">로컬 LLM(Ollama gemma4:12b)이 리딩을 작성합니다.</p>
      <div className="btn-row">
        <ConnectionBadge label="Ollama" ok={ollamaOk} />
      </div>

      <div className="panel">
        <div className="segment" role="group" aria-label="질문 방식">
          <button
            type="button"
            className={mode === 'question' ? 'is-on' : ''}
            onClick={() => setMode('question')}
          >
            질문 지정
          </button>
          <button
            type="button"
            className={mode === 'category' ? 'is-on' : ''}
            onClick={() => setMode('category')}
          >
            카테고리 지정
          </button>
        </div>

        {mode === 'question' ? (
          <div style={{ marginTop: 16 }}>
            <label className="label" htmlFor="q">
              질문
            </label>
            <textarea
              id="q"
              className="field"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="무엇이 궁금한가요?"
            />
          </div>
        ) : (
          <div style={{ marginTop: 16 }}>
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
            스프레드
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
            disabled={busy}
            onClick={() => void run()}
          >
            {busy ? '리딩 중…' : '카드 뽑고 AI 리딩'}
          </button>
        </div>
      </div>

      {cards.length > 0 && <SpreadCards cards={cards} />}
      {error && <p className="error-text">{error}</p>}
      {savedMsg && <p className="feedback-ok">{savedMsg}</p>}

      {result && (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>AI 리딩</h2>
          <div className="ai-result">{result}</div>
          <div className="btn-row">
            <button
              type="button"
              className="btn"
              onClick={() => {
                setLastSpeakText(result)
                void speak(result)
              }}
            >
              읽어주기
            </button>
            <button type="button" className="btn btn--primary" onClick={() => void onSave()}>
              저장하기
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
