// src/pages/CalendarPage.tsx — 운세 캘린더·택일 화면. 목록 뷰가 기본이고 달력 격자는 토글로만 연다.
import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import {
  bestDays,
  monthDays,
  PURPOSE_IDS,
  PURPOSE_LABEL_KEY,
  type DayInfo,
  type PurposeId,
} from '../lib/almanac'

const RANGES = [30, 60, 90] as const
type Range = (typeof RANGES)[number]

const RANGE_KEY: Record<Range, string> = {
  30: 'cal_range_30',
  60: 'cal_range_60',
  90: 'cal_range_90',
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function isoOf(y: number, m: number, d: number) {
  return `${y}-${pad2(m)}-${pad2(d)}`
}

export function CalendarPage() {
  const { t, setLastSpeakText } = useApp()

  // 렌더마다 new Date()를 부르면 하루가 바뀌는 순간 기준일이 흔들린다. 진입 시각 한 번만 고정한다.
  const today = useMemo(() => new Date(), [])
  const todayIso = isoOf(today.getFullYear(), today.getMonth() + 1, today.getDate())

  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() + 1 })
  // 저시력에서는 격자보다 한 줄씩 펼친 목록이 읽기 쉬워 목록을 기본값으로 둔다.
  const [view, setView] = useState<'list' | 'grid'>('list')
  const [picked, setPicked] = useState<PurposeId[]>([])
  const [range, setRange] = useState<Range>(30)
  const [selected, setSelected] = useState<string | null>(todayIso)

  const days = useMemo(() => monthDays(cursor.y, cursor.m), [cursor])

  // 목적을 여러 개 고르면 "전부 맞는 날"만 남긴다. 택일은 보통 조건을 겹쳐서 찾기 때문이다.
  const shown = useMemo(
    () => (picked.length === 0 ? days : days.filter((d) => picked.every((p) => d.purposes[p].good))),
    [days, picked],
  )
  const matched = useMemo(() => new Set(shown.map((d) => d.date)), [shown])

  const selectedInfo = useMemo(
    () => days.find((d) => d.date === selected) ?? null,
    [days, selected],
  )

  const activePurpose = picked[0] ?? null
  const best = useMemo(
    () => (activePurpose ? bestDays(activePurpose, range, today, 5) : []),
    [activePurpose, range, today],
  )

  const goodPurposeText = (info: DayInfo) => {
    const names = PURPOSE_IDS.filter((p) => info.purposes[p].good).map((p) =>
      t(PURPOSE_LABEL_KEY[p]),
    )
    return names.length > 0
      ? t('cal_good_purposes', { list: names.join(', ') })
      : t('cal_good_none')
  }

  const dayLine = (info: DayInfo) => {
    const [, m, d] = info.date.split('-').map(Number)
    return [
      t('cal_date_md', { m, d }),
      t(`cal_wd_${info.weekday}`),
      info.dayGanji,
      t('cal_score_grade', { score: info.score, grade: t(info.gradeKey) }),
    ].join(' · ')
  }

  const moveMonth = (delta: number) => {
    setCursor((c) => {
      const dt = new Date(Date.UTC(c.y, c.m - 1 + delta, 1))
      return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1 }
    })
  }

  const goToday = () => {
    setCursor({ y: today.getFullYear(), m: today.getMonth() + 1 })
    setSelected(todayIso)
  }

  const togglePurpose = (p: PurposeId) => {
    setPicked((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]))
  }

  const jumpTo = (date: string) => {
    const [y, m] = date.split('-').map(Number)
    setCursor({ y, m })
    setSelected(date)
  }

  // 상단바 '읽어주기'가 이 화면에서도 뭔가를 읽도록 선택한 날 요약을 등록한다.
  useEffect(() => {
    if (!selectedInfo) {
      setLastSpeakText(`${t('cal_title')}. ${t('cal_desc')}`)
      return
    }
    setLastSpeakText(`${dayLine(selectedInfo)}. ${goodPurposeText(selectedInfo)}`)
    // dayLine·goodPurposeText는 t만 참조하므로 t가 의존성에 들어가면 충분하다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInfo, t, setLastSpeakText])

  // 격자 첫 줄 앞의 빈 칸 수 — 1일의 요일만큼 밀어야 요일 열이 맞는다
  const leading = days.length > 0 ? days[0].weekday : 0

  return (
    <main className="page">
      <h1>{t('cal_title')}</h1>
      <p className="muted">{t('cal_desc')}</p>

      {/* 과장 방지 고지 — 규칙 기반 참고 점수라는 사실을 화면에서 먼저 알린다 */}
      <div className="warn-panel" role="note" aria-label={t('cal_warn_title')}>
        <strong>{t('cal_warn_title')}</strong>
        <p style={{ margin: '8px 0 0' }}>{t('cal_warn_body')}</p>
      </div>

      <div className="panel">
        <div className="btn-row" style={{ marginTop: 0 }}>
          <button type="button" className="btn" onClick={() => moveMonth(-1)}>
            ← {t('cal_prev_month')}
          </button>
          <button type="button" className="btn btn--primary" onClick={goToday}>
            {t('cal_today')}
          </button>
          <button type="button" className="btn" onClick={() => moveMonth(1)}>
            {t('cal_next_month')} →
          </button>
        </div>

        <h2 aria-live="polite" style={{ marginBottom: 8 }}>
          {t('cal_ym', { y: cursor.y, m: cursor.m })}
        </h2>

        <div className="btn-row" style={{ marginTop: 0 }}>
          <div className="segment" role="group" aria-label={t('cal_view')}>
            <button
              type="button"
              className={view === 'list' ? 'is-on' : ''}
              aria-pressed={view === 'list'}
              onClick={() => setView('list')}
            >
              {t('cal_view_list')}
            </button>
            <button
              type="button"
              className={view === 'grid' ? 'is-on' : ''}
              aria-pressed={view === 'grid'}
              onClick={() => setView('grid')}
            >
              {t('cal_view_grid')}
            </button>
          </div>
        </div>

        <p className="label" style={{ marginTop: 16 }} id="cal-filter-label">
          {t('cal_filter_label')}
        </p>
        <div className="chip-row" role="group" aria-labelledby="cal-filter-label">
          {PURPOSE_IDS.map((p) => (
            <button
              key={p}
              type="button"
              // 선택을 색으로만 알리지 않도록 aria-pressed와 ✓ 글리프(.chip.is-on)를 함께 쓴다
              className={`chip${picked.includes(p) ? ' is-on' : ''}`}
              aria-pressed={picked.includes(p)}
              onClick={() => togglePurpose(p)}
            >
              {t(PURPOSE_LABEL_KEY[p])}
            </button>
          ))}
        </div>
        <p className="muted" style={{ marginTop: 8 }}>
          {t('cal_filter_hint')}
        </p>
      </div>

      {view === 'list' ? (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>{t('cal_list_title')}</h2>
          {shown.length === 0 ? (
            <p>{t('cal_empty_filter')}</p>
          ) : (
            <div className="list-choice">
              {shown.map((info) => (
                <button
                  key={info.date}
                  type="button"
                  className={selected === info.date ? 'is-selected' : ''}
                  aria-pressed={selected === info.date}
                  onClick={() => setSelected(info.date)}
                >
                  {/* .list-choice .is-selected의 ✓ ::before가 같은 줄에 붙도록 첫 줄은 인라인으로 둔다.
                      block이면 체크 글리프만 위쪽에 따로 떨어져 한 줄을 잡아먹는다. */}
                  <span style={{ fontWeight: 700 }}>
                    {dayLine(info)}
                    {info.date === todayIso && ` · ${t('cal_is_today')}`}
                  </span>
                  <span
                    style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-sub)' }}
                  >
                    {goodPurposeText(info)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>{t('cal_view_grid')}</h2>
          <p className="warn-inline" style={{ marginBottom: 12 }}>
            {t('cal_grid_caption')}
          </p>
          {/* 격자는 좁은 화면에서 열이 뭉개지므로 바깥에서만 가로 스크롤시킨다 */}
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 392 }}>
              <div
                aria-hidden="true"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, minmax(50px, 1fr))',
                  gap: 6,
                  marginBottom: 6,
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                }}
              >
                {[0, 1, 2, 3, 4, 5, 6].map((w) => (
                  <span key={w}>{t(`cal_wds_${w}`)}</span>
                ))}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, minmax(50px, 1fr))',
                  gap: 6,
                }}
              >
                {Array.from({ length: leading }, (_, i) => (
                  <span key={`pad-${i}`} aria-hidden="true" />
                ))}
                {days.map((info) => {
                  const d = Number(info.date.slice(8))
                  const isSel = selected === info.date
                  const hit = matched.has(info.date)
                  return (
                    <button
                      key={info.date}
                      type="button"
                      aria-pressed={isSel}
                      // 스크린리더는 칸 안의 숫자만으로는 뜻을 알 수 없어 한 줄 요약을 통째로 붙인다
                      aria-label={`${dayLine(info)}. ${goodPurposeText(info)}`}
                      onClick={() => setSelected(info.date)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 2,
                        minHeight: 64,
                        minWidth: 50,
                        padding: '6px 2px',
                        borderRadius: 'var(--radius)',
                        border: `2px solid ${isSel ? 'var(--primary-border)' : 'var(--border-strong)'}`,
                        borderLeftWidth: isSel ? 6 : 2,
                        background: isSel ? 'var(--primary-surface)' : 'var(--surface-2)',
                        color: isSel ? 'var(--on-primary)' : 'var(--text)',
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ fontWeight: 700, fontSize: '1rem' }}>
                        {/* 필터에 맞는 날은 색이 아니라 글리프로 표시한다 */}
                        {hit && picked.length > 0 ? '✓' : ''}
                        {d}
                      </span>
                      <span style={{ fontSize: '0.8rem' }}>{info.score}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>{t('cal_detail_title')}</h2>
        {!selectedInfo ? (
          <p>{t('cal_select_day')}</p>
        ) : (
          <>
            <dl className="pillar-list">
              <div className="pillar-list__row">
                <dt>{t('cal_field_date')}</dt>
                <dd>
                  {selectedInfo.date} ({t(`cal_wd_${selectedInfo.weekday}`)})
                </dd>
              </div>
              <div className="pillar-list__row">
                <dt>{t('cal_field_ganji')}</dt>
                <dd className="pillar-list__ganji">{selectedInfo.dayGanji}</dd>
              </div>
              <div className="pillar-list__row">
                <dt>{t('cal_field_officer')}</dt>
                <dd>{selectedInfo.officerKey ? t(selectedInfo.officerKey) : '—'}</dd>
              </div>
              <div className="pillar-list__row">
                <dt>{t('cal_field_sinsal')}</dt>
                <dd>{selectedInfo.sinsalKey ? t(selectedInfo.sinsalKey) : '—'}</dd>
              </div>
              <div className="pillar-list__row">
                <dt>{t('cal_field_god')}</dt>
                <dd>
                  {/* 길/흉을 색이 아니라 글리프 + 이름으로 갈라 준다 */}
                  {selectedInfo.godKey
                    ? `${selectedInfo.godGood ? '✓' : '✕'} ${t(selectedInfo.godKey)}`
                    : '—'}
                </dd>
              </div>
              <div className="pillar-list__row">
                <dt>{t('cal_field_score')}</dt>
                <dd>
                  {t('cal_score_grade', {
                    score: selectedInfo.score,
                    grade: t(selectedInfo.gradeKey),
                  })}
                </dd>
              </div>
            </dl>

            <h3>{t('cal_fit_title')}</h3>
            <dl className="pillar-list">
              {PURPOSE_IDS.map((p) => {
                const r = selectedInfo.purposes[p]
                return (
                  <div key={p} className="pillar-list__row">
                    <dt>{t(PURPOSE_LABEL_KEY[p])}</dt>
                    <dd style={{ flex: 1, minWidth: '12em' }}>
                      <strong>
                        {r.good ? '✓' : '✕'} {r.good ? t('cal_fit') : t('cal_unfit')}
                      </strong>
                      <span style={{ display: 'block', color: 'var(--text-sub)' }}>
                        {t(r.reasonKey)}
                      </span>
                    </dd>
                  </div>
                )
              })}
            </dl>
          </>
        )}
      </div>

      {activePurpose && (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>
            {t('cal_best_title', { purpose: t(PURPOSE_LABEL_KEY[activePurpose]) })}
          </h2>
          <p className="muted">{t('cal_best_hint', { n: range })}</p>
          <div className="btn-row" style={{ marginTop: 0 }}>
            <div className="segment" role="group" aria-label={t('cal_best_range')}>
              {RANGES.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={range === r ? 'is-on' : ''}
                  aria-pressed={range === r}
                  onClick={() => setRange(r)}
                >
                  {t(RANGE_KEY[r])}
                </button>
              ))}
            </div>
          </div>
          {best.length === 0 ? (
            <p style={{ marginTop: 12 }}>{t('cal_best_empty')}</p>
          ) : (
            <div className="list-choice" style={{ marginTop: 12 }}>
              {best.map((info) => (
                <button key={info.date} type="button" onClick={() => jumpTo(info.date)}>
                  <span style={{ fontWeight: 700 }}>
                    {info.date} · {t(`cal_wd_${info.weekday}`)} · {info.dayGanji} ·{' '}
                    {t('cal_score_grade', { score: info.score, grade: t(info.gradeKey) })}
                  </span>
                  <span style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-sub)' }}>
                    {t(info.purposes[activePurpose].reasonKey)}
                  </span>
                </button>
              ))}
            </div>
          )}
          {picked.length > 1 && (
            <p className="muted" style={{ marginTop: 12 }}>
              {t('cal_best_first_only', { purpose: t(PURPOSE_LABEL_KEY[activePurpose]) })}
            </p>
          )}
        </div>
      )}
    </main>
  )
}
