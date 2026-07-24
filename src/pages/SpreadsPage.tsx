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
    const correct = picked === q.answerIndex
    return (
      <main className="page">
        <h1>{t('spreads_quiz_title', { name: selected.nameKo })}</h1>
        <p>{q.question}</p>
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
              onClick={() => setPicked(i)}
            >
              {opt}
            </button>
          ))}
        </div>
        {answered && (
          <p className={correct ? 'feedback-ok' : 'feedback-bad'} role="status">
            {correct ? t('quiz_right') : t('quiz_wrong', { answer: q.options[q.answerIndex] })}
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
    const text = `${selected.nameKo}. ${selected.description}. 포지션: ${selected.positions.map((p) => p.labelKo).join(', ')}`
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
