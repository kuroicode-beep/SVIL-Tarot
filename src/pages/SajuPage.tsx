import { useEffect, useState } from 'react'
import { CustomerPicker } from '../components/CustomerPicker'
import { ConnectionBadge } from '../components/ConnectionBadge'
import { buildSajuSummary } from '../lib/sajuName'
import { getCustomer, recordServiceConsultation, type Customer } from '../services/customers'
import { saveHistory } from '../services/history'
import { sajuReading } from '../services/ollama'
import { useApp } from '../context/AppContext'

export function SajuPage() {
  const { ollamaOk, speak, setLastSpeakText, t, setSaveMessage } = useApp()
  const [customerId, setCustomerId] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [gender, setGender] = useState('')
  const [calendarType, setCalendarType] = useState<'solar' | 'lunar'>('solar')
  const [focus, setFocus] = useState('종합')
  const [summary, setSummary] = useState('')
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
      setError('생년월일을 입력하세요.')
      return
    }
    setBusy(true)
    try {
      const s = buildSajuSummary({ birthDate, birthTime, gender, calendarType })
      setSummary(s.textBlock)
      const text = await sajuReading(s.textBlock, focus)
      setResult(text)
      setLastSpeakText(text)
      const hist = await saveHistory({
        kind: 'saju',
        title: `사주 · ${birthDate}`,
        aiText: text,
        customerId: customerId || undefined,
        meta: { focus, birthDate },
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
        setSaveMessage('상담 기록에 저장되었습니다.')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '사주 풀이 실패')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page">
      <h1>{t('home_saju')}</h1>
      <p className="muted">
        유사 앱(도사·운세닷컴)처럼 생년월일시·성별을 받아 원국 요약 후 AI 풀이를 제공합니다. 만세력은
        간이 계산입니다.
      </p>
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
            생년월일
            <input
              type="date"
              className="field"
              style={{ marginTop: 4 }}
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </label>
          <label>
            출생 시각
            <input
              type="time"
              className="field"
              style={{ marginTop: 4 }}
              value={birthTime}
              onChange={(e) => setBirthTime(e.target.value)}
            />
          </label>
          <label>
            성별
            <select
              className="field"
              style={{ marginTop: 4 }}
              value={gender}
              onChange={(e) => setGender(e.target.value)}
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
              value={calendarType}
              onChange={(e) => setCalendarType(e.target.value as 'solar' | 'lunar')}
            >
              <option value="solar">양력</option>
              <option value="lunar">음력(참고)</option>
            </select>
          </label>
        </div>
        <label className="label" htmlFor="focus" style={{ marginTop: 12 }}>
          상담 초점
        </label>
        <div className="chip-row">
          {['종합', '연애', '직업', '재물', '건강'].map((f) => (
            <button
              key={f}
              type="button"
              className={`chip${focus === f ? ' is-on' : ''}`}
              onClick={() => setFocus(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="btn-row">
          <button type="button" className="btn btn--primary" disabled={busy} onClick={() => void run()}>
            {busy ? '풀이 중…' : '사주 풀이 시작'}
          </button>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}
      {summary && (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>원국 요약 (간이)</h2>
          <pre className="ai-result" style={{ margin: 0 }}>
            {summary}
          </pre>
        </div>
      )}
      {result && (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>AI 사주 풀이</h2>
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
