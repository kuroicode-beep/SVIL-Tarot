import { useState } from 'react'
import { CustomerPicker } from '../components/CustomerPicker'
import { ConnectionBadge } from '../components/ConnectionBadge'
import { buildSajuSummary } from '../lib/sajuName'
import { recordServiceConsultation } from '../services/customers'
import { saveHistory } from '../services/history'
import { namingSuggest } from '../services/ollama'
import { ReadingPlayer } from '../components/ReadingPlayer'
import { useApp } from '../context/AppContext'
import { useCustomerQueryParam } from '../hooks/useCustomerQueryParam'

export function NamingPage() {
  const { ollamaOk, speak, setLastSpeakText, t, setSaveMessage } = useApp()
  const [customerId, setCustomerId] = useCustomerQueryParam()
  const [surname, setSurname] = useState('')
  const [gender, setGender] = useState('female')
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  // 초기값을 상태에 박으면 언어를 바꿔도 한국어가 남는다. 비워 두고 placeholder로 예시를 주되,
  // 비어 있으면 실행 시점의 로케일 기본 문구를 프롬프트에 넣는다.
  const [style, setStyle] = useState('')
  const [result, setResult] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])

  const run = async () => {
    setError(null)
    if (!surname.trim() || !birthDate) {
      setError(t('naming_need_input'))
      return
    }
    setBusy(true)
    try {
      const saju = buildSajuSummary({ birthDate, birthTime, gender })
      setWarnings(saju.warnings ?? [])
      const text = await namingSuggest({
        surname: surname.trim(),
        gender,
        sajuText: saju.textBlock,
        style: style.trim() || t('naming_style_default'),
      })
      setResult(text)
      setLastSpeakText(text)
      const hist = await saveHistory({
        kind: 'naming',
        title: `작명 · ${surname.trim()}`,
        aiText: text,
        customerId: customerId || undefined,
        meta: { surname: surname.trim(), birthDate },
      })
      if (customerId) {
        await recordServiceConsultation({
          customerId,
          serviceType: 'naming',
          title: `작명 · ${surname.trim()}`,
          summary: `${surname.trim()}씨 작명 후보 (${birthDate})`,
          detail: saju.textBlock,
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
      <h1>{t('home_naming')}</h1>
      <p className="muted">{t('naming_desc')}</p>
      {/* 이 화면에는 달력 입력이 없어 항상 양력으로 계산된다. SajuPage와 동작이 달라 명시한다. */}
      <p className="muted">{t('saju_solar_only')}</p>
      <div className="btn-row">
        <ConnectionBadge label="Ollama" ok={ollamaOk} />
      </div>
      <div className="panel">
        <CustomerPicker value={customerId} onChange={setCustomerId} />
        <div className="btn-row" style={{ marginTop: 12 }}>
          <label>
            {t('naming_f_surname')}
            <input
              className="field"
              style={{ marginTop: 4, width: 120 }}
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              placeholder={t('naming_ph_surname')}
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
              <option value="female">{t('naming_g_f')}</option>
              <option value="male">{t('naming_g_m')}</option>
              <option value="other">{t('naming_g_x')}</option>
            </select>
          </label>
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
        </div>
        <label className="label" htmlFor="style" style={{ marginTop: 12 }}>
          {t('naming_f_style')}
        </label>
        <input
          id="style"
          className="field"
          value={style}
          placeholder={t('naming_style_default')}
          onChange={(e) => setStyle(e.target.value)}
        />
        <div className="btn-row">
          <button type="button" className="btn btn--primary" disabled={busy} onClick={() => void run()}>
            {busy ? t('naming_busy') : t('naming_run')}
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
      {result && (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>{t('naming_result')}</h2>
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
