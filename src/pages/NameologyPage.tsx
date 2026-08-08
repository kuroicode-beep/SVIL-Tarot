import { useState } from 'react'
import { CustomerPicker } from '../components/CustomerPicker'
import { ConnectionBadge } from '../components/ConnectionBadge'
import { estimateHangulStrokes } from '../lib/sajuName'
import { recordServiceConsultation } from '../services/customers'
import { saveHistory } from '../services/history'
import { nameologyReading } from '../services/ollama'
import { ReadingPlayer } from '../components/ReadingPlayer'
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
      setError(t('nameo_need_name'))
      return
    }
    setBusy(true)
    try {
      const est = estimateHangulStrokes(name)
      const stroke = [
        `${t('nameo_total')}: ${est.total}`,
        `${t('nameo_per_char')}: ${est.perChar.map((p) => `${p.char}=${p.strokes}`).join(', ')}`,
        `${t('nameo_element')}: ${est.elementHint}`,
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
      <h1>{t('home_nameology')}</h1>
      <p className="muted">{t('nameo_desc')}</p>
      <div className="btn-row">
        <ConnectionBadge label="Ollama" ok={ollamaOk} />
      </div>
      <div className="panel">
        <CustomerPicker value={customerId} onChange={setCustomerId} />
        <label className="label" htmlFor="nm" style={{ marginTop: 12 }}>
          {t('nameo_f_name')}
        </label>
        <input
          id="nm"
          className="field"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder={t('nameo_ph_name')}
        />
        <label className="label" htmlFor="bd" style={{ marginTop: 12 }}>
          {t('nameo_f_birth')}
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
            {busy ? t('compat_busy') : t('nameo_run')}
          </button>
        </div>
      </div>
      {error && <p className="error-text" role="alert">{error}</p>}
      {strokeText && (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>{t('nameo_stroke_title')}</h2>
          <pre className="ai-result" style={{ margin: 0 }}>
            {strokeText}
          </pre>
        </div>
      )}
      {result && (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>{t('nameo_result')}</h2>
          <div className="ai-result">{result}</div>
          {/* 장문은 읽던 위치를 잃기 쉽다. 문장 단위 낭독으로 주시점을 고정한다. */}
          <ReadingPlayer text={result} />
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
