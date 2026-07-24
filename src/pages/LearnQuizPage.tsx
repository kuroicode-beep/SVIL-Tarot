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
  const { speak, setLastSpeakText, t } = useApp()

  const q = items[qi]
  const card = useMemo(() => (q ? getCard(q.cardId) : null), [q])

  if (!items.length) {
    return (
      <main className="page">
        <h1>{t('quiz')}</h1>
        <p className="error-text">{t('quiz_none')}</p>
        <Link className="btn" to="/learn">
          {t('learn_stage_list')}
        </Link>
      </main>
    )
  }

  if (done) {
    const text = t('quiz_done_spoken', { total: items.length, score })
    return (
      <main className="page">
        <h1>{t('quiz_result')}</h1>
        <p className="progress">{t('quiz_score', { score, total: items.length })}</p>
        <p className={score === items.length ? 'feedback-ok' : 'feedback-bad'}>
          {score === items.length ? t('quiz_all_ok') : t('quiz_some_wrong')}
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
            {t('nav_tts')}
          </button>
          <Link className="btn btn--primary" to="/learn">
            {t('learn_stage_list')}
          </Link>
        </div>
      </main>
    )
  }

  const answered = picked !== null
  const correct = picked === q.answerIndex

  return (
    <main className="page">
      <p className="progress">{t('quiz_progress', { i: qi + 1, n: items.length })}</p>
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
            {correct ? t('quiz_right') : t('quiz_wrong', { answer: q.options[q.answerIndex] })}
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
              {qi >= items.length - 1 ? t('quiz_see_result') : t('quiz_next_q')}
            </button>
          </div>
        </>
      )}
    </main>
  )
}
