import { useEffect, useState } from 'react'
import { listCustomers, type Customer } from '../services/customers'

export function CustomerPicker({
  value,
  onChange,
  allowEmpty = true,
}: {
  value: string
  onChange: (id: string, customer?: Customer) => void
  allowEmpty?: boolean
}) {
  const [customers, setCustomers] = useState<Customer[]>([])

  useEffect(() => {
    void listCustomers().then(setCustomers)
  }, [])

  return (
    <div>
      <label className="label" htmlFor="customer-pick">
        고객 선택
      </label>
      <select
        id="customer-pick"
        className="field"
        value={value}
        onChange={(e) => {
          const id = e.target.value
          onChange(
            id,
            customers.find((c) => c.id === id),
          )
        }}
      >
        {allowEmpty && <option value="">(고객 미지정 — 상담 기록 안 함)</option>}
        {customers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {c.birthDate ? ` · ${c.birthDate}` : ''}
            {c.phone ? ` · ${c.phone}` : ''}
          </option>
        ))}
      </select>
      {customers.length === 0 && (
        <p className="muted" style={{ marginTop: 8 }}>
          등록된 고객이 없습니다. 고객 관리에서 먼저 추가하세요.
        </p>
      )}
    </div>
  )
}
