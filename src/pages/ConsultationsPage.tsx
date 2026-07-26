import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  deleteConsultation,
  getCustomer,
  listConsultations,
  SERVICE_LABELS,
  type Consultation,
} from '../services/customers'
import { useApp } from '../context/AppContext'

export function ConsultationsPage() {
  const { t } = useApp()
  const [items, setItems] = useState<Consultation[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState<string>('all')
  const [open, setOpen] = useState<Consultation | null>(null)

  const reload = async () => {
    const list = await listConsultations()
    setItems(list)
    const map: Record<string, string> = {}
    await Promise.all(
      [...new Set(list.map((c) => c.customerId))].map(async (id) => {
        const c = await getCustomer(id)
        map[id] = c?.name ?? t('cons_unknown_customer')
      }),
    )
    setNames(map)
  }

  useEffect(() => {
    void reload()
  }, [])

  const filtered =
    filter === 'all' ? items : items.filter((c) => c.serviceType === filter)

  if (open) {
    return (
      <main className="page">
        <h1>{open.title}</h1>
        <p className="muted">
          [{SERVICE_LABELS[open.serviceType]}] · {names[open.customerId] ?? open.customerId} ·{' '}
          <span className="mono">{new Date(open.createdAt).toLocaleString()}</span>
        </p>
        {open.summary && <div className="panel">{open.summary}</div>}
        {open.resultText && (
          <div className="panel">
            <div className="ai-result">{open.resultText}</div>
          </div>
        )}
        <div className="btn-row">
          <Link className="btn" to={`/customers/${open.customerId}`}>
            {t('cons_goto_customer')}
          </Link>
          <button type="button" className="btn" onClick={() => setOpen(null)}>
            {t('list_label')}
          </button>
          <button
            type="button"
            className="btn"
            onClick={async () => {
              await deleteConsultation(open.id)
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
      <h1>{t('home_consultations')}</h1>
      <p className="muted">{t('cons_desc')}</p>
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
        {Object.entries(SERVICE_LABELS).map(([k, label]) => (
          <option key={k} value={k}>
            {label}
          </option>
        ))}
      </select>

      {filtered.length === 0 ? (
        <div className="panel" style={{ marginTop: 16 }}>
          <p>{t('cons_empty')}</p>
        </div>
      ) : (
        <div className="list-choice" style={{ marginTop: 16 }}>
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              className="history-item"
              onClick={() => setOpen(c)}
            >
              <div>
                <div>
                  <strong>
                    [{SERVICE_LABELS[c.serviceType]}] {c.title}
                  </strong>
                </div>
                <div className="muted">
                  {names[c.customerId] ?? c.customerId} ·{' '}
                  <span className="mono">{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                {c.summary && <div className="muted">{c.summary.slice(0, 80)}</div>}
              </div>
            </button>
          ))}
        </div>
      )}
    </main>
  )
}
