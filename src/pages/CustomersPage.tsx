import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  deleteConsultation,
  deleteCustomer,
  getCustomer,
  listConsultations,
  listCustomers,
  saveCustomer,
  SERVICE_LABELS,
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

  const reload = async () => setList(await listCustomers())

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
      setError(e instanceof Error ? e.message : '저장 실패')
    }
  }

  if (id && detail) {
    return (
      <main className="page">
        <h1>{detail.name}</h1>
        <p className="muted mono">
          {detail.birthDate || '생년월일 미등록'}
          {detail.birthTime ? ` ${detail.birthTime}` : ''} · {detail.phone || '연락처 없음'}
        </p>
        {detail.notes && <div className="panel">{detail.notes}</div>}
        <div className="btn-row">
          <Link className="btn" to="/saju">
            사주
          </Link>
          <Link className="btn" to="/compat">
            궁합
          </Link>
          <Link className="btn" to="/nameology">
            성명학
          </Link>
          <Link className="btn" to="/naming">
            작명
          </Link>
          <button type="button" className="btn" onClick={() => nav('/customers')}>
            목록
          </button>
          <button
            type="button"
            className="btn"
            style={{ borderColor: 'var(--negative)', color: 'var(--negative)' }}
            onClick={async () => {
              if (!window.confirm('고객과 상담 기록을 모두 삭제할까요?')) return
              await deleteCustomer(detail.id)
              nav('/customers')
            }}
          >
            고객 삭제
          </button>
        </div>

        <h2>상담 이력</h2>
        {cons.length === 0 ? (
          <p className="muted">아직 상담 기록이 없습니다. 서비스를 이용하면 자동으로 쌓입니다.</p>
        ) : (
          <div className="list-choice">
            {cons.map((c) => (
              <div key={c.id} className="panel" style={{ marginTop: 0 }}>
                <div className="btn-row" style={{ justifyContent: 'space-between' }}>
                  <strong>
                    [{SERVICE_LABELS[c.serviceType]}] {c.title}
                  </strong>
                  <span className="mono muted">{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <p>{c.summary}</p>
                {c.resultText && (
                  <details>
                    <summary>상담 내용 전문</summary>
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
                  className="btn"
                  onClick={async () => {
                    await deleteConsultation(c.id)
                    setCons(await listConsultations(detail.id))
                  }}
                >
                  이 기록 삭제
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
      <p className="muted">고객 정보와 서비스·상담 내용을 한곳에서 관리합니다.</p>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>{editingId ? '고객 수정' : '고객 등록'}</h2>
        <label className="label" htmlFor="cname">
          이름 *
        </label>
        <input
          id="cname"
          className="field"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <div className="btn-row" style={{ marginTop: 12 }}>
          <label>
            전화
            <input
              className="field"
              style={{ marginTop: 4 }}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </label>
          <label>
            이메일
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
            생년월일
            <input
              type="date"
              className="field"
              style={{ marginTop: 4 }}
              value={form.birthDate}
              onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
            />
          </label>
          <label>
            출생 시각
            <input
              type="time"
              className="field"
              style={{ marginTop: 4 }}
              value={form.birthTime}
              onChange={(e) => setForm({ ...form, birthTime: e.target.value })}
            />
          </label>
          <label>
            성별
            <select
              className="field"
              style={{ marginTop: 4 }}
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value as Customer['gender'] })}
            >
              <option value="">미지정</option>
              <option value="female">여</option>
              <option value="male">남</option>
              <option value="other">기타</option>
            </select>
          </label>
          <label>
            달력
            <select
              className="field"
              style={{ marginTop: 4 }}
              value={form.calendarType}
              onChange={(e) =>
                setForm({ ...form, calendarType: e.target.value as 'solar' | 'lunar' })
              }
            >
              <option value="solar">양력</option>
              <option value="lunar">음력(참고)</option>
            </select>
          </label>
        </div>
        <label className="label" htmlFor="cnotes" style={{ marginTop: 12 }}>
          메모
        </label>
        <textarea
          id="cnotes"
          className="field"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        {error && <p className="error-text">{error}</p>}
        <div className="btn-row">
          <button type="button" className="btn btn--primary" onClick={() => void onSubmit()}>
            {editingId ? '수정 저장' : '등록'}
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
              취소
            </button>
          )}
        </div>
      </div>

      <h2>고객 목록 ({list.length})</h2>
      {list.length === 0 ? (
        <p className="muted">등록된 고객이 없습니다.</p>
      ) : (
        <div className="list-choice">
          {list.map((c) => (
            <button
              key={c.id}
              type="button"
              className="history-item"
              onClick={() => nav(`/customers/${c.id}`)}
            >
              <div>
                <strong>{c.name}</strong>
                <div className="muted">
                  {c.birthDate || '생일 미등록'} · {c.phone || '전화 없음'}
                </div>
              </div>
              <span
                className="btn"
                role="presentation"
                onClick={(e) => {
                  e.stopPropagation()
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
                수정
              </span>
            </button>
          ))}
        </div>
      )}
    </main>
  )
}
