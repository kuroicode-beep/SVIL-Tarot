import { useEffect, useState } from 'react'
import { CustomerPicker } from '../components/CustomerPicker'
import { ConnectionBadge } from '../components/ConnectionBadge'
import { buildSajuSummary } from '../lib/sajuName'
import { getCustomer, recordServiceConsultation, type Customer } from '../services/customers'
import { saveHistory } from '../services/history'
import { sajuReading } from '../services/ollama'
import { useApp } from '../context/AppContext'
import { useCustomerQueryParam } from '../hooks/useCustomerQueryParam'

/** 상담 초점도 화면 라벨이자 LLM 프롬프트 인자·meta 저장값이라 id와 라벨을 분리한다. */
const FOCUSES = [
  { id: 'all', key: 'cat_all', prompt: '종합' },
  { id: 'love', key: 'cat_love', prompt: '연애' },
  { id: 'job', key: 'cat_job', prompt: '직업' },
  { id: 'money', key: 'cat_money', prompt: '재물' },
  { id: 'health', key: 'cat_health', prompt: '건강' },
] as const

export function SajuPage() {
  const { ollamaOk, speak, setLastSpeakText, t, setSaveMessage } = useApp()
  const [customerId, setCustomerId] = useCustomerQueryParam()
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [gender, setGender] = useState('')
  const [calendarType, setCalendarType] = useState<'solar' | 'lunar'>('solar')
  const [focusId, setFocusId] = useState<(typeof FOCUSES)[number]['id']>('all')
  const [summary, setSummary] = useState('')
  // 계산 한계(음력 미환산·시주 미산출·입춘 경계 등)를 사용자에게 그대로 알린다.
  const [warnings, setWarnings] = useState<string[]>([])
  const [result, setResult] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!customerId) return
    void getCustomer(customerId).then((c) => {
      if (!c) return
      if (c.birthDate) setBirthDate(c.birthDate)
      if (c.birthTime) setBirthTime(c.birthTime)
      if (c.gender) setGender(c.gender)
      if (c.calendarType) setCalendarType(c.calendarType)
    })
  }, [customerId])

  const run = async () => {
    setError(null)
    if (!birthDate) {
      setError(t('saju_need_birth'))
      return
    }
    setBusy(true)
    const f = FOCUSES.find((x) => x.id === focusId) ?? FOCUSES[0]
    const focus = f.prompt
    try {
      const s = buildSajuSummary({ birthDate, birthTime, gender, calendarType })
      setSummary(s.textBlock)
      setWarnings(s.warnings ?? [])
      const text = await sajuReading(s.textBlock, focus)
      setResult(text)
      setLastSpeakText(text)
      const hist = await saveHistory({
        kind: 'saju',
        title: `사주 · ${birthDate}`,
        aiText: text,
        customerId: customerId || undefined,
        meta: { focus: f.id, birthDate },
      })
      if (customerId) {
        await recordServiceConsultation({
          customerId,
          serviceType: 'saju',
          title: `사주풀이 · ${focus}`,
          summary: `${birthDate} ${focus} 상담`,
          detail: s.textBlock,
          resultText: text,
          historyId: hist.id,
        })
        setSaveMessage(t('save_ok'))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('load_error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page">
      <h1>{t('home_saju')}</h1>
      <p className="muted">{t('saju_desc')}</p>
      <div className="btn-row">
        <ConnectionBadge label="Ollama" ok={ollamaOk} />
      </div>

      <div className="panel">
        <CustomerPicker
          value={customerId}
          onChange={(id, c?: Customer) => {
            setCustomerId(id)
            if (c?.birthDate) setBirthDate(c.birthDate)
          }}
        />
        <div className="btn-row" style={{ marginTop: 12 }}>
          <label>
            {t('cust_f_birth')}
            <input
              type="date"
              className="field"
              style={{ marginTop: 4 }}
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </label>
          <label>
            {t('cust_f_time')}
            <input
              type="time"
              className="field"
              style={{ marginTop: 4 }}
              value={birthTime}
              onChange={(e) => setBirthTime(e.target.value)}
            />
          </label>
          <label>
            {t('cust_f_gender')}
            <select
              className="field"
              style={{ marginTop: 4 }}
              value={gender}
              onChange={(e) => setGender(e.target.value)}
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
              value={calendarType}
              onChange={(e) => setCalendarType(e.target.value as 'solar' | 'lunar')}
            >
              <option value="solar">{t('cust_cal_solar')}</option>
              <option value="lunar">{t('cust_cal_lunar')}</option>
            </select>
          </label>
        </div>
        {/* htmlFor="focus"는 대응 id가 없는 고아 레이블이었다. 칩 묶음은 role=group으로 이름을 준다. */}
        <div className="label" style={{ marginTop: 12 }}>
          {t('saju_focus')}
        </div>
        <div className="chip-row" role="group" aria-label={t('saju_focus')}>
          {FOCUSES.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`chip${focusId === f.id ? ' is-on' : ''}`}
              aria-pressed={focusId === f.id}
              onClick={() => setFocusId(f.id)}
            >
              {t(f.key)}
            </button>
          ))}
        </div>
        <div className="btn-row">
          <button type="button" className="btn btn--primary" disabled={busy} onClick={() => void run()}>
            {busy ? t('saju_busy') : t('saju_run')}
          </button>
        </div>
      </div>

      {error && <p className="error-text" role="alert">{error}</p>}
      {warnings.length > 0 && (
        <div className="warn-panel" role="note" aria-label={t('saju_warn_title')}>
          <strong>{t('saju_warn_title')}</strong>
          <ul>
            {warnings.map((k) => (
              <li key={k}>{t(k)}</li>
            ))}
          </ul>
        </div>
      )}
      {summary && (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>{t('saju_summary')}</h2>
          <pre className="ai-result" style={{ margin: 0 }}>
            {summary}
          </pre>
        </div>
      )}
      {result && (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>{t('saju_result')}</h2>
          <div className="ai-result">{result}</div>
          <div className="btn-row">
            <button
              type="button"
              className="btn"
              onClick={() => {
                setLastSpeakText(result)
                void speak(result)
              }}
            >
              {t('nav_tts')}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
