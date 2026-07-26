import { useState } from 'react'
import { CustomerPicker } from '../components/CustomerPicker'
import { ConnectionBadge } from '../components/ConnectionBadge'
import { buildSajuSummary } from '../lib/sajuName'
import { recordServiceConsultation } from '../services/customers'
import { saveHistory } from '../services/history'
import { namingSuggest } from '../services/ollama'
import { useApp } from '../context/AppContext'

export function NamingPage() {
  const { ollamaOk, speak, setLastSpeakText, t, setSaveMessage } = useApp()
  const [customerId, setCustomerId] = useState('')
  const [surname, setSurname] = useState('')
  const [gender, setGender] = useState('female')
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [style, setStyle] = useState('밝고 바르며 부르기 쉬운 이름')
  const [result, setResult] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    setError(null)
    if (!surname.trim() || !birthDate) {
      setError('성과 생년월일을 입력하세요.')
      return
    }
    setBusy(true)
    try {
      const saju = buildSajuSummary({ birthDate, birthTime, gender })
      const text = await namingSuggest({
        surname: surname.trim(),
        gender,
        sajuText: saju.textBlock,
        style,
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
        setSaveMessage('상담 기록에 저장되었습니다.')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '작명 실패')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page">
      <h1>{t('home_naming')}</h1>
      <p className="muted">
        모두네임·넴유베류처럼 성·성별·사주 참고·원하는 분위기로 이름 후보를 제안합니다.
      </p>
      <div className="btn-row">
        <ConnectionBadge label="Ollama" ok={ollamaOk} />
      </div>
      <div className="panel">
        <CustomerPicker value={customerId} onChange={(id) => setCustomerId(id)} />
        <div className="btn-row" style={{ marginTop: 12 }}>
          <label>
            성
            <input
              className="field"
              style={{ marginTop: 4, width: 120 }}
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              placeholder="김"
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
              <option value="female">여아/여성</option>
              <option value="male">남아/남성</option>
              <option value="other">중성/기타</option>
            </select>
          </label>
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
        </div>
        <label className="label" htmlFor="style" style={{ marginTop: 12 }}>
          원하는 이름 분위기
        </label>
        <input
          id="style"
          className="field"
          value={style}
          onChange={(e) => setStyle(e.target.value)}
        />
        <div className="btn-row">
          <button type="button" className="btn btn--primary" disabled={busy} onClick={() => void run()}>
            {busy ? '추천 중…' : '이름 후보 받기'}
          </button>
        </div>
      </div>
      {error && <p className="error-text">{error}</p>}
      {result && (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>작명 후보</h2>
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
