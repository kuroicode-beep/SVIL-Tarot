// src/pages/ConsultationsPage.tsx — 상담 목록 + 대기열(상태·마감일·AI 상담노트) 화면
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  deleteConsultation,
  getCustomer,
  listConsultations,
  SERVICE_LABEL_KEYS,
} from '../services/customers'
import {
  CONSULT_STATUSES,
  dueStateOf,
  generateAiNote,
  queueCounts,
  QUEUE_ERR,
  setDueAt,
  setStatus,
  statusOf,
  STATUS_LABEL_KEYS,
  type ConsultationStatus,
  type DueState,
  type QueueCounts,
  type QueuedConsultation,
} from '../services/consultQueue'
import { useApp } from '../context/AppContext'

type StatusFilter = 'all' | ConsultationStatus
type DueBadgeState = Exclude<DueState, 'none'>

/** 점 색은 보조 신호다. 판정은 항상 옆의 텍스트 라벨이 한다(색만으로 구분 금지). */
const STATUS_BADGE_CLASS: Record<ConsultationStatus, string> = {
  todo: 'status-badge',
  doing: 'status-badge status-badge--warn',
  done: 'status-badge status-badge--ok',
}

const DUE_BADGE_CLASS: Record<DueBadgeState, string> = {
  overdue: 'status-badge status-badge--bad',
  today: 'status-badge status-badge--warn',
  upcoming: 'status-badge',
}

const DUE_LABEL_KEYS: Record<DueBadgeState, string> = {
  overdue: 'queue_due_overdue',
  today: 'queue_due_today',
  upcoming: 'queue_due_on',
}

const EMPTY_COUNTS: QueueCounts = { overdue: 0, today: 0, todo: 0, doing: 0 }

/** 상태·마감 배지 한 쌍. 목록 행과 상세에서 같은 모양으로 재사용한다. */
function QueueBadges({ item, t }: { item: QueuedConsultation; t: (k: string) => string }) {
  const status = statusOf(item)
  const due = dueStateOf(item)
  return (
    <div className="chip-row" style={{ marginTop: 4 }}>
      <span className={STATUS_BADGE_CLASS[status]}>{t(STATUS_LABEL_KEYS[status])}</span>
      {due !== 'none' && (
        <span className={DUE_BADGE_CLASS[due]}>
          {t(DUE_LABEL_KEYS[due])} <span className="mono">{item.dueAt}</span>
        </span>
      )}
    </div>
  )
}

export function ConsultationsPage() {
  const { t } = useApp()
  const [items, setItems] = useState<QueuedConsultation[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [counts, setCounts] = useState<QueueCounts>(EMPTY_COUNTS)
  const [filter, setFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  // 상세를 객체로 들고 있으면 상태·마감을 저장한 뒤에도 옛 값이 화면에 남는다. id만 들고 items에서 파생시킨다.
  const [openId, setOpenId] = useState<string | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [dueDraft, setDueDraft] = useState('')
  // 진행·오류 상태를 boolean으로 들면, 생성 중에 다른 상담을 열었을 때 A의 '생성 중'과
  // A의 오류 문구가 B 아래에 붙는다(비동기 완료가 화면 전환보다 늦게 도착). 대상 id와 함께 들고 화면에서 대조한다.
  const [saveErrorId, setSaveErrorId] = useState<string | null>(null)
  const [noteBusyId, setNoteBusyId] = useState<string | null>(null)
  const [noteError, setNoteError] = useState<{ id: string; key: string } | null>(null)

  // DB 열기 실패와 '기록 없음'이 같은 화면으로 보이면 데이터 소실과 구분할 수 없다.
  const reload = async () => {
    setLoadState('loading')
    try {
      const list = (await listConsultations()) as QueuedConsultation[]
      setItems(list)
      setCounts(await queueCounts())
      const map: Record<string, string> = {}
      await Promise.all(
        [...new Set(list.map((c) => c.customerId))].map(async (id) => {
          const c = await getCustomer(id)
          map[id] = c?.name ?? t('cons_unknown_customer')
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

  const open = useMemo(() => items.find((c) => c.id === openId) ?? null, [items, openId])
  const openDueAt = open?.dueAt ?? ''

  // 다른 상담을 열거나 저장된 마감이 바뀌면 입력칸을 저장값에 다시 맞춘다.
  useEffect(() => {
    setDueDraft(openDueAt)
  }, [openId, openDueAt])

  /** 대기열 쓰기 공통 처리 — 저장 후 목록·집계를 함께 새로 읽어야 배지와 요약이 어긋나지 않는다. */
  const runQueueAction = async (id: string, fn: () => Promise<void>) => {
    setSaveErrorId(null)
    try {
      await fn()
      await reload()
    } catch {
      setSaveErrorId(id)
    }
  }

  const onGenerateNote = async () => {
    // 로컬 12B는 한 번에 한 건만 돌린다. 대상 id를 여기서 고정해야 도중에 다른 상담을 열어도 엉뚱한 곳에 쓰지 않는다.
    if (!open || noteBusyId) return
    const id = open.id
    setNoteBusyId(id)
    setNoteError(null)
    try {
      await generateAiNote(id)
      await reload()
    } catch (e) {
      // 서비스는 sentinel만 던진다. 어떤 안내 문구를 쓸지는 화면이 고른다.
      const code = e instanceof Error ? e.message : ''
      const key = code === QUEUE_ERR.noSource ? 'queue_ai_error_empty' : 'queue_ai_error'
      setNoteError({ id, key })
    } finally {
      setNoteBusyId(null)
    }
  }

  const filtered = useMemo(
    () =>
      items.filter(
        (c) =>
          (filter === 'all' || c.serviceType === filter) &&
          (statusFilter === 'all' || statusOf(c) === statusFilter),
      ),
    [items, filter, statusFilter],
  )

  if (open) {
    const current = statusOf(open)
    // 진행·오류 표시는 '이 상담 것'일 때만 켠다. 다른 상담이 생성 중이면 눌러도 막히므로 그 사실을 버튼에 드러낸다.
    const noteBusy = noteBusyId === open.id
    const otherNoteBusy = noteBusyId !== null && !noteBusy
    const noteErrorKey = noteError && noteError.id === open.id ? noteError.key : ''
    const saveError = saveErrorId === open.id
    return (
      <main className="page">
        <h1>{open.title}</h1>
        <p className="muted">
          [{t(SERVICE_LABEL_KEYS[open.serviceType] ?? 'kind_other')}] ·{' '}
          {names[open.customerId] ?? open.customerId} ·{' '}
          <span className="mono">{new Date(open.createdAt).toLocaleString()}</span>
        </p>
        <QueueBadges item={open} t={t} />
        {open.summary && <div className="panel">{open.summary}</div>}
        {open.resultText && (
          <div className="panel">
            <div className="ai-result">{open.resultText}</div>
          </div>
        )}

        <div className="panel">
          <h2 style={{ marginTop: 0 }}>{t('queue_status_label')}</h2>
          {/* 선택 상태를 색(is-on)만으로 알리지 않도록 aria-pressed와 ✓ 글리프를 함께 쓴다. */}
          <div className="segment" role="group" aria-label={t('queue_status_label')}>
            {CONSULT_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                className={current === s ? 'is-on' : ''}
                aria-pressed={current === s}
                onClick={() => void runQueueAction(open.id, () => setStatus(open.id, s))}
              >
                {t(STATUS_LABEL_KEYS[s])}
              </button>
            ))}
          </div>

          <label className="label" htmlFor="cons-due" style={{ marginTop: 16 }}>
            {t('queue_due_label')}
          </label>
          <input
            id="cons-due"
            type="date"
            className="field"
            style={{ maxWidth: 280 }}
            value={dueDraft}
            onChange={(e) => {
              const v = e.target.value
              setDueDraft(v)
              void runQueueAction(open.id, () => setDueAt(open.id, v || undefined))
            }}
          />
          {dueDraft ? (
            <div className="btn-row">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setDueDraft('')
                  void runQueueAction(open.id, () => setDueAt(open.id, undefined))
                }}
              >
                {t('queue_due_clear')}
              </button>
            </div>
          ) : (
            <p className="muted" style={{ marginTop: 8 }}>
              {t('queue_due_none')}
            </p>
          )}
          {saveError && (
            <p className="error-text" role="alert">
              {t('queue_save_error')}
            </p>
          )}
        </div>

        <div className="panel">
          <h2 style={{ marginTop: 0 }}>{t('queue_ai_note')}</h2>
          <p className="muted">{t('queue_ai_note_desc')}</p>
          {open.aiNote ? (
            <div className="ai-result">{open.aiNote}</div>
          ) : (
            <p>{t('queue_ai_empty')}</p>
          )}
          {noteBusy && (
            <p className="muted" role="status">
              {t('queue_ai_busy')}
            </p>
          )}
          {noteErrorKey && (
            <p className="error-text" role="alert">
              {t(noteErrorKey)}
            </p>
          )}
          <div className="btn-row">
            {/* disabled를 걸면 진행 중에 포커스가 body로 떨어진다. aria-busy·aria-disabled로 알리고 핸들러에서 막는다. */}
            <button
              type="button"
              className="btn btn--primary"
              aria-busy={noteBusy}
              aria-disabled={otherNoteBusy || undefined}
              onClick={() => void onGenerateNote()}
            >
              {noteBusy
                ? t('queue_ai_busy')
                : open.aiNote
                  ? t('queue_ai_regenerate')
                  : t('queue_ai_generate')}
            </button>
          </div>
        </div>

        <div className="btn-row">
          <Link className="btn" to={`/customers/${open.customerId}`}>
            {t('cons_goto_customer')}
          </Link>
          <button type="button" className="btn" onClick={() => setOpenId(null)}>
            {t('list_label')}
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={async () => {
              if (!window.confirm(t('confirm_delete_consultation'))) return
              await deleteConsultation(open.id)
              setOpenId(null)
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
      <h1>{t('home_consultations')}</h1>
      <p className="muted">{t('cons_desc')}</p>

      {loadState === 'ready' && (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>{t('queue_summary_title')}</h2>
          {/* 숫자만으로는 무슨 수치인지 알 수 없다. 라벨-값 정의 목록이라 스크린리더에서도 짝이 유지된다. */}
          <dl className="pillar-list">
            <div className="pillar-list__row">
              <dt>{t('queue_overdue')}</dt>
              <dd>{t('queue_count_unit', { n: counts.overdue })}</dd>
            </div>
            <div className="pillar-list__row">
              <dt>{t('queue_today')}</dt>
              <dd>{t('queue_count_unit', { n: counts.today })}</dd>
            </div>
            <div className="pillar-list__row">
              <dt>{t('queue_todo')}</dt>
              <dd>{t('queue_count_unit', { n: counts.todo })}</dd>
            </div>
            <div className="pillar-list__row">
              <dt>{t('queue_doing')}</dt>
              <dd>{t('queue_count_unit', { n: counts.doing })}</dd>
            </div>
          </dl>
        </div>
      )}

      <label className="label" htmlFor="cons-filter">
        {t('cons_filter')}
      </label>
      <select
        id="cons-filter"
        className="field"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        style={{ maxWidth: 280 }}
      >
        <option value="all">{t('cons_filter_all')}</option>
        {Object.entries(SERVICE_LABEL_KEYS).map(([k, labelKey]) => (
          <option key={k} value={k}>
            {t(labelKey)}
          </option>
        ))}
      </select>

      <p className="label" style={{ marginTop: 16 }}>
        {t('queue_status_filter')}
      </p>
      <div className="chip-row" role="group" aria-label={t('queue_status_filter')}>
        <button
          type="button"
          className={`chip${statusFilter === 'all' ? ' is-on' : ''}`}
          aria-pressed={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
        >
          {t('cons_filter_all')}
        </button>
        {CONSULT_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            className={`chip${statusFilter === s ? ' is-on' : ''}`}
            aria-pressed={statusFilter === s}
            onClick={() => setStatusFilter(s)}
          >
            {t(STATUS_LABEL_KEYS[s])}
          </button>
        ))}
      </div>

      {loadState === 'loading' ? (
        <p className="muted" role="status" style={{ marginTop: 16 }}>
          {t('loading')}
        </p>
      ) : loadState === 'error' ? (
        <div className="panel" style={{ marginTop: 16 }}>
          <p className="error-text" role="alert">
            {t('load_error')}
          </p>
          <button type="button" className="btn btn--primary" onClick={() => void reload()}>
            {t('retry')}
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="panel" style={{ marginTop: 16 }}>
          {/* 기록이 아예 없는 것과 필터에 안 걸린 것은 다른 상황이다. 안내도 갈라 준다. */}
          <p>{items.length === 0 ? t('cons_empty') : t('queue_empty_filter')}</p>
        </div>
      ) : (
        <div className="list-choice" style={{ marginTop: 16 }}>
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              className="history-item"
              onClick={() => setOpenId(c.id)}
            >
              <div className="history-item__main">
                <div>
                  <strong>
                    [{t(SERVICE_LABEL_KEYS[c.serviceType] ?? 'kind_other')}] {c.title}
                  </strong>
                </div>
                <div className="muted">
                  {names[c.customerId] ?? c.customerId} ·{' '}
                  <span className="mono">{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                {c.summary && <div className="muted">{c.summary.slice(0, 80)}</div>}
                <QueueBadges item={c} t={t} />
              </div>
            </button>
          ))}
        </div>
      )}
    </main>
  )
}
