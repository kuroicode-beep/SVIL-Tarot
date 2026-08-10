// src/pages/SpreadsPage.tsx — 스프레드 목록·상세·퀴즈 화면. 기본 프리셋과 내가 만든 스프레드를 함께 본다.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import spreads from '../data/spreads.json'
import { listCustomSpreads } from '../services/customSpreads'
import { useApp } from '../context/AppContext'

type Preset = (typeof spreads)[number]

/**
 * 프리셋과 내 스프레드를 한 화면이 구분 없이 그리기 위한 모양.
 * 내 스프레드에는 설명·퀴즈가 없다. 없는 걸 빈 문자열로 채우면 화면에 빈 줄이 남으므로
 * optional로 두고, 렌더에서 있는 것만 그린다.
 */
type SpreadView = {
  id: string
  nameKo: string
  cardCount: number
  positions: { key: string; labelKo: string }[]
  description?: string
  quiz?: Preset['quiz']
  custom: boolean
}

const PRESET_VIEWS: SpreadView[] = (spreads as Preset[]).map((s) => ({
  id: s.id,
  nameKo: s.nameKo,
  cardCount: s.cardCount,
  positions: s.positions.map((p) => ({ key: p.key, labelKo: p.labelKo })),
  description: s.description,
  quiz: s.quiz,
  custom: false,
}))

export function SpreadsPage() {
  const [mine, setMine] = useState<SpreadView[]>([])
  // '불러오는 중' · '읽기 실패' · '진짜 없음'을 같은 문구로 보여 주면 사용자는 없다고 믿는다.
  const [mineState, setMineState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [selected, setSelected] = useState<SpreadView | null>(null)
  const [quizMode, setQuizMode] = useState(false)
  const [picked, setPicked] = useState<number | null>(null)
  const { speak, setLastSpeakText, t } = useApp()

  // 내 스프레드는 IndexedDB에 있다. 못 읽어도 프리셋 목록은 그대로 보여야 한다.
  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const rows = await listCustomSpreads()
        if (!alive) return
        // 저장된 레코드도 신뢰하지 않는다 — 예전 파일에서 가져온 것이 섞여 있을 수 있다.
        // 한 건이 망가졌다고 map 전체가 throw하면 멀쩡한 스프레드까지 통째로 사라진다.
        setMine(
          rows
            .filter((s) => Array.isArray(s.positions) && s.positions.length > 0)
            .map((s) => ({
              id: s.id,
              nameKo: s.nameKo,
              cardCount: s.positions.length,
              positions: s.positions.map((p) => ({ key: p.key, labelKo: p.labelKo })),
              custom: true,
            })),
        )
        setMineState('ready')
      } catch {
        if (!alive) return
        setMine([])
        setMineState('error')
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  if (quizMode && selected?.quiz) {
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
    // 내 스프레드에는 설명이 없으므로 있을 때만 끼운다.
    const desc = selected.description ? `${selected.description}. ` : ''
    const text = `${selected.nameKo}. ${desc}${t('spreads_positions')}: ${selected.positions
      .map((p) => p.labelKo)
      .join(', ')}`
    return (
      <main className="page">
        <h1>{selected.nameKo}</h1>
        {/* 내 스프레드임을 색이 아니라 글자로 알린다. */}
        {selected.custom && <p className="status-badge">{t('sb_title')}</p>}
        {selected.description && <p className="muted">{selected.description}</p>}
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
          {/* 퀴즈는 프리셋에만 있다. 내 스프레드에서 버튼만 띄워 놓고 아무 일도 없으면 고장으로 읽힌다. */}
          {selected.quiz && (
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
          )}
          <Link className="btn" to={`/practice?spread=${encodeURIComponent(selected.id)}`}>
            {t('spreads_use')}
          </Link>
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
        {PRESET_VIEWS.map((s) => (
          <button key={s.id} type="button" onClick={() => setSelected(s)}>
            <strong>{s.nameKo}</strong>
            <div className="muted">{s.description}</div>
            <div className="muted mono">{t('card_count', { n: s.cardCount })}</div>
          </button>
        ))}
      </div>

      <h2 style={{ marginTop: 28 }}>{t('sb_title')}</h2>
      {mineState === 'loading' ? (
        <p className="muted" role="status">
          {t('loading')}
        </p>
      ) : mineState === 'error' ? (
        <p className="error-text" role="alert">
          {t('spreads_mine_error')}
        </p>
      ) : mine.length === 0 ? (
        <p className="muted">{t('spreads_mine_empty')}</p>
      ) : (
        <div className="list-choice">
          {mine.map((s) => (
            <button key={s.id} type="button" onClick={() => setSelected(s)}>
              <strong>{s.nameKo}</strong>
              <div className="muted mono">{t('card_count', { n: s.cardCount })}</div>
            </button>
          ))}
        </div>
      )}
      <div className="btn-row">
        <Link className="btn" to="/spread-builder">
          {t('spreads_manage_mine')}
        </Link>
      </div>
    </main>
  )
}
