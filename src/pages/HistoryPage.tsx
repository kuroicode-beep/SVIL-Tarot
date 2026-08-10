// src/pages/HistoryPage.tsx — 저장된 리딩 목록·상세. 사후 결과 기록과 문서 내보내기를 여기서 한다.
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
import { cardImageUrl, hasCard } from '../lib/cards'
import {
  downloadMarkdown,
  POPUP_BLOCKED,
  printReading,
  readingFilename,
  readingToMarkdown,
  type ExportLabels,
  type ExportOptions,
} from '../services/exportReading'
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
  const [exportMsg, setExportMsg] = useState<string | null>(null)
  const [exportErr, setExportErr] = useState<string | null>(null)
  const { speak, setLastSpeakText, t, settings } = useApp()
  const kindLabel = (kind: string) => (kindKey[kind] ? t(kindKey[kind]) : kind)

  // 문서 라벨은 서비스가 아니라 화면에서 만든다(서비스 계층은 로케일을 모른다).
  const exportOptions = (entry: HistoryEntry): ExportOptions => {
    const labels: Partial<ExportLabels> = {
      date: t('export_label_date'),
      customer: t('export_label_customer'),
      kind: t('export_label_kind'),
      cards: t('export_label_cards'),
      meaning: t('export_label_meaning'),
      upright: t('export_label_upright'),
      reversed: t('export_label_reversed'),
      note: t('export_label_note'),
      aiReading: t('export_label_ai'),
      outcome: t('export_label_outcome'),
      outcomeNote: t('export_label_outcome_note'),
      outcomeValues: {
        hit: t('outcome_hit'),
        partial: t('outcome_partial'),
        miss: t('outcome_miss'),
      },
    }
    return {
      customerName: entry.customerId ? names[entry.customerId] : undefined,
      kindLabel: kindLabel(entry.kind),
      locale: settings.locale,
      labels,
    }
  }

  /**
   * 같은 문자열을 다시 넣으면 DOM이 안 바뀌어 aria-live가 아무것도 알리지 않는다.
   * 두 번째 내보내기부터 조용해지므로, 한 번 비운 뒤 다시 넣어 내용 변화를 만든다.
   */
  const announceExport = (text: string) => {
    setExportMsg(null)
    window.setTimeout(() => setExportMsg(text), 60)
  }

  const onExportMd = (entry: HistoryEntry) => {
    setExportErr(null)
    try {
      downloadMarkdown(readingToMarkdown(entry, exportOptions(entry)), readingFilename(entry))
      announceExport(t('export_done'))
    } catch {
      setExportMsg(null)
      setExportErr(t('save_fail'))
    }
  }

  const onPrint = (entry: HistoryEntry) => {
    setExportMsg(null)
    setExportErr(null)
    try {
      printReading(entry, {
        ...exportOptions(entry),
        title: entry.title,
        // 인쇄 문서의 lang이 없으면 스크린리더가 화면과 다른 발음으로 읽는다.
        lang: settings.locale,
      })
    } catch (e) {
      // 팝업 차단은 사용자가 직접 풀어야 하는 상황이라 원인을 그대로 알린다.
      setExportErr(e instanceof Error && e.message === POPUP_BLOCKED ? t('export_popup_blocked') : t('save_fail'))
    }
  }

  const openEntry = (entry: HistoryEntry | null) => {
    setOpen(entry)
    setOutcomeNote(entry?.outcomeNote ?? '')
    setOutcomeSaved(false)
    // 앞 리딩에서 띄운 '저장했습니다'가 남아 있으면 이 리딩도 내보낸 줄 착각한다.
    setExportMsg(null)
    setExportErr(null)
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
        {/* 상담사가 고객에게 건넬 문서. 서버 없이 브라우저의 내려받기·인쇄만 쓴다. */}
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>{t('export_title')}</h2>
          <p className="muted">{t('export_desc')}</p>
          <div className="btn-row">
            <button type="button" className="btn btn--primary" onClick={() => onExportMd(open)}>
              {t('export_md')}
            </button>
            <button type="button" className="btn" onClick={() => onPrint(open)}>
              {t('export_print')}
            </button>
          </div>
          {exportMsg && (
            <p className="feedback-ok" role="status">
              {exportMsg}
            </p>
          )}
          {exportErr && (
            <p className="error-text" role="alert">
              {exportErr}
            </p>
          )}
        </div>
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
              {/* cardImageUrl은 미등록 id에 throw한다. 옛 기록에 남은 카드 하나로
                  목록 전체가 오류 화면이 되지 않도록 그릴 수 있는 것만 남긴다. */}
              <div className="history-thumbs">
                {(item.cards ?? [])
                  .filter((c) => hasCard(c.id))
                  .slice(0, 3)
                  .map((c) => (
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
