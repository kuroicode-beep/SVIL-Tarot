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

/** 관계 유형은 화면 라벨이자 LLM 프롬프트 인자·meta 저장값이다.
 *  배열을 그대로 t()로 감싸면 로케일에 따라 저장 데이터가 달라지므로 id와 라벨을 분리한다. */
const RELATIONS = [
  { id: 'lover', key: 'rel_lover', prompt: '연인' },
  { id: 'spouse', key: 'rel_spouse', prompt: '부부' },
  { id: 'friend', key: 'rel_friend', prompt: '친구' },
  { id: 'business', key: 'rel_business', prompt: '비즈니스' },
  { id: 'family', key: 'rel_family', prompt: '가족' },
] as const

const blank = (label: string): Person => ({
  label,
  birthDate: '',
  birthTime: '',
  gender: '',
})

export function CompatPage() {
  const { ollamaOk, speak, setLastSpeakText, t, setSaveMessage } = useApp()
  const [customerId, setCustomerId] = useCustomerQueryParam()
  const [relationId, setRelationId] = useState<(typeof RELATIONS)[number]['id']>('lover')
  const [a, setA] = useState<Person>(blank('A'))
  const [b, setB] = useState<Person>(blank('B'))
  const [result, setResult] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 어느 쪽 사람의 경고인지 라벨을 붙여야 위치만으로 구분되지 않는다.
  const [warnings, setWarnings] = useState<{ who: string; key: string }[]>([])

  const run = async () => {
    setError(null)
    if (!a.birthDate || !b.birthDate) {
      setError(t('compat_need_birth'))
      return
    }
    setBusy(true)
    const rel = RELATIONS.find((r) => r.id === relationId) ?? RELATIONS[0]
    const relation = rel.prompt
    try {
      const sa = buildSajuSummary(a)
      const sb = buildSajuSummary(b)
      setWarnings([
        ...(sa.warnings ?? []).map((k) => ({ who: a.label, key: k })),
        ...(sb.warnings ?? []).map((k) => ({ who: b.label, key: k })),
      ])
      const text = await compatReading(sa.textBlock, sb.textBlock, relation)
      setResult(text)
      setLastSpeakText(text)
      const hist = await saveHistory({
        kind: 'compat',
        title: `궁합 · ${relation}`,
        aiText: text,
        customerId: customerId || undefined,
        meta: { relation: rel.id, a: a.birthDate, b: b.birthDate },
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
        setSaveMessage(t('save_ok'))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('load_error'))
    } finally {
      setBusy(false)
    }
  }

  const personFields = (p: Person, set: (x: Person) => void) => (
    <div className="panel">
      <h3 style={{ marginTop: 0 }}>{p.label}</h3>
      <div className="btn-row">
        <label>
          {t('cust_f_birth')}
          <input
            type="date"
            className="field"
            style={{ marginTop: 4 }}
            value={p.birthDate}
            onChange={(e) => set({ ...p, birthDate: e.target.value })}
          />
        </label>
        <label>
          {t('cust_f_time')}
          <input
            type="time"
            className="field"
            style={{ marginTop: 4 }}
            value={p.birthTime}
            onChange={(e) => set({ ...p, birthTime: e.target.value })}
          />
        </label>
        <label>
          {t('cust_f_gender')}
          <select
            className="field"
            style={{ marginTop: 4 }}
            value={p.gender}
            onChange={(e) => set({ ...p, gender: e.target.value })}
          >
            <option value="">{t('cust_g_none')}</option>
            <option value="female">{t('cust_g_f')}</option>
            <option value="male">{t('cust_g_m')}</option>
          </select>
        </label>
      </div>
    </div>
  )

  return (
    <main className="page">
      <h1>{t('home_compat')}</h1>
      <p className="muted">{t('compat_desc')}</p>
      <div className="btn-row">
        <ConnectionBadge label="Ollama" ok={ollamaOk} />
      </div>
      <div className="panel">
        <CustomerPicker value={customerId} onChange={setCustomerId} />
        <div className="label" style={{ marginTop: 12 }}>
          {t('compat_relation')}
        </div>
        <div className="chip-row" role="group" aria-label={t('compat_relation')}>
          {RELATIONS.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`chip${relationId === r.id ? ' is-on' : ''}`}
              aria-pressed={relationId === r.id}
              onClick={() => setRelationId(r.id)}
            >
              {t(r.key)}
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
          {busy ? t('compat_busy') : t('compat_run')}
        </button>
      </div>
      {error && <p className="error-text" role="alert">{error}</p>}
      {warnings.length > 0 && (
        <div className="warn-panel" role="note" aria-label={t('saju_warn_title')}>
          <strong>{t('saju_warn_title')}</strong>
          <ul>
            {warnings.map((w) => (
              <li key={`${w.who}-${w.key}`}>
                {t('warn_for', { who: w.who })} — {t(w.key)}
              </li>
            ))}
          </ul>
        </div>
      )}
      {result && (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>{t('compat_result')}</h2>
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
