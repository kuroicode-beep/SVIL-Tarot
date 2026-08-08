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

/**
 * 데이터에서 정답 위치를 아무리 고르게 분산해도, 이 화면이 JSON 순서를 그대로 렌더하는 한
 * 같은 스테이지를 반복하면 "몇 번째 보기가 정답인지"를 통째로 외우게 된다.
 * 그래서 렌더 시점에 보기를 섞되, 시드를 문항에 고정해 같은 문항을 다시 그려도(리렌더·오답 확인)
 * 순서가 흔들리지 않게 한다. 세션이 바뀌면 sessionSeed가 달라져 배치도 달라진다.
 */
function shuffleOptions(options: string[], seed: number): string[] {
  const out = [...options]
  let state = seed >>> 0
  const rand = () => {
    // mulberry32 — 결정적이고 짧다. 순서 재현만 필요해서 암호학적 품질은 불필요하다.
    state = (state + 0x6d2b79f5) >>> 0
    let x = state
    x = Math.imul(x ^ (x >>> 15), x | 1)
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function hashString(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619)
  }
  return h >>> 0
}

export function LearnQuizPage() {
  const { stageId = '' } = useParams()
  const items = ((quizzes.byStage as Record<string, QuizItem[]>)[stageId] ?? []) as QuizItem[]
  const [qi, setQi] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  // 세션마다 배치가 달라지도록 마운트 시 한 번만 정한다. 렌더 중 난수를 쓰면 매 렌더마다 순서가 바뀐다.
  const [sessionSeed] = useState(() => Math.floor(Math.random() * 0xffffffff))
  const { speak, setLastSpeakText, t } = useApp()

  const q = items[qi]
  const card = useMemo(() => (q ? getCard(q.cardId) : null), [q])
  // 문항 + 세션 시드로 결정적 셔플. 같은 문항 안에서는 순서가 고정된다.
  const shuffled = useMemo(
    () => (q ? shuffleOptions(q.options, hashString(`${q.cardId}#${qi}`) ^ sessionSeed) : []),
    [q, qi, sessionSeed],
  )

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
  // 보기를 섞으므로 정답 판정은 반드시 문자열 기준이어야 한다.
  // (인덱스 비교는 셔플과 함께 쓰면 곧바로 오답 처리가 된다.)
  const answerText = q.options[q.answerIndex]
  const correct = picked !== null && shuffled[picked] === answerText

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
        {shuffled.map((opt, i) => {
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
