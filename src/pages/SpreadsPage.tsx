// src/pages/SpreadsPage.tsx — 스프레드 목록·상세·퀴즈 화면
import { useState } from 'react'
import spreads from '../data/spreads.json'
import { useApp } from '../context/AppContext'

type Spread = (typeof spreads)[number]

export function SpreadsPage() {
  const list = spreads as Spread[]
  const [selected, setSelected] = useState<Spread | null>(null)
  const [quizMode, setQuizMode] = useState(false)
  const [picked, setPicked] = useState<number | null>(null)
  const { speak, setLastSpeakText, t } = useApp()

  if (quizMode && selected) {
    const q = selected.quiz
    const answered = picked !== null
    // 보기 문자열이 중복될 수 있어 인덱스가 아니라 정답 문자열로 비교한다.
    const answerText = q.options[q.answerIndex]
    const correct = picked !== null && q.options[picked] === answerText
    return (
      <main className="page">
        <h1>{t('spreads_quiz_title', { name: selected.nameKo })}</h1>
        <p>{q.question}</p>
        <div className="list-choice">
          {q.options.map((opt, i) => {
            // 정오답을 테두리 색으로만 알리면 색각·저시력 사용자가 구분하지 못해 글자 라벨을 함께 붙인다.
            const isCorrect = answered && opt === answerText
            const isWrong = answered && i === picked && opt !== answerText
            return (
              <button
                // 보기 문자열이 겹쳐도 키가 충돌하지 않도록 스프레드 id + 인덱스로 고정한다.
                key={`${selected.id}-opt-${i}`}
                type="button"
                className={`option-btn${isCorrect ? ' is-correct' : isWrong ? ' is-wrong' : ''}`}
                // disabled면 답을 고른 순간 포커스가 body로 튕기고 탭 순서에서 빠져 결과를 다시 읽을 수 없다.
                aria-disabled={answered || undefined}
                onClick={() => {
                  if (answered) return
                  setPicked(i)
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
          <p className={correct ? 'feedback-ok' : 'feedback-bad'} role="status">
            {correct ? t('quiz_right') : t('quiz_wrong', { answer: answerText })}
          </p>
        )}
        <div className="btn-row">
          <button
            type="button"
            className="btn"
            onClick={() => {
              setQuizMode(false)
              setPicked(null)
            }}
          >
            {t('spreads_back')}
          </button>
        </div>
      </main>
    )
  }

  if (selected) {
    // 낭독 문구의 '포지션' 머리말도 언어를 따라가야 해서 사전 키를 쓴다.
    const text = `${selected.nameKo}. ${selected.description}. ${t('spreads_positions')}: ${selected.positions
      .map((p) => p.labelKo)
      .join(', ')}`
    return (
      <main className="page">
        <h1>{selected.nameKo}</h1>
        <p className="muted">{selected.description}</p>
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>{t('spreads_positions')}</h2>
          <div className="spread-row">
            {selected.positions.map((p, i) => (
              <div key={p.key} className="spread-slot">
                <div
                  className="card-img"
                  style={{
                    maxWidth: 100,
                    minHeight: 140,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '1.5rem',
                    color: 'var(--accent-strong)',
                  }}
                  aria-hidden="true"
                >
                  {i + 1}
                </div>
                <div className="spread-slot__pos">{p.labelKo}</div>
              </div>
            ))}
          </div>
        </div>
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
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              setQuizMode(true)
              setPicked(null)
            }}
          >
            {t('quiz')}
          </button>
          <button type="button" className="btn" onClick={() => setSelected(null)}>
            {t('list_label')}
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="page">
      <h1>{t('spreads_title')}</h1>
      <p className="muted">{t('spreads_desc')}</p>
      <div className="list-choice" style={{ marginTop: 20 }}>
        {list.map((s) => (
          <button key={s.id} type="button" onClick={() => setSelected(s)}>
            <strong>{s.nameKo}</strong>
            <div className="muted">{s.description}</div>
            <div className="muted mono">{t('card_count', { n: s.cardCount })}</div>
          </button>
        ))}
      </div>
    </main>
  )
}
