import { useApp } from '../context/AppContext'

export function ConnectionBadge({
  label,
  ok,
}: {
  label: string
  ok: boolean | null
}) {
  const { t } = useApp()
  if (ok === null) {
    return (
      <span className="status-badge status-badge--warn" role="status">
        {label}: {t('status_checking')}
      </span>
    )
  }
  return (
    <span
      className={`status-badge ${ok ? 'status-badge--ok' : 'status-badge--bad'}`}
      role="status"
    >
      {label}: {ok ? t('status_ok') : t('status_bad')}
    </span>
  )
}
