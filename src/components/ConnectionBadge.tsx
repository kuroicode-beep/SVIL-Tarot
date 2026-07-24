export function ConnectionBadge({
  label,
  ok,
}: {
  label: string
  ok: boolean | null
}) {
  if (ok === null) {
    return (
      <span className="status-badge status-badge--warn" role="status">
        {label}: 확인 중
      </span>
    )
  }
  return (
    <span
      className={`status-badge ${ok ? 'status-badge--ok' : 'status-badge--bad'}`}
      role="status"
    >
      {label}: {ok ? '연결됨' : '끊김'}
    </span>
  )
}
