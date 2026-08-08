import { useEffect, useState } from 'react'
import { listCustomers, type Customer } from '../services/customers'
import { useApp } from '../context/AppContext'

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
  const { t } = useApp()

  useEffect(() => {
    void listCustomers().then(setCustomers)
  }, [])

  return (
    <div>
      <label className="label" htmlFor="customer-pick">
        {t('picker_label')}
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
        {allowEmpty && <option value="">{t('picker_none')}</option>}
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
          {t('picker_empty')}
        </p>
      )}
    </div>
  )
}
