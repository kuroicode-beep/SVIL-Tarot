import { useState } from 'react'
import {
  calcSoulCard,
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
  const { speak, setLastSpeakText, ollamaOk } = useApp()

  const compute = () => {
    setError(null)
    setAiText('')
    setSavedMsg(null)
    try {
      const birth = `${y.padStart(4, '0')}${m.padStart(2, '0')}${d.padStart(2, '0')}`
      const n = calcSoulCard(birth)
      setNumber(n)
      const name = soulCardNames[n]
      const base = soulCardDescriptions[n]
      const text = `소울카드 ${n}번 ${name}. ${base}`
      setLastSpeakText(text)
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
      const name = soulCardNames[number]
      const base = soulCardDescriptions[number]
      const text = await soulCardAiExplain(number, name, base)
      setAiText(text)
      setLastSpeakText(text)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI 설명 실패')
    } finally {
      setBusy(false)
    }
  }

  const onSave = async () => {
    if (number == null) return
    await saveHistory({
      kind: 'soul',
      title: `소울카드 · ${number} ${soulCardNames[number]}`,
      cards: [
        {
          id: soulCardMajorIds[number],
          nameKo: soulCardNames[number],
          nameEn: soulCardNames[number],
          isReversed: false,
        },
      ],
      aiText: aiText || soulCardDescriptions[number],
      meta: { number, birth: `${y}-${m}-${d}` },
    })
    setSavedMsg('저장됨 — 기록 메뉴에서 확인할 수 있습니다.')
  }

  return (
    <main className="page">
      <h1>소울카드</h1>
      <p className="muted">생년월일로 1~9 소울카드를 계산하고, 로컬 AI로 설명을 듣습니다.</p>
      <div className="btn-row">
        <ConnectionBadge label="Ollama" ok={ollamaOk} />
      </div>

      <div className="panel">
        <div className="label">생년월일</div>
        <div className="btn-row">
          <label>
            년
            <input
              className="field"
              style={{ width: 120, marginLeft: 8 }}
              inputMode="numeric"
              value={y}
              onChange={(e) => setY(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="YYYY"
              aria-label="년"
            />
          </label>
          <label>
            월
            <input
              className="field"
              style={{ width: 80, marginLeft: 8 }}
              inputMode="numeric"
              value={m}
              onChange={(e) => setM(e.target.value.replace(/\D/g, '').slice(0, 2))}
              placeholder="MM"
              aria-label="월"
            />
          </label>
          <label>
            일
            <input
              className="field"
              style={{ width: 80, marginLeft: 8 }}
              inputMode="numeric"
              value={d}
              onChange={(e) => setD(e.target.value.replace(/\D/g, '').slice(0, 2))}
              placeholder="DD"
              aria-label="일"
            />
          </label>
        </div>
        <div className="btn-row">
          <button type="button" className="btn btn--primary" onClick={compute}>
            소울카드 계산
          </button>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}
      {savedMsg && <p className="feedback-ok">{savedMsg}</p>}

      {number != null && (
        <>
          <div className="panel" style={{ textAlign: 'center' }}>
            <p className="progress">번호 {number}</p>
            <h2 style={{ marginTop: 0 }}>영혼의 목소리: {soulCardNames[number]}</h2>
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
              기본 설명 읽어주기
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={busy}
              onClick={() => void onAi()}
            >
              {busy ? 'AI 설명 생성 중…' : 'AI 설명 듣기'}
            </button>
            <button type="button" className="btn" onClick={() => void onSave()}>
              저장하기
            </button>
          </div>
        </>
      )}

      {aiText && (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>AI 설명</h2>
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
