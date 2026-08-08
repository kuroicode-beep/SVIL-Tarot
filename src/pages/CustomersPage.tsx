import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  deleteConsultation,
  deleteCustomer,
  getCustomer,
  listConsultations,
  listCustomers,
  saveCustomer,
  SERVICE_LABEL_KEYS,
  type Consultation,
  type Customer,
} from '../services/customers'
import { useApp } from '../context/AppContext'

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  gender: '' as Customer['gender'],
  birthDate: '',
  birthTime: '',
  calendarType: 'solar' as 'solar' | 'lunar',
  notes: '',
}

export function CustomersPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const { t, speak, setLastSpeakText } = useApp()
  const [list, setList] = useState<Customer[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState<Customer | null>(null)
  const [cons, setCons] = useState<Consultation[]>([])

  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')

  // DB 열기 실패와 '고객 없음'이 같은 화면으로 보이면 데이터 소실과 구분할 수 없다.
  const reload = async () => {
    setLoadState('loading')
    try {
      setList(await listCustomers())
      setLoadState('ready')
    } catch {
      setLoadState('error')
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  useEffect(() => {
    if (!id) {
      setDetail(null)
      setCons([])
      return
    }
    void (async () => {
      const c = await getCustomer(id)
      setDetail(c ?? null)
      setCons(c ? await listConsultations(c.id) : [])
    })()
  }, [id])

  const onSubmit = async () => {
    setError(null)
    try {
      await saveCustomer({ ...form, id: editingId ?? undefined })
      setForm(emptyForm)
      setEditingId(null)
      await reload()
    } catch (e) {
      // 서비스 계층은 로케일을 모르므로 sentinel만 던진다. 번역은 화면에서 한다.
      const code = e instanceof Error ? e.message : ''
      setError(code === 'CUSTOMER_NAME_REQUIRED' ? t('cust_name_required') : t('save_fail'))
    }
  }

  if (id && detail) {
    return (
      <main className="page">
        <h1>{detail.name}</h1>
        <p className="muted mono">
          {detail.birthDate || t('cust_no_birth')}
          {detail.birthTime ? ` ${detail.birthTime}` : ''} · {detail.phone || t('cust_no_phone')}
        </p>
        {detail.notes && <div className="panel">{detail.notes}</div>}
        <div className="btn-row">
          <Link className="btn" to={`/practice?customer=${detail.id}`}>
            {t('home_practice')}
          </Link>
          <Link className="btn" to={`/ai?customer=${detail.id}`}>
            {t('home_ai')}
          </Link>
          <Link className="btn" to={`/soul?customer=${detail.id}`}>
            {t('home_soul')}
          </Link>
          <Link className="btn" to={`/saju?customer=${detail.id}`}>
            {t('home_saju')}
          </Link>
          <Link className="btn" to={`/compat?customer=${detail.id}`}>
            {t('home_compat')}
          </Link>
          <Link className="btn" to={`/nameology?customer=${detail.id}`}>
            {t('home_nameology')}
          </Link>
          <Link className="btn" to={`/naming?customer=${detail.id}`}>
            {t('home_naming')}
          </Link>
          <button type="button" className="btn" onClick={() => nav('/customers')}>
            {t('list_label')}
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={async () => {
              if (!window.confirm(t('confirm_delete_customer'))) return
              await deleteCustomer(detail.id)
              nav('/customers')
            }}
          >
            {t('cust_delete')}
          </button>
        </div>

        <h2>{t('cust_cons_title')}</h2>
        {cons.length === 0 ? (
          <p className="muted">{t('cons_empty')}</p>
        ) : (
          <div className="list-choice">
            {cons.map((c) => (
              <div key={c.id} className="panel" style={{ marginTop: 0 }}>
                <div className="btn-row" style={{ justifyContent: 'space-between' }}>
                  <strong>
                    [{t(SERVICE_LABEL_KEYS[c.serviceType] ?? 'kind_other')}] {c.title}
                  </strong>
                  <span className="mono muted">{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <p>{c.summary}</p>
                {c.resultText && (
                  <details>
                    <summary>{t('cust_cons_full')}</summary>
                    <div className="ai-result">{c.resultText}</div>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        setLastSpeakText(c.resultText || '')
                        void speak(c.resultText || '')
                      }}
                    >
                      {t('nav_tts')}
                    </button>
                  </details>
                )}
                <button
                  type="button"
                  className="btn btn--danger"
                  onClick={async () => {
                    if (!window.confirm(t('confirm_delete_consultation'))) return
                    await deleteConsultation(c.id)
                    setCons(await listConsultations(detail.id))
                  }}
                >
                  {t('cons_delete')}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    )
  }

  return (
    <main className="page">
      <h1>{t('home_customers')}</h1>
      <p className="muted">{t('cust_desc')}</p>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>{editingId ? t('cust_form_edit') : t('cust_form_new')}</h2>
        <label className="label" htmlFor="cname">
          {t('cust_f_name')}
        </label>
        <input
          id="cname"
          className="field"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <div className="btn-row" style={{ marginTop: 12 }}>
          <label>
            {t('cust_f_phone')}
            <input
              className="field"
              style={{ marginTop: 4 }}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </label>
          <label>
            {t('cust_f_email')}
            <input
              className="field"
              style={{ marginTop: 4 }}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
        </div>
        <div className="btn-row" style={{ marginTop: 12 }}>
          <label>
            {t('cust_f_birth')}
            <input
              type="date"
              className="field"
              style={{ marginTop: 4 }}
              value={form.birthDate}
              onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
            />
          </label>
          <label>
            {t('cust_f_time')}
            <input
              type="time"
              className="field"
              style={{ marginTop: 4 }}
              value={form.birthTime}
              onChange={(e) => setForm({ ...form, birthTime: e.target.value })}
            />
          </label>
          <label>
            {t('cust_f_gender')}
            <select
              className="field"
              style={{ marginTop: 4 }}
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value as Customer['gender'] })}
            >
              <option value="">{t('cust_g_none')}</option>
              <option value="female">{t('cust_g_f')}</option>
              <option value="male">{t('cust_g_m')}</option>
              <option value="other">{t('kind_other')}</option>
            </select>
          </label>
          <label>
            {t('cust_f_cal')}
            <select
              className="field"
              style={{ marginTop: 4 }}
              value={form.calendarType}
              onChange={(e) =>
                setForm({ ...form, calendarType: e.target.value as 'solar' | 'lunar' })
              }
            >
              <option value="solar">{t('cust_cal_solar')}</option>
              <option value="lunar">{t('cust_cal_lunar')}</option>
            </select>
          </label>
        </div>
        <label className="label" htmlFor="cnotes" style={{ marginTop: 12 }}>
          {t('cust_f_notes')}
        </label>
        <textarea
          id="cnotes"
          className="field"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        {error && <p className="error-text" role="alert">{error}</p>}
        <div className="btn-row">
          <button type="button" className="btn btn--primary" onClick={() => void onSubmit()}>
            {editingId ? t('cust_save_edit') : t('cust_save_new')}
          </button>
          {editingId && (
            <button
              type="button"
              className="btn"
              onClick={() => {
                setEditingId(null)
                setForm(emptyForm)
              }}
            >
              {t('cust_cancel')}
            </button>
          )}
        </div>
      </div>

      <h2>{t('cust_list_title', { n: list.length })}</h2>
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
      ) : list.length === 0 ? (
        <p className="muted">{t('cust_empty')}</p>
      ) : (
        <div className="list-choice">
          {/* 버튼 안에 버튼을 중첩하면 '수정'이 키보드·스크린리더로 도달 불가능해진다(WCAG 2.1.1).
              컨테이너는 div로 두고 '상세'와 '수정'을 형제 컨트롤로 나눈다. */}
          {list.map((c) => (
            <div key={c.id} className="history-item">
              <Link
                to={`/customers/${c.id}`}
                className="history-item__main"
                aria-label={`${c.name} ${t('cust_open_detail')}`}
              >
                <strong>{c.name}</strong>
                <span className="muted">
                  {c.birthDate || t('cust_no_birth')} · {c.phone || t('cust_no_phone')}
                </span>
              </Link>
              <button
                type="button"
                className="btn"
                aria-label={`${c.name} ${t('cust_edit')}`}
                onClick={() => {
                  setEditingId(c.id)
                  setForm({
                    name: c.name,
                    phone: c.phone || '',
                    email: c.email || '',
                    gender: c.gender || '',
                    birthDate: c.birthDate || '',
                    birthTime: c.birthTime || '',
                    calendarType: c.calendarType || 'solar',
                    notes: c.notes || '',
                  })
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              >
                {t('cust_edit')}
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
