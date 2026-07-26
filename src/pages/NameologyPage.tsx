import { useState } from 'react'
import { CustomerPicker } from '../components/CustomerPicker'
import { ConnectionBadge } from '../components/ConnectionBadge'
import { estimateHangulStrokes } from '../lib/sajuName'
import { recordServiceConsultation } from '../services/customers'
import { saveHistory } from '../services/history'
import { nameologyReading } from '../services/ollama'
import { useApp } from '../context/AppContext'
import { useCustomerQueryParam } from '../hooks/useCustomerQueryParam'

export function NameologyPage() {
  const { ollamaOk, speak, setLastSpeakText, t, setSaveMessage } = useApp()
  const [customerId, setCustomerId] = useCustomerQueryParam()
  const [fullName, setFullName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [strokeText, setStrokeText] = useState('')
  const [result, setResult] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    setError(null)
    const name = fullName.trim()
    if (!name) {
      setError('이름을 입력하세요.')
      return
    }
    setBusy(true)
    try {
      const est = estimateHangulStrokes(name)
      const stroke = [
        `총획(한글 근사): ${est.total}`,
        `글자별: ${est.perChar.map((p) => `${p.char}=${p.strokes}`).join(', ')}`,
        `오행 힌트(총획 기준): ${est.elementHint}`,
      ].join('\n')
      setStrokeText(stroke)
      const text = await nameologyReading(name, stroke, birthDate)
      setResult(text)
      setLastSpeakText(text)
      const hist = await saveHistory({
        kind: 'nameology',
        title: `성명학 · ${name}`,
        aiText: text,
        customerId: customerId || undefined,
        meta: { name, total: est.total },
      })
      if (customerId) {
        await recordServiceConsultation({
          customerId,
          serviceType: 'nameology',
          title: `성명학 · ${name}`,
          summary: `${name} 풀이 (총획 ${est.total})`,
          detail: stroke,
          resultText: text,
          historyId: hist.id,
        })
        setSaveMessage('상담 기록에 저장되었습니다.')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '성명학 실패')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page">
      <h1>{t('home_nameology')}</h1>
      <p className="muted">
        좋은이름닷컴·작명왕류처럼 이름 획수·오행 힌트를 보고 AI로 성명 풀이를 제공합니다.
      </p>
      <div className="btn-row">
        <ConnectionBadge label="Ollama" ok={ollamaOk} />
      </div>
      <div className="panel">
        <CustomerPicker value={customerId} onChange={setCustomerId} />
        <label className="label" htmlFor="nm" style={{ marginTop: 12 }}>
          이름 (한글)
        </label>
        <input
          id="nm"
          className="field"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="예: 김서연"
        />
        <label className="label" htmlFor="bd" style={{ marginTop: 12 }}>
          생년월일 (선택)
        </label>
        <input
          id="bd"
          type="date"
          className="field"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
        />
        <div className="btn-row">
          <button type="button" className="btn btn--primary" disabled={busy} onClick={() => void run()}>
            {busy ? '분석 중…' : '성명 풀이'}
          </button>
        </div>
      </div>
      {error && <p className="error-text">{error}</p>}
      {strokeText && (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>획수 요약</h2>
          <pre className="ai-result" style={{ margin: 0 }}>
            {strokeText}
          </pre>
        </div>
      )}
      {result && (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>AI 성명학</h2>
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
