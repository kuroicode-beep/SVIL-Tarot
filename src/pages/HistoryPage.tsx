import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  deleteHistory,
  listHistory,
  type HistoryEntry,
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
}

export function HistoryPage() {
  const [items, setItems] = useState<HistoryEntry[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [open, setOpen] = useState<HistoryEntry | null>(null)
  const { speak, setLastSpeakText, t } = useApp()
  const kindLabel = (kind: string) => (kindKey[kind] ? t(kindKey[kind]) : kind)

  const reload = async () => {
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
        <div className="btn-row">
          <button type="button" className="btn" onClick={() => setOpen(null)}>
            {t('list_label')}
          </button>
          <button
            type="button"
            className="btn"
            onClick={async () => {
              await deleteHistory(open.id)
              setOpen(null)
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
      {items.length === 0 ? (
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
              onClick={() => setOpen(item)}
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
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </main>
  )
}
