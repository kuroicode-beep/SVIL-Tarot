import { useEffect, useState } from 'react'
import { CustomerPicker } from '../components/CustomerPicker'
import { ConnectionBadge } from '../components/ConnectionBadge'
import { buildSajuSummary, type SajuSummary } from '../lib/sajuName'
import { getCustomer, recordServiceConsultation, type Customer } from '../services/customers'
import { saveHistory } from '../services/history'
import { sajuReading } from '../services/ollama'
import { ReadingPlayer } from '../components/ReadingPlayer'
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
  // textBlock은 Ollama 프롬프트 페이로드라 한국어를 유지해야 한다(로케일에 따라 바뀌면 응답 품질이 흔들린다).
  // 그래서 화면에는 textBlock을 그대로 뿌리지 않고 구조화 필드를 t()로 렌더한다.
  const [summary, setSummary] = useState<SajuSummary | null>(null)
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
      setSummary(s)
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
        {/* 경고를 풀이 실행 후에야 보여 주면 이미 잘못된 값을 본 뒤다. 선택 즉시 알린다. */}
        {calendarType === 'lunar' && (
          <p className="warn-inline" role="note" style={{ marginTop: 12 }}>
            {t('saju_warn_lunar_not_converted')}
          </p>
        )}
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
          {/* 표는 저시력에 불리해서 '라벨 — 값' 정의 목록으로 세로 나열한다. 간지 자체는 도메인 표기라 번역하지 않는다. */}
          <dl className="pillar-list">
            {(
              [
                ['saju_pillar_year', summary.year.ganji, summary.year.element],
                ['saju_pillar_month', summary.month.ganji, ''],
                ['saju_pillar_day', summary.day.ganji, ''],
                [
                  'saju_pillar_hour',
                  summary.hour?.ganji ?? t('saju_pillar_none'),
                  summary.hour?.element ?? '',
                ],
              ] as [string, string, string][]
            ).map(([key, ganji, element]) => (
              <div key={key} className="pillar-list__row">
                <dt>{t(key)}</dt>
                <dd>
                  <span className="pillar-list__ganji">{ganji}</span>
                  {element && <span className="muted"> · {element}</span>}
                </dd>
              </div>
            ))}
          </dl>
          <p className="muted" style={{ marginTop: 12 }}>
            {t('saju_approx_note')}
          </p>
        </div>
      )}
      {result && (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>{t('saju_result')}</h2>
          <div className="ai-result">{result}</div>
          {/* 장문은 읽던 위치를 잃기 쉽다. 문장 단위 낭독으로 주시점을 고정한다. */}
          <ReadingPlayer text={result} />
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
