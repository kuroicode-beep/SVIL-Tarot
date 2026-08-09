// src/pages/StatsPage.tsx — 저장된 리딩 기록을 기간별로 집계해 '텍스트 우선'으로 보여 주는 통계 화면
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listHistory, type HistoryEntry } from '../services/history'
import { allCards } from '../lib/cards'
import { computeStats, DECK_SIZE, PERIODS, SUIT_ORDER, type Period } from '../lib/stats'
import { useApp } from '../context/AppContext'

const PERIOD_KEY: Record<Period, string> = {
  7: 'stats_period_7',
  30: 'stats_period_30',
  90: 'stats_period_90',
  0: 'stats_period_all',
}

const SUIT_KEY: Record<string, string> = {
  cup: 'stats_suit_cup',
  wand: 'stats_suit_wand',
  sword: 'stats_suit_sword',
  pentacle: 'stats_suit_pentacle',
}

/** 결과 라벨은 기록 화면과 같은 키를 쓴다. 같은 값이 화면마다 다른 말로 불리면 안 된다. */
const OUTCOME_ROWS = [
  { id: 'hit', key: 'outcome_hit' },
  { id: 'partial', key: 'outcome_partial' },
  { id: 'miss', key: 'outcome_miss' },
] as const

// getCard는 미등록 id에 throw한다. 옛 기록에 남은 카드 id 하나로 통계 화면이 통째로
// 죽지 않도록 throw하지 않는 이름 조회를 쓴다.
const nameById = new Map(allCards.map((c) => [c.id, `${c.nameKo} (${c.nameEn})`]))
const cardLabel = (id: string) => nameById.get(id) ?? id

/** 요약 수치 한 줄. '라벨 — 값' 정의 목록이라 스크린리더에서도 짝이 유지된다. */
function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="pillar-list__row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

/**
 * 보조 막대. 값은 항상 텍스트로 따로 적고 막대는 aria-hidden으로 감춘다.
 * 저시력 사용자에게 막대 길이만으로 읽히는 정보는 없어야 한다.
 * CSS가 없어도 그대로 보이도록 색은 토큰 변수를 인라인으로 쓴다.
 */
function StatBar({ ratio }: { ratio: number }) {
  const width = Math.max(0, Math.min(100, Math.round(ratio * 100)))
  return (
    <div
      className="stats-bar"
      aria-hidden="true"
      style={{
        height: 10,
        marginTop: 6,
        borderRadius: 999,
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        overflow: 'hidden',
      }}
    >
      <div
        className="stats-bar__fill"
        // --accent(#7ec8ff)는 이 코드베이스에서 글자·테두리로만 쓰는 밝은 색이다.
        // 한 화면에 막대가 십수 개 깔리므로 채움에는 중립 경계색을 쓴다(밝은 면적 금지 규칙).
        style={{ width: `${width}%`, height: '100%', background: 'var(--border-strong)' }}
      />
    </div>
  )
}

export function StatsPage() {
  const [items, setItems] = useState<HistoryEntry[]>([])
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [period, setPeriod] = useState<Period>(30)
  // 막대는 어디까지나 보조라 끌 수 있어야 한다(색 시각화에는 반드시 리스트 뷰 토글을 붙인다).
  // 값은 항상 텍스트로 나오므로 막대는 장식이다. 저시력 우선이라 기본은 끄고 필요한 사람만 켠다.
  const [showBars, setShowBars] = useState(false)
  const { t, setLastSpeakText } = useApp()

  const reload = async () => {
    setLoadState('loading')
    try {
      setItems(await listHistory())
      setLoadState('ready')
    } catch {
      // DB 열기가 실패했는데 '기록 없음'으로 보이면 데이터가 사라진 것과 구분되지 않는다.
      setLoadState('error')
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  const stats = useMemo(() => computeStats(items, period), [items, period])

  /** 기간을 넓히면 볼 게 있는 상태인지 — '기록 없음'과 '이 기간만 없음'을 갈라 준다. */
  const hasAnyCards = useMemo(() => items.some((e) => (e.cards?.length ?? 0) > 0), [items])

  // 상단바 '읽어주기'가 이 화면에서도 뭔가를 읽도록 요약 문장을 등록한다.
  useEffect(() => {
    if (loadState !== 'ready') return
    const lines = [
      t('stats_title'),
      `${t('stats_total_readings')} ${t('stats_unit_readings', { n: stats.totalReadings })}`,
      `${t('stats_total_cards')} ${t('stats_unit_cards', { n: stats.totalCards })}`,
      `${t('stats_major')} ${stats.majorPct}%`,
      `${t('stats_reversed')} ${stats.reversedPct}%`,
    ]
    setLastSpeakText(lines.join('. '))
  }, [loadState, stats, t, setLastSpeakText])

  const topMax = stats.topCards[0]?.count ?? 0

  return (
    <main className="page">
      <h1>{t('stats_title')}</h1>
      <p className="muted">{t('stats_desc')}</p>

      <div className="btn-row" style={{ marginTop: 16 }}>
        <div className="segment" role="group" aria-label={t('stats_period')}>
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              // 선택 상태를 색(is-on)만으로 알리지 않도록 aria-pressed와 ✓ 글리프를 함께 쓴다.
              className={period === p ? 'is-on' : ''}
              aria-pressed={period === p}
              onClick={() => setPeriod(p)}
            >
              {t(PERIOD_KEY[p])}
            </button>
          ))}
        </div>
      </div>

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
      ) : stats.totalReadings === 0 ? (
        <div className="panel">
          <p>{hasAnyCards ? t('stats_empty_period') : t('stats_empty')}</p>
          <div className="btn-row">
            <Link className="btn" to="/history">
              {t('nav_history')}
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* 막대 토글은 수트·상위 카드·결과 세 패널을 한꺼번에 끈다.
              한 패널 안에 두면 다른 패널에서 이 컨트롤을 찾을 수 없어 화면 전체 컨트롤로 올린다. */}
          <div className="chip-row" style={{ marginTop: 16 }}>
            <button
              type="button"
              className={`chip${showBars ? ' is-on' : ''}`}
              aria-pressed={showBars}
              onClick={() => setShowBars((v) => !v)}
            >
              {t('stats_bars')}
            </button>
          </div>

          <div className="panel">
            <h2 style={{ marginTop: 0 }}>{t('stats_summary')}</h2>
            <dl className="pillar-list">
              <StatRow
                label={t('stats_total_readings')}
                value={t('stats_unit_readings', { n: stats.totalReadings })}
              />
              <StatRow
                label={t('stats_total_cards')}
                value={t('stats_unit_cards', { n: stats.totalCards })}
              />
              <StatRow
                label={t('stats_major')}
                value={t('stats_cards_pct', { n: stats.majorCount, pct: stats.majorPct })}
              />
              <StatRow
                label={t('stats_reversed')}
                value={t('stats_cards_pct', { n: stats.reversedCount, pct: stats.reversedPct })}
              />
            </dl>
          </div>

          <div className="panel">
            <h2 style={{ marginTop: 0 }}>{t('stats_suits')}</h2>
            {/* 막대를 끄면 완전한 텍스트 목록이 된다. 숫자는 막대와 무관하게 항상 보인다. */}
            <dl className="pillar-list">
              {SUIT_ORDER.map((suit) => {
                const n = stats.suitCounts[suit] ?? 0
                const p = stats.totalCards > 0 ? Math.round((n / stats.totalCards) * 100) : 0
                return (
                  <div key={suit} className="pillar-list__row">
                    <dt>{t(SUIT_KEY[suit])}</dt>
                    <dd style={{ flex: 1, minWidth: '10em' }}>
                      {t('stats_cards_pct', { n, pct: p })}
                      {showBars && <StatBar ratio={p / 100} />}
                    </dd>
                  </div>
                )
              })}
            </dl>
            <p className="muted" style={{ marginTop: 12 }}>
              {t('stats_major_note', { n: stats.majorCount })}
            </p>
          </div>

          <div className="panel">
            <h2 style={{ marginTop: 0 }}>{t('stats_top_cards')}</h2>
            <p className="muted">{t('stats_top_cards_desc')}</p>
            {/* 뽑은 카드가 한 덱(78장)에 못 미치면 '평균의 N배'가 수십 배로 튀어 오해를 준다.
                수치를 숨기는 대신 왜 흔들리는지 먼저 알린다. */}
            {stats.totalCards < DECK_SIZE && (
              <p className="warn-inline" style={{ marginBottom: 12 }}>
                {t('stats_low_sample', { n: DECK_SIZE })}
              </p>
            )}
            <ol className="stats-rank">
              {stats.topCards.map((c) => (
                <li key={c.cardId} className="stats-rank__row" style={{ marginTop: 12 }}>
                  <div className="stats-rank__name">
                    <strong>{cardLabel(c.cardId)}</strong>
                  </div>
                  <div className="stats-rank__meta">
                    {t('stats_times', { n: c.count })} · {t('stats_ratio', { ratio: c.ratio })}
                  </div>
                  {showBars && <StatBar ratio={topMax > 0 ? c.count / topMax : 0} />}
                </li>
              ))}
            </ol>
          </div>

          <div className="panel">
            <h2 style={{ marginTop: 0 }}>{t('stats_outcomes')}</h2>
            {stats.outcomes.recorded === 0 ? (
              <p>{t('stats_outcome_empty')}</p>
            ) : (
              <dl className="pillar-list">
                {OUTCOME_ROWS.map((row) => {
                  const n = stats.outcomes[row.id]
                  const p = Math.round((n / stats.outcomes.recorded) * 100)
                  return (
                    <div key={row.id} className="pillar-list__row">
                      <dt>{t(row.key)}</dt>
                      <dd style={{ flex: 1, minWidth: '10em' }}>
                        {t('stats_times_pct', { n, pct: p })}
                        {showBars && <StatBar ratio={p / 100} />}
                      </dd>
                    </div>
                  )
                })}
                <StatRow
                  label={t('stats_outcome_recorded')}
                  value={t('stats_recorded_of', {
                    n: stats.outcomes.recorded,
                    total: stats.totalReadings,
                  })}
                />
              </dl>
            )}
          </div>

          <div className="panel">
            <h2 style={{ marginTop: 0 }}>{t('stats_best_cards')}</h2>
            <p className="muted">{t('stats_best_desc')}</p>
            {stats.bestCards.length === 0 ? (
              <p>{t('stats_best_empty')}</p>
            ) : (
              <ol className="stats-rank">
                {stats.bestCards.map((c) => (
                  <li key={c.cardId} className="stats-rank__row" style={{ marginTop: 12 }}>
                    <div className="stats-rank__name">
                      <strong>{cardLabel(c.cardId)}</strong>
                    </div>
                    <div className="stats-rank__meta">
                      {t('stats_hit_rate', { pct: c.hitRate })} ·{' '}
                      {t('stats_samples', { n: c.samples })}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="btn-row">
            <Link className="btn" to="/history">
              {t('nav_history')}
            </Link>
          </div>
        </>
      )}
    </main>
  )
}
