import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import lessons from '../data/lessons.json'
import { getCard } from '../lib/cards'
import { TarotCardView } from '../components/TarotCardView'
import { useApp } from '../context/AppContext'

type Stage = (typeof lessons.stages)[number]

export function LearnPage() {
  const { stageId } = useParams()
  const nav = useNavigate()
  const { speak, setLastSpeakText } = useApp()
  const stages = lessons.stages as Stage[]
  const stage = stages.find((s) => s.id === stageId) ?? stages[0]
  const [idx, setIdx] = useState(0)

  const card = useMemo(() => getCard(stage.cardIds[idx]), [stage, idx])

  const speakLesson = () => {
    const text = `${stage.title}. ${card.nameKo}. 정방향: ${card.upright}. 역방향: ${card.reversed}. ${card.lesson}`
    setLastSpeakText(text)
    void speak(text)
  }

  if (!stageId) {
    return (
      <main className="page">
        <h1>타로 배우기</h1>
        <p className="muted">단계별로 카드를 익히고, 퀴즈로 확인합니다.</p>
        <div className="list-choice" style={{ marginTop: 20 }}>
          {stages.map((s, i) => (
            <button key={s.id} type="button" onClick={() => nav(`/learn/${s.id}`)}>
              <strong>
                {i + 1}. {s.title}
              </strong>
              <div className="muted">{s.description}</div>
              <div className="muted mono">카드 {s.cardIds.length}장</div>
            </button>
          ))}
        </div>
      </main>
    )
  }

  return (
    <main className="page">
      <p className="progress">
        {stage.title} · {idx + 1} / {stage.cardIds.length}
      </p>
      <h1>
        {card.nameKo}{' '}
        <span className="muted" style={{ fontSize: '1rem' }}>
          ({card.nameEn})
        </span>
      </h1>
      <div className="spread-row">
        <TarotCardView cardId={card.id} large />
      </div>
      <div className="panel">
        <p>
          <strong>정방향</strong>: {card.upright}
        </p>
        <p>
          <strong>역방향</strong>: {card.reversed}
        </p>
        <p>{card.lesson}</p>
      </div>
      <div className="btn-row">
        <button type="button" className="btn" onClick={speakLesson}>
          읽어주기
        </button>
        <button
          type="button"
          className="btn"
          disabled={idx === 0}
          onClick={() => setIdx((v) => Math.max(0, v - 1))}
        >
          이전
        </button>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => {
            if (idx < stage.cardIds.length - 1) setIdx((v) => v + 1)
            else nav(`/learn/${stage.id}/quiz`)
          }}
        >
          {idx < stage.cardIds.length - 1 ? '다음' : '퀴즈 풀기'}
        </button>
        <Link className="btn" to={`/learn/${stage.id}/quiz`}>
          퀴즈로 바로가기
        </Link>
      </div>
    </main>
  )
}
