import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  deleteHistory,
  listHistory,
  setOutcome,
  type HistoryEntry,
  type ReadingOutcome,
} from '../services/history'
import { getCustomer } from '../services/customers'
import { SpreadCards } from '../components/TarotCardView'
import { cardImageUrl } from '../lib/cards'
import { useApp } from '../context/AppContext'

const kindKey: Record<string, string> = {
  practice: 'kind_practice',
  ai: 'kind_ai',
  soul: 'kind_soul',
  learn: 'kind_learn',
  saju: 'kind_saju',
  compat: 'kind_compat',
  nameology: 'kind_nameology',
  naming: 'kind_naming',
  daily: 'daily_title',
}

/** 결과 라벨은 색이 아니라 문자열로 남긴다. 통계 집계와 화면 표시 모두 이 키를 쓴다. */
const outcomeKey: Record<ReadingOutcome, string> = {
  hit: 'outcome_hit',
  partial: 'outcome_partial',
  miss: 'outcome_miss',
}

/** 카드를 뽑는 리딩에만 사후 결과를 묻는다. 사주·작명은 예측 검증 대상이 아니다. */
const OUTCOME_KINDS = new Set(['practice', 'ai', 'soul', 'daily'])

export function HistoryPage() {
  const [items, setItems] = useState<HistoryEntry[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [open, setOpen] = useState<HistoryEntry | null>(null)
  const [outcomeNote, setOutcomeNote] = useState('')
  const [outcomeSaved, setOutcomeSaved] = useState(false)
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
  const { speak, setLastSpeakText, t } = useApp()
  const kindLabel = (kind: string) => (kindKey[kind] ? t(kindKey[kind]) : kind)

  const openEntry = (entry: HistoryEntry | null) => {
    setOpen(entry)
    setOutcomeNote(entry?.outcomeNote ?? '')
    setOutcomeSaved(false)
  }

  const applyOutcome = async (value: ReadingOutcome) => {
    if (!open) return
    const next = await setOutcome(open.id, value, outcomeNote)
    if (next) {
      setOpen(next)
      setOutcomeSaved(true)
      await reload()
    }
  }

  // DB 열기가 실패하면(다른 탭이 업그레이드를 막는 경우 등) 지금까지는 화면이 '기록 없음'으로 굳어
  // 데이터가 사라진 것과 구분되지 않았다. 로딩·오류·비어있음 세 가지를 따로 알린다.
  const reload = async () => {
    setLoadState('loading')
    try {
      const list = await listHistory()
      setItems(list)
      const map: Record<string, string> = {}
      await Promise.all(
        [...new Set(list.map((h) => h.customerId).filter(Boolean) as string[])].map(async (id) => {
          const c = await getCustomer(id)
          if (c) map[id] = c.name
        }),
      )
      setNames(map)
      setLoadState('ready')
    } catch {
      setLoadState('error')
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  if (open) {
    return (
      <main className="page">
        <h1>{open.title}</h1>
        <p className="mono muted">{new Date(open.createdAt).toLocaleString()}</p>
        <p>
          <span className="status-badge status-badge--warn">{kindLabel(open.kind)}</span>
          {open.customerId && names[open.customerId] && (
            <>
              {' '}
              <Link className="status-badge" to={`/customers/${open.customerId}`}>
                {names[open.customerId]}
              </Link>
            </>
          )}
        </p>
        {open.cards && open.cards.length > 0 && <SpreadCards cards={open.cards} />}
        {open.userNote && (
          <div className="panel">
            <h2 style={{ marginTop: 0 }}>{t('practice_note_label')}</h2>
            <p className="ai-result">{open.userNote}</p>
          </div>
        )}
        {open.aiText && (
          <div className="panel">
            <h2 style={{ marginTop: 0 }}>{t('hist_ai_note')}</h2>
            <div className="ai-result">{open.aiText}</div>
            <div className="btn-row">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setLastSpeakText(open.aiText ?? '')
                  void speak(open.aiText ?? '')
                }}
              >
                {t('nav_tts')}
              </button>
            </div>
          </div>
        )}
        {/* 예측만 쌓이고 결과가 없으면 실력이 늘었는지 확인할 방법이 없다.
            경쟁 앱 대부분이 저널·통계에서 멈추는 지점이라 이 앱의 차별점이 된다. */}
        {OUTCOME_KINDS.has(open.kind) && (
          <div className="panel">
            <h2 style={{ marginTop: 0 }}>{t('outcome_title')}</h2>
            <div className="chip-row" role="group" aria-label={t('outcome_title')}>
              {(['hit', 'partial', 'miss'] as ReadingOutcome[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`chip${open.outcome === v ? ' is-on' : ''}`}
                  aria-pressed={open.outcome === v}
                  onClick={() => void applyOutcome(v)}
                >
                  {t(outcomeKey[v])}
                </button>
              ))}
            </div>
            <label className="label" htmlFor="outcome-note" style={{ marginTop: 12 }}>
              {t('outcome_save')}
            </label>
            <textarea
              id="outcome-note"
              className="field"
              placeholder={t('outcome_note_ph')}
              value={outcomeNote}
              onChange={(e) => setOutcomeNote(e.target.value)}
            />
            <div className="btn-row">
              <button
                type="button"
                className="btn btn--primary"
                disabled={!open.outcome}
                onClick={() => void applyOutcome(open.outcome ?? 'partial')}
              >
                {t('outcome_save')}
              </button>
            </div>
            {outcomeSaved && (
              <p className="save-banner-ok" role="status">
                {t('outcome_saved')}
              </p>
            )}
          </div>
        )}
        <div className="btn-row">
          <button type="button" className="btn" onClick={() => openEntry(null)}>
            {t('list_label')}
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={async () => {
              if (!window.confirm(t('confirm_delete_history'))) return
              await deleteHistory(open.id)
              openEntry(null)
              await reload()
            }}
          >
            {t('delete_label')}
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="page">
      <h1>{t('nav_history')}</h1>
      <p className="muted">{t('hist_desc')}</p>
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
      ) : items.length === 0 ? (
        <div className="panel">
          <p>{t('hist_empty')}</p>
        </div>
      ) : (
        <div className="list-choice" style={{ marginTop: 16 }}>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="history-item"
              onClick={() => openEntry(item)}
            >
              <div className="history-thumbs">
                {(item.cards ?? []).slice(0, 3).map((c) => (
                  <img
                    key={c.id + String(c.isReversed)}
                    src={cardImageUrl(c.id)}
                    alt=""
                    style={c.isReversed ? { transform: 'rotate(180deg)' } : undefined}
                  />
                ))}
              </div>
              <div>
                <div>
                  <strong>{item.title}</strong>
                </div>
                <div className="muted">
                  {kindLabel(item.kind)}
                  {item.customerId && names[item.customerId]
                    ? ` · ${names[item.customerId]}`
                    : ''}{' '}
                  · <span className="mono">{new Date(item.createdAt).toLocaleString()}</span>
                  {OUTCOME_KINDS.has(item.kind) && (
                    <> · {item.outcome ? t(outcomeKey[item.outcome]) : t('outcome_none')}</>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </main>
  )
}
