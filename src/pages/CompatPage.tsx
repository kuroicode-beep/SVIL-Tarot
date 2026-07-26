import { useState } from 'react'
import { CustomerPicker } from '../components/CustomerPicker'
import { ConnectionBadge } from '../components/ConnectionBadge'
import { buildSajuSummary } from '../lib/sajuName'
import { recordServiceConsultation } from '../services/customers'
import { saveHistory } from '../services/history'
import { compatReading } from '../services/ollama'
import { useApp } from '../context/AppContext'
import { useCustomerQueryParam } from '../hooks/useCustomerQueryParam'

type Person = { label: string; birthDate: string; birthTime: string; gender: string }

const blank = (label: string): Person => ({
  label,
  birthDate: '',
  birthTime: '',
  gender: '',
})

export function CompatPage() {
  const { ollamaOk, speak, setLastSpeakText, t, setSaveMessage } = useApp()
  const [customerId, setCustomerId] = useCustomerQueryParam()
  const [relation, setRelation] = useState('연인')
  const [a, setA] = useState<Person>(blank('A'))
  const [b, setB] = useState<Person>(blank('B'))
  const [result, setResult] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    setError(null)
    if (!a.birthDate || !b.birthDate) {
      setError('두 사람의 생년월일을 모두 입력하세요.')
      return
    }
    setBusy(true)
    try {
      const sa = buildSajuSummary(a)
      const sb = buildSajuSummary(b)
      const text = await compatReading(sa.textBlock, sb.textBlock, relation)
      setResult(text)
      setLastSpeakText(text)
      const hist = await saveHistory({
        kind: 'compat',
        title: `궁합 · ${relation}`,
        aiText: text,
        customerId: customerId || undefined,
        meta: { relation, a: a.birthDate, b: b.birthDate },
      })
      if (customerId) {
        await recordServiceConsultation({
          customerId,
          serviceType: 'compat',
          title: `궁합 · ${relation}`,
          summary: `${a.birthDate} × ${b.birthDate} (${relation})`,
          detail: `${sa.textBlock}\n---\n${sb.textBlock}`,
          resultText: text,
          historyId: hist.id,
        })
        setSaveMessage('상담 기록에 저장되었습니다.')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '궁합 실패')
    } finally {
      setBusy(false)
    }
  }

  const personFields = (p: Person, set: (x: Person) => void) => (
    <div className="panel">
      <h3 style={{ marginTop: 0 }}>{p.label}</h3>
      <div className="btn-row">
        <label>
          생년월일
          <input
            type="date"
            className="field"
            style={{ marginTop: 4 }}
            value={p.birthDate}
            onChange={(e) => set({ ...p, birthDate: e.target.value })}
          />
        </label>
        <label>
          시각
          <input
            type="time"
            className="field"
            style={{ marginTop: 4 }}
            value={p.birthTime}
            onChange={(e) => set({ ...p, birthTime: e.target.value })}
          />
        </label>
        <label>
          성별
          <select
            className="field"
            style={{ marginTop: 4 }}
            value={p.gender}
            onChange={(e) => set({ ...p, gender: e.target.value })}
          >
            <option value="">미지정</option>
            <option value="female">여</option>
            <option value="male">남</option>
          </select>
        </label>
      </div>
    </div>
  )

  return (
    <main className="page">
      <h1>{t('home_compat')}</h1>
      <p className="muted">
        포스텔러·도사류 앱처럼 두 사람 생년월일을 비교해 관계 궁합을 AI로 해설합니다.
      </p>
      <div className="btn-row">
        <ConnectionBadge label="Ollama" ok={ollamaOk} />
      </div>
      <div className="panel">
        <CustomerPicker value={customerId} onChange={setCustomerId} />
        <div className="label" style={{ marginTop: 12 }}>
          관계 유형
        </div>
        <div className="chip-row">
          {['연인', '부부', '친구', '비즈니스', '가족'].map((r) => (
            <button
              key={r}
              type="button"
              className={`chip${relation === r ? ' is-on' : ''}`}
              onClick={() => setRelation(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="ai-layout">
        {personFields(a, setA)}
        {personFields(b, setB)}
      </div>
      <div className="btn-row">
        <button type="button" className="btn btn--primary" disabled={busy} onClick={() => void run()}>
          {busy ? '분석 중…' : '궁합 보기'}
        </button>
      </div>
      {error && <p className="error-text">{error}</p>}
      {result && (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>궁합 결과</h2>
          <div className="ai-result">{result}</div>
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
      )}
    </main>
  )
}
