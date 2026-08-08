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
        <p className="error-text" role="alert">{t('quiz_none')}</p>
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
  // 인덱스가 아니라 문자열로 비교한다. 정답과 글자가 같은 보기가 또 있으면
  // 인덱스 비교는 "화면에는 정답인데 오답 처리"가 되어 버린다.
  const answerText = q.options[q.answerIndex]
  const correct = picked !== null && q.options[picked] === answerText

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
        {q.options.map((opt, i) => {
          // 정오답을 색으로만 알리지 않도록 상태 라벨을 함께 붙인다(SVIL 접근성 규칙).
          const isCorrect = answered && opt === answerText
          const isWrong = answered && i === picked && opt !== answerText
          return (
            <button
              // 보기 문자열은 중복될 수 있어 key로 쓰면 리렌더 시 fiber가 어긋난다.
              key={`${q.cardId}-${i}`}
              type="button"
              className={`option-btn${isCorrect ? ' is-correct' : isWrong ? ' is-wrong' : ''}`}
              // disabled를 걸면 포커스가 body로 튕기고 탭 순서에서 빠져 정답을 다시 읽을 수 없다.
              aria-disabled={answered || undefined}
              onClick={() => {
                if (answered) return
                setPicked(i)
                if (opt === answerText) setScore((s) => s + 1)
              }}
            >
              <span>{opt}</span>
              {(isCorrect || isWrong) && (
                <span className="option-btn__mark">{isCorrect ? t('quiz_mark_ok') : t('quiz_mark_bad')}</span>
              )}
            </button>
          )
        })}
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
