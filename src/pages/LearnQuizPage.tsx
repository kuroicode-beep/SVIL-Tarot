import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import quizzes from '../data/quizzes.json'
import { getCard } from '../lib/cards'
import { TarotCardView } from '../components/TarotCardView'
import { useApp } from '../context/AppContext'

type QuizItem = {
  cardId: string
  question: string
  options: string[]
  answerIndex: number
}

export function LearnQuizPage() {
  const { stageId = '' } = useParams()
  const items = ((quizzes.byStage as Record<string, QuizItem[]>)[stageId] ?? []) as QuizItem[]
  const [qi, setQi] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const { speak, setLastSpeakText } = useApp()

  const q = items[qi]
  const card = useMemo(() => (q ? getCard(q.cardId) : null), [q])

  if (!items.length) {
    return (
      <main className="page">
        <h1>퀴즈</h1>
        <p className="error-text">이 단계의 퀴즈가 없습니다.</p>
        <Link className="btn" to="/learn">
          단계 목록
        </Link>
      </main>
    )
  }

  if (done) {
    const text = `퀴즈 완료. ${items.length}문제 중 ${score}문제 정답.`
    return (
      <main className="page">
        <h1>퀴즈 결과</h1>
        <p className="progress">
          정답 {score} / {items.length}
        </p>
        <p className={score === items.length ? 'feedback-ok' : 'feedback-bad'}>
          {score === items.length ? '정답 — 모두 맞혔습니다.' : '오답 포함 — 다시 복습해 보세요.'}
        </p>
        <div className="btn-row">
          <button
            type="button"
            className="btn"
            onClick={() => {
              setLastSpeakText(text)
              void speak(text)
            }}
          >
            읽어주기
          </button>
          <Link className="btn btn--primary" to="/learn">
            단계 목록
          </Link>
        </div>
      </main>
    )
  }

  const answered = picked !== null
  const correct = picked === q.answerIndex

  return (
    <main className="page">
      <p className="progress">
        퀴즈 {qi + 1} / {items.length}
      </p>
      <h1>{q.question}</h1>
      {card && (
        <div className="spread-row">
          <TarotCardView cardId={card.id} />
        </div>
      )}
      <div className="list-choice">
        {q.options.map((opt, i) => (
          <button
            key={opt}
            type="button"
            className={`option-btn${
              answered
                ? i === q.answerIndex
                  ? ' is-correct'
                  : i === picked
                    ? ' is-wrong'
                    : ''
                : ''
            }`}
            disabled={answered}
            onClick={() => {
              setPicked(i)
              if (i === q.answerIndex) setScore((s) => s + 1)
            }}
          >
            {opt}
          </button>
        ))}
      </div>
      {answered && (
        <>
          <p className={correct ? 'feedback-ok' : 'feedback-bad'} role="status">
            {correct ? '정답입니다.' : `오답입니다. 정답: ${q.options[q.answerIndex]}`}
          </p>
          <div className="btn-row">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                if (qi >= items.length - 1) setDone(true)
                else {
                  setQi((v) => v + 1)
                  setPicked(null)
                }
              }}
            >
              {qi >= items.length - 1 ? '결과 보기' : '다음 문제'}
            </button>
          </div>
        </>
      )}
    </main>
  )
}
