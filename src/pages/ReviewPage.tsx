// src/pages/ReviewPage.tsx — SM-2 간격반복 복습. 오늘 볼 카드만 골라 한 장씩 채점한다.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getLocalizedCard, subtitleEn } from '../lib/cards'
import {
  dueCards,
  newCards,
  recordAnswer,
  srsSummary,
  type SrsGrade,
  type SrsSummary,
} from '../lib/srs'
import { TarotCardView } from '../components/TarotCardView'
import { useApp } from '../context/AppContext'

/** 한 세션에 새로 배울 카드 수. 78장을 한 번에 밀어 넣으면 첫날부터 포기하게 된다. */
const NEW_PER_SESSION = 8

/**
 * 채점 버튼 4개. SM-2의 0~5 중 실제로 사람이 구분할 수 있는 지점만 남겼다.
 * 3 미만은 실패라 '다시'만 2를 쓴다(1과 2는 스케줄이 같아 굳이 나눌 이유가 없다).
 */
const GRADES: { grade: SrsGrade; key: string }[] = [
  { grade: 2, key: 'srs_grade_again' },
  { grade: 3, key: 'srs_grade_hard' },
  { grade: 4, key: 'srs_grade_good' },
  { grade: 5, key: 'srs_grade_easy' },
]

export function ReviewPage() {
  const { t, setLastSpeakText, settings } = useApp()
  const locale = settings.locale

  const [summary, setSummary] = useState<SrsSummary | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')

  // 세션 큐. 시작 버튼을 누른 시점에 고정한다 — 진행 중에 목록이 바뀌면 몇 장 남았는지 알 수 없다.
  const [queue, setQueue] = useState<string[]>([])
  const [pos, setPos] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [lastIntervalDays, setLastIntervalDays] = useState<number | null>(null)
  const [grading, setGrading] = useState(false)
  // 새 카드 세션인지. 처음 보는 카드는 무엇을 눌러도 다음 복습이 내일이라 안내 문구가 달라야 한다.
  const [mode, setMode] = useState<'due' | 'new'>('due')
  // 저장 실패는 조용히 지나가면 안 된다. 화면에 남겨 사용자가 알아채게 한다.
  const [saveFailed, setSaveFailed] = useState(false)
  const [startMsg, setStartMsg] = useState<string | null>(null)

  // 채점 뒤 다음 카드로 넘어가면 포커스가 사라진다. 카드 제목이 받아 현재 위치를 소리로 알린다.
  const cardHeadingRef = useRef<HTMLHeadingElement>(null)
  // 세션이 끝나는 순간에도 포커스를 받아 줄 곳이 필요하다. 없으면 body로 떨어져 위치를 통째로 잃는다.
  const endHeadingRef = useRef<HTMLHeadingElement>(null)

  const reload = async () => {
    setLoadState('loading')
    try {
      setSummary(await srsSummary())
      setLoadState('ready')
    } catch {
      // DB를 못 열었는데 '복습할 카드 없음'으로 보이면 데이터가 사라진 것과 구분되지 않는다.
      setLoadState('error')
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  const currentId = queue[pos]
  const card = useMemo(
    () => (currentId ? getLocalizedCard(currentId, locale) : null),
    [currentId, locale],
  )

  // 상단바 '읽어주기'가 지금 보고 있는 화면을 읽도록 문장을 넘겨 둔다.
  // 뜻을 열기 전에는 이름만 읽어야 한다 — 낭독으로 정답이 새면 복습이 성립하지 않는다.
  // 세션이 끝나면 반드시 갱신한다. 안 그러면 직전 카드의 정·역 뜻 전문이 그대로 남아
  // 완료 화면에서 낭독을 누른 사람에게 엉뚱한 내용이 읽힌다.
  useEffect(() => {
    if (card) {
      setLastSpeakText(
        revealed
          ? `${card.nameKo}. ${t('upright')}: ${card.upright}. ${t('reversed')}: ${card.reversed}. ${card.lesson}`
          : card.nameKo,
      )
      return
    }
    if (queue.length > 0) {
      setLastSpeakText(`${t('srs_done_title')}. ${t('srs_done_body', { n: queue.length })}`)
      return
    }
    if (summary) {
      setLastSpeakText(
        `${t('srs_title')}. ${t('srs_studied')} ${summary.studied}. ${t('srs_due')} ${summary.due}.`,
      )
    }
  }, [card, revealed, queue.length, summary, setLastSpeakText, t])

  // 카드→카드 전환뿐 아니라 세션이 끝나는 순간에도 포커스를 옮긴다.
  // 채점 버튼이 언마운트되면 포커스가 body로 떨어져 키보드·스크린리더 사용자는 위치를 잃는다.
  useEffect(() => {
    if (currentId) cardHeadingRef.current?.focus()
    else if (queue.length > 0) endHeadingRef.current?.focus()
  }, [currentId, queue.length])

  const start = async (next: 'due' | 'new') => {
    setLastIntervalDays(null)
    setSaveFailed(false)
    setStartMsg(null)
    try {
      const ids = next === 'due' ? await dueCards() : await newCards(NEW_PER_SESSION)
      if (ids.length === 0) {
        // 빈 큐면 화면이 직전과 똑같아 '버튼이 죽었다'로 읽힌다. 이유를 알리고 수치를 새로 읽는다.
        setStartMsg(t('srs_start_none'))
        await reload()
        return
      }
      setMode(next)
      setQueue(ids)
      setPos(0)
      setRevealed(false)
    } catch {
      setLoadState('error')
    }
  }

  const grade = async (g: SrsGrade) => {
    if (!currentId || grading) return
    // 연타로 같은 카드가 두 번 채점되면 reps가 어긋난다. 저장이 끝날 때까지 막는다.
    setGrading(true)
    try {
      const res = await recordAnswer(currentId, g)
      setLastIntervalDays(res.card.interval)
      // 저장 실패는 성공과 구분해서 알린다. 진행은 막지 않되 사실은 남긴다.
      if (!res.saved) setSaveFailed(true)
    } finally {
      setGrading(false)
      setRevealed(false)
      setPos((v) => v + 1)
    }
  }

  const endSession = async () => {
    setQueue([])
    setPos(0)
    setRevealed(false)
    setStartMsg(null)
    await reload()
  }

  // ---------- 세션 진행 중 ----------

  if (queue.length > 0 && currentId && card) {
    return (
      <main className="page">
        <p className="progress">{t('srs_progress', { i: pos + 1, n: queue.length })}</p>
        {/* tabIndex -1 — 채점 후 다음 카드로 넘어갈 때 포커스를 받아 어디로 이동했는지 알린다. */}
        <h1 ref={cardHeadingRef} tabIndex={-1}>
          {card.nameKo}
        </h1>
        {/* 영어 로케일에서는 부제가 제목과 같은 글자라 그리지 않는다. */}
        {subtitleEn(card) && <p className="muted mono">{subtitleEn(card)}</p>}

        <div className="spread-row">
          <TarotCardView cardId={card.id} large />
        </div>

        {!revealed ? (
          <>
            <p className="muted">{t('srs_reveal_hint')}</p>
            <div className="btn-row">
              <button type="button" className="btn btn--primary" onClick={() => setRevealed(true)}>
                {t('srs_reveal')}
              </button>
              <button type="button" className="btn" onClick={() => void endSession()}>
                {t('srs_stop')}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="panel">
              <h2 style={{ marginTop: 0 }}>{t('upright')}</h2>
              <p>{card.upright}</p>
              <h2>{t('reversed')}</h2>
              <p>{card.reversed}</p>
              <h2>{t('dict_lesson')}</h2>
              <p>{card.lesson}</p>
            </div>

            <div className="panel">
              <h2 style={{ marginTop: 0 }}>{t('srs_grade_title')}</h2>
              {/* 처음 보는 카드는 SM-2상 어느 것을 눌러도 다음 복습이 내일이다(reps=1 → interval=1).
                  '고른 답에 따라 시점이 달라진다'고만 적으면 사실과 다르다. */}
              <p className="muted">{mode === 'new' ? t('srs_grade_hint_new') : t('srs_grade_hint')}</p>
              <div className="list-choice">
                {GRADES.map((g) => (
                  <button
                    key={g.grade}
                    type="button"
                    // 저장 중에 disabled를 걸면 포커스가 body로 튕긴다. 라벨은 유지하고 동작만 막는다.
                    aria-disabled={grading || undefined}
                    onClick={() => void grade(g.grade)}
                  >
                    {t(g.key)}
                  </button>
                ))}
              </div>
              {saveFailed && (
                <p className="error-text" role="alert">
                  {t('srs_save_failed')}
                </p>
              )}
              <div className="btn-row">
                <button type="button" className="btn" onClick={() => void endSession()}>
                  {t('srs_stop')}
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    )
  }

  // ---------- 세션을 다 끝낸 직후 ----------

  if (queue.length > 0 && !currentId) {
    return (
      <main className="page">
        {/* tabIndex -1 — 마지막 카드를 채점한 순간 포커스가 여기로 옮겨온다. */}
        <h1 ref={endHeadingRef} tabIndex={-1}>
          {t('srs_done_title')}
        </h1>
        <p className="feedback-ok" role="status">
          {t('srs_done_body', { n: queue.length })}
        </p>
        {saveFailed && (
          <p className="error-text" role="alert">
            {t('srs_save_failed')}
          </p>
        )}
        {lastIntervalDays !== null && (
          <p className="muted">{t('srs_next_due', { days: lastIntervalDays })}</p>
        )}
        <div className="btn-row">
          <button type="button" className="btn btn--primary" onClick={() => void endSession()}>
            {t('srs_back_summary')}
          </button>
        </div>
      </main>
    )
  }

  // ---------- 진도 요약 ----------

  return (
    <main className="page">
      <h1>{t('srs_title')}</h1>
      <p className="muted">{t('srs_desc')}</p>

      {loadState === 'loading' ? (
        <p className="muted" role="status">
          {t('loading')}
        </p>
      ) : loadState === 'error' ? (
        <div className="panel">
          <p className="error-text" role="alert">
            {t('load_error')}
          </p>
          <button type="button" className="btn btn--primary" onClick={() => void reload()}>
            {t('retry')}
          </button>
        </div>
      ) : (
        summary && (
          <>
            <div className="panel">
              <h2 style={{ marginTop: 0 }}>{t('srs_summary_title')}</h2>
              {/* 수치는 그래프가 아니라 '라벨 — 값' 정의 목록으로. 스크린리더에서도 짝이 유지된다. */}
              <dl className="pillar-list">
                <div className="pillar-list__row">
                  <dt>{t('srs_total')}</dt>
                  <dd className="mono">{summary.total}</dd>
                </div>
                <div className="pillar-list__row">
                  <dt>{t('srs_studied')}</dt>
                  <dd className="mono">{summary.studied}</dd>
                </div>
                <div className="pillar-list__row">
                  <dt>{t('srs_due')}</dt>
                  <dd className="mono">{summary.due}</dd>
                </div>
                <div className="pillar-list__row">
                  <dt>{t('srs_mastered')}</dt>
                  <dd className="mono">{summary.mastered}</dd>
                </div>
              </dl>
            </div>

            <div className="btn-row">
              {/* 0장일 때 버튼을 없애면 왜 못 하는지 알 수 없다. 남겨 두고 이유를 글자로 알린다. */}
              <button
                type="button"
                className="btn btn--primary"
                aria-disabled={summary.due === 0 || undefined}
                onClick={() => {
                  if (summary.due > 0) void start('due')
                }}
              >
                {t('srs_start_due', { n: summary.due })}
              </button>
              <button
                type="button"
                className="btn"
                aria-disabled={summary.studied >= summary.total || undefined}
                onClick={() => {
                  if (summary.studied < summary.total) void start('new')
                }}
              >
                {t('srs_start_new', { n: Math.min(NEW_PER_SESSION, summary.total - summary.studied) })}
              </button>
            </div>
            {/* 시작을 눌렀는데 큐가 비어 있었을 때의 사유. role=status로 소리로도 알린다. */}
            {startMsg && (
              <p className="feedback-bad" role="status">
                {startMsg}
              </p>
            )}
            {summary.due === 0 && <p className="muted">{t('srs_none')}</p>}
            {summary.studied >= summary.total && <p className="muted">{t('srs_all_studied')}</p>}

            <div className="panel">
              <h2 style={{ marginTop: 0 }}>{t('srs_weak_title')}</h2>
              <p className="muted">{t('srs_weak_desc')}</p>
              {summary.weak.length === 0 ? (
                <p>{t('srs_weak_empty')}</p>
              ) : (
                <ol className="list-plain">
                  {summary.weak.map((w) => (
                    <li key={w.cardId}>
                      <strong>{getLocalizedCard(w.cardId, locale).nameKo}</strong>{' '}
                      {/* 색이 아니라 숫자로. 난이도 계수는 낮을수록 어려운 카드다. */}
                      <span className="muted mono">
                        {t('srs_weak_row', { lapses: w.lapses, ease: w.ease.toFixed(2) })}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="btn-row">
              <Link className="btn" to="/dictionary">
                {t('home_dictionary')}
              </Link>
              <Link className="btn" to="/learn">
                {t('home_learn')}
              </Link>
            </div>
          </>
        )
      )}
    </main>
  )
}
