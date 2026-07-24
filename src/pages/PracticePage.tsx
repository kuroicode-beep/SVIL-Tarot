import { useState } from 'react'
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
  const { speak, setLastSpeakText, ollamaOk } = useApp()

  const spread = list.find((s) => s.id === spreadId) ?? list[1]

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

  const onSave = async () => {
    if (!cards.length) return
    await saveHistory({
      kind: 'practice',
      title: `실전 · ${spread.nameKo}`,
      cards,
      userNote: note,
      aiText,
      meta: { spreadId: spread.id },
    })
    setSavedMsg('저장됨 — 기록 메뉴에서 확인할 수 있습니다.')
  }

  return (
    <main className="page">
      <h1>실전 타로 보기</h1>
      <p className="muted">카드를 뽑고 나의 해설을 쓴 뒤, 로컬 AI 조언을 받습니다.</p>
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
              저장하기
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
              읽어주기
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
