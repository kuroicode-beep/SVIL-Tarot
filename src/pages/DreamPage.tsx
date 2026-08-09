// src/pages/DreamPage.tsx — 꿈 내용을 적으면 표제어를 뽑아, 사전 근거로 로컬 LLM이 해몽을 쓰는 화면
import { useEffect, useMemo, useRef, useState } from 'react'
import { extractKeywords, interpretDream, searchDreams, type DreamEntry } from '../lib/dreams'
import { saveHistory } from '../services/history'
import { recordServiceConsultation } from '../services/customers'
import { ReadingPlayer } from '../components/ReadingPlayer'
import { ConnectionBadge } from '../components/ConnectionBadge'
import { CustomerPicker } from '../components/CustomerPicker'
import { useCustomerQueryParam } from '../hooks/useCustomerQueryParam'
import { useApp } from '../context/AppContext'

const ADD_RESULT_LIMIT = 12

export function DreamPage() {
  const { t, speak, setLastSpeakText, ollamaOk, registerSaveHandler, runSave, setSaveMessage } =
    useApp()

  const [text, setText] = useState('')
  // 자동 추출 결과를 직접 고치는 두 갈래. 원본(auto)은 건드리지 않고 뺀 것·더한 것만 따로 들고 있어야
  // 사용자가 꿈 내용을 계속 고쳐도 손댄 흔적이 유지된다.
  const [removedIds, setRemovedIds] = useState<string[]>([])
  const [addedEntries, setAddedEntries] = useState<DreamEntry[]>([])
  const [query, setQuery] = useState('')
  const [result, setResult] = useState('')
  const [usedFallback, setUsedFallback] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)
  const [customerId, setCustomerId] = useCustomerQueryParam()

  const auto = useMemo(() => extractKeywords(text), [text])

  const selected = useMemo(() => {
    const removed = new Set(removedIds)
    const list = auto.filter((e) => !removed.has(e.id))
    const ids = new Set(list.map((e) => e.id))
    for (const e of addedEntries) {
      if (ids.has(e.id)) continue
      list.push(e)
      ids.add(e.id)
    }
    return list
  }, [auto, removedIds, addedEntries])

  const addCandidates = useMemo(() => {
    if (!query.trim()) return []
    const picked = new Set(selected.map((e) => e.id))
    return searchDreams(query)
      .filter((e) => !picked.has(e.id))
      .slice(0, ADD_RESULT_LIMIT)
  }, [query, selected])

  const touched = removedIds.length > 0 || addedEntries.length > 0

  // 저장 핸들러는 상단바 '저장' 버튼이 나중에 호출한다. 그때는 클로저가 옛 값을 들고 있으므로 ref로 최신 상태를 본다.
  const stateRef = useRef({ text, result, selected, customerId })
  stateRef.current = { text, result, selected, customerId }

  const onSave = async () => {
    const s = stateRef.current
    if (!s.result.trim()) {
      setSaveMessage(t('save_none'))
      return
    }
    const kw = s.selected.map((e) => e.ko).join(', ') || t('dream_kw_empty')
    const title = t('dream_history_title', { kw })
    try {
      // 꿈해몽 전용 HistoryKind가 없어서 'ai'로 저장하고 meta.dream으로 구분한다(DB 스키마 유지).
      const hist = await saveHistory({
        kind: 'ai',
        title,
        userNote: s.text,
        aiText: s.result,
        customerId: s.customerId || undefined,
        meta: { dream: 1, keywords: kw },
      })
      if (s.customerId) {
        await recordServiceConsultation({
          customerId: s.customerId,
          serviceType: 'other',
          title,
          summary: s.result.slice(0, 120),
          detail: s.text,
          resultText: s.result,
          historyId: hist.id,
          meta: { dream: 1, keywords: kw },
        })
      }
      setSavedMsg(t('save_ok'))
    } catch {
      setSaveMessage(t('save_fail'))
    }
  }

  useEffect(() => {
    registerSaveHandler(() => onSave())
    return () => registerSaveHandler(null)
  }, [registerSaveHandler, t])

  const removeKeyword = (id: string) => {
    setRemovedIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
    setAddedEntries((prev) => prev.filter((e) => e.id !== id))
  }

  const addKeyword = (entry: DreamEntry) => {
    setRemovedIds((prev) => prev.filter((id) => id !== entry.id))
    setAddedEntries((prev) => (prev.some((e) => e.id === entry.id) ? prev : [...prev, entry]))
    setQuery('')
  }

  const resetKeywords = () => {
    setRemovedIds([])
    setAddedEntries([])
  }

  const clearAll = () => {
    setText('')
    setQuery('')
    setResult('')
    setUsedFallback(false)
    setError(null)
    setSavedMsg(null)
    resetKeywords()
  }

  const onInterpret = async () => {
    if (!text.trim()) {
      setError(t('dream_need_input'))
      return
    }
    setBusy(true)
    setError(null)
    setSavedMsg(null)
    setUsedFallback(false)
    try {
      const out = await interpretDream(text, selected, {
        fallbackNote: t('dream_fallback_note'),
        onFallback: () => setUsedFallback(true),
      })
      setResult(out)
      setLastSpeakText(out)
    } catch (e) {
      // interpretDream은 throw하지 않지만, 예기치 못한 오류로 화면이 멈추지 않도록 막아 둔다.
      setError(e instanceof Error ? e.message : t('load_error'))
    } finally {
      setBusy(false)
    }
  }

  const showDictPanel = selected.length > 0 && !(result && usedFallback)

  return (
    <main className="page">
      <h1>{t('dream_title')}</h1>
      <p className="muted">{t('dream_desc')}</p>
      <div className="btn-row">
        <ConnectionBadge label="Ollama" ok={ollamaOk} />
      </div>

      {/* 결과가 나오기 전에도 참고용이라는 점을 먼저 알린다. */}
      <p className="warn-inline" role="note">
        {t('dream_disclaimer')}
      </p>

      <div className="panel">
        <CustomerPicker value={customerId} onChange={setCustomerId} />

        <label className="label" htmlFor="dream-text" style={{ marginTop: 16 }}>
          {t('dream_input_label')}
        </label>
        <textarea
          id="dream-text"
          className="field"
          style={{ minHeight: 180 }}
          placeholder={t('dream_input_ph')}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <div className="btn-row">
          <button
            type="button"
            className="btn btn--primary"
            disabled={busy}
            onClick={() => void onInterpret()}
          >
            {busy ? t('dream_run_busy') : t('dream_run')}
          </button>
          <button type="button" className="btn" onClick={clearAll}>
            {t('dream_clear')}
          </button>
        </div>
      </div>

      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      {savedMsg && <p className="feedback-ok">{savedMsg}</p>}

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>{t('dream_kw_title')}</h2>
        <p className="muted">{t('dream_kw_hint')}</p>
        <p role="status" style={{ fontWeight: 700 }}>
          {t('dream_kw_count', { n: selected.length })}
        </p>

        {selected.length === 0 ? (
          <p>{text.trim() ? t('dream_kw_none') : t('dream_kw_wait')}</p>
        ) : (
          <div className="chip-row" role="group" aria-label={t('dream_kw_title')}>
            {selected.map((e) => (
              <button
                key={e.id}
                type="button"
                className="chip"
                aria-label={t('dream_kw_remove', { name: e.ko })}
                onClick={() => removeKeyword(e.id)}
              >
                {/* 색이 아니라 글리프로 '누르면 빠진다'를 알린다. */}
                <span aria-hidden="true">✕ </span>
                {e.ko}
              </button>
            ))}
          </div>
        )}

        {touched && (
          <div className="btn-row">
            <button type="button" className="btn" onClick={resetKeywords}>
              {t('dream_kw_reset')}
            </button>
          </div>
        )}

        <label className="label" htmlFor="dream-add" style={{ marginTop: 20 }}>
          {t('dream_kw_add_label')}
        </label>
        <input
          id="dream-add"
          type="search"
          className="field"
          placeholder={t('dream_kw_add_ph')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query.trim() === '' ? (
          <p className="muted">{t('dream_kw_add_hint')}</p>
        ) : addCandidates.length === 0 ? (
          <p className="muted">{t('dream_kw_add_none')}</p>
        ) : (
          <div className="chip-row" style={{ marginTop: 12 }} role="group" aria-label={t('dream_kw_add_label')}>
            {addCandidates.map((e) => (
              <button
                key={e.id}
                type="button"
                className="chip"
                aria-label={t('dream_kw_add', { name: e.ko })}
                onClick={() => addKeyword(e)}
              >
                <span aria-hidden="true">＋ </span>
                {e.ko}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* AI가 없어도 사전 풀이만으로 쓸 수 있어야 한다. 표·격자 대신 항목별 문단으로 쌓는다. */}
      {showDictPanel && (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>{t('dream_dict_title')}</h2>
          {selected.map((e) => (
            <div key={e.id} style={{ marginBottom: 20 }}>
              <h3 style={{ marginBottom: 4 }}>{e.ko}</h3>
              <p className="muted" style={{ margin: '0 0 8px' }}>
                {e.symbol}
              </p>
              <p style={{ margin: 0 }}>{e.detail}</p>
            </div>
          ))}
        </div>
      )}

      {result && (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>
            {usedFallback ? t('dream_result_fallback_title') : t('dream_result_title')}
          </h2>
          <p className="warn-inline" role="note">
            {t('dream_disclaimer')}
          </p>
          <div className="ai-result" style={{ marginTop: 16 }}>
            {result}
          </div>
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
            <button type="button" className="btn" onClick={() => void runSave()}>
              {t('nav_save')}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
