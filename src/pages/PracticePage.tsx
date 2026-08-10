// src/pages/PracticePage.tsx — 실전 타로(스프레드 선택 → 뽑기 → 내 해설 → AI 보완 조언)
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { allSpreads, PRESET_SPREADS, type SpreadOption } from '../services/customSpreads'
import { drawCards, formatDrawnForPrompt, type DrawnCard } from '../lib/cards'
import { analyzeSpread, analysisToPrompt, noteParams } from '../lib/analyze'
import { SpreadCards } from '../components/TarotCardView'
import { adviceFromPractice } from '../services/ollama'
import { saveHistory } from '../services/history'
import { recordServiceConsultation } from '../services/customers'
import { ReadingPlayer } from '../components/ReadingPlayer'
import { useApp } from '../context/AppContext'
import { ConnectionBadge } from '../components/ConnectionBadge'
import { CustomerPicker } from '../components/CustomerPicker'
import { useCustomerQueryParam } from '../hooks/useCustomerQueryParam'

export function PracticePage() {
  // 프리셋으로 즉시 그리고, IndexedDB에서 내 스프레드가 오면 합친 목록으로 바꾼다.
  // 첫 렌더를 빈 배열로 두면 선택값이 없는 채로 '뽑기'를 눌러 화면이 죽는다.
  const [list, setList] = useState<SpreadOption[]>(PRESET_SPREADS)
  // 프리셋만 있는 첫 렌더와 '내 스프레드까지 다 받은 뒤'를 구분해야 한다.
  // 구분하지 않으면 ?spread=custom_… 으로 들어왔을 때 IndexedDB 응답 전에 목록에 없다고
  // 판단해 선택을 프리셋으로 되돌려 버린다.
  const [listLoaded, setListLoaded] = useState(false)
  // 스프레드 목록 화면에서 '이 스프레드로 보기'로 넘어오면 ?spread= 로 미리 골라 준다.
  const [searchParams] = useSearchParams()
  const [spreadId, setSpreadId] = useState(() => searchParams.get('spread') || 'three')
  const [cards, setCards] = useState<DrawnCard[]>([])
  const [note, setNote] = useState('')
  const [aiText, setAiText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)
  const [customerId, setCustomerId] = useCustomerQueryParam()
  const { speak, setLastSpeakText, ollamaOk, registerSaveHandler, runSave, setSaveMessage, t } = useApp()

  // 내 스프레드를 다른 탭에서 지우면 지금 고른 id가 목록에서 사라진다. 그때 첫 항목으로 떨어뜨려
  // spread가 undefined가 되는 일을 막는다(뽑기 버튼이 그대로 죽는 자리다).
  const spread = list.find((s) => s.id === spreadId) ?? list[0]
  // ?spread=custom_… 으로 들어왔는데 아직 IndexedDB가 답하지 않은 구간.
  // 이때 그냥 두면 select에는 '1카드 스프레드'가 보이는데 실제 뽑기는 다른 값으로 돌아
  // 화면과 결과가 어긋난다. 자리표시 항목을 넣어 값을 맞추고 뽑기를 잠깐 막는다.
  const spreadPending = !listLoaded && !list.some((s) => s.id === spreadId)
  const stateRef = useRef({ cards, note, aiText, spread, customerId })
  stateRef.current = { cards, note, aiText, spread, customerId }
  // 저장 버튼과 상단바 저장이 동시에 눌리면 crypto.randomUUID()가 매번 새 id를 만들어
  // 같은 리딩이 기록·상담 양쪽에 중복으로 쌓인다. 실행 중 차단 + 저장된 id 재사용으로 막는다.
  const savingRef = useRef(false)
  const savedRef = useRef<{ historyId: string; consultationId?: string } | null>(null)

  const onSave = async () => {
    const s = stateRef.current
    if (!s.cards.length) {
      setSaveMessage(t('save_none'))
      return
    }
    if (savingRef.current) return
    savingRef.current = true
    try {
      const hist = await saveHistory({
        id: savedRef.current?.historyId,
        kind: 'practice',
        title: `실전 · ${s.spread.nameKo}`,
        cards: s.cards,
        userNote: s.note,
        aiText: s.aiText,
        customerId: s.customerId || undefined,
        meta: { spreadId: s.spread.id },
      })
      let consultationId = savedRef.current?.consultationId
      if (s.customerId) {
        const cons = await recordServiceConsultation({
          id: consultationId,
          customerId: s.customerId,
          serviceType: 'practice',
          title: `실전 타로 · ${s.spread.nameKo}`,
          summary: s.note?.slice(0, 120) || '실전 타로 상담',
          detail: s.note,
          resultText: s.aiText,
          historyId: hist.id,
        })
        consultationId = cons.id
      }
      savedRef.current = { historyId: hist.id, consultationId }
      // 성공 문구는 버튼 옆 로컬 메시지로만 띄운다. 전역 배너는 실패 전용이라 중복되지 않는다.
      setSavedMsg(t('save_ok'))
    } finally {
      savingRef.current = false
    }
  }

  useEffect(() => {
    registerSaveHandler(() => onSave())
    return () => registerSaveHandler(null)
  }, [registerSaveHandler, t])

  // 스프레드 빌더에서 만든 내 스프레드를 여기서 바로 고를 수 있어야 한다.
  useEffect(() => {
    let alive = true
    void (async () => {
      const all = await allSpreads()
      if (!alive) return
      setList(all)
      setListLoaded(true)
    })()
    return () => {
      alive = false
    }
  }, [])

  // 없는 id(지워진 내 스프레드, 잘못된 ?spread= 값)가 남아 있으면 select의 value가 어느 option과도
  // 맞지 않아 화면에는 첫 항목이 보이는데 실제 선택은 다른 값이 된다.
  // 반드시 전체 목록을 받은 뒤에만 판단한다 — 프리셋만 있는 상태로 판단하면 멀쩡한 내 스프레드를 튕겨낸다.
  useEffect(() => {
    if (!listLoaded || list.length === 0) return
    if (!list.some((s) => s.id === spreadId)) setSpreadId(list[0].id)
  }, [listLoaded, list, spreadId])

  const onDraw = () => {
    // 아직 어떤 스프레드인지 확정되지 않은 구간에서는 뽑지 않는다(엉뚱한 장수로 뽑힌다).
    if (spreadPending) return
    setAiText('')
    setSavedMsg(null)
    setError(null)
    // 새 리딩은 새 기록이어야 한다. 이전 저장 id를 물고 가면 앞 리딩을 덮어쓴다.
    savedRef.current = null
    setCards(drawCards(spread.cardCount, spread.positions))
  }

  const onAdvice = async () => {
    if (!cards.length) return
    setBusy(true)
    setError(null)
    try {
      // 규칙 진단을 프롬프트 앞에 붙이면 모델이 배열의 편중을 놓치지 않는다.
      const text = await adviceFromPractice(
        formatDrawnForPrompt(cards),
        note,
        analysisToPrompt(analyzeSpread(cards)),
      )
      setAiText(text)
      setLastSpeakText(text)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('load_error'))
    } finally {
      setBusy(false)
    }
  }

  // 뽑은 카드가 바뀔 때만 다시 계산한다. 순수 규칙 연산이라 네트워크가 필요 없다.
  const analysis = cards.length > 0 ? analyzeSpread(cards) : null

  return (
    <main className="page">
      <h1>{t('home_practice')}</h1>
      <p className="muted">{t('home_practice_hint')}</p>
      <div className="btn-row">
        <ConnectionBadge label="Ollama" ok={ollamaOk} />
      </div>

      <div className="panel">
        <CustomerPicker value={customerId} onChange={setCustomerId} />
        <label className="label" htmlFor="spread" style={{ marginTop: 12 }}>
          {t('practice_spread')}
        </label>
        <select
          id="spread"
          className="field"
          value={spreadId}
          onChange={(e) => setSpreadId(e.target.value)}
        >
          {/* 목록이 오기 전이라 아직 이름을 모르는 스프레드. value를 맞춰 두어야
              보이는 항목과 실제 선택이 어긋나지 않는다. */}
          {spreadPending && <option value={spreadId}>{t('loading')}</option>}
          {/* 프리셋과 내 스프레드를 색이 아니라 글자로 구분한다(option에는 스타일도 못 준다). */}
          {list.map((s) => (
            <option key={s.id} value={s.id}>
              {s.custom ? `${s.nameKo} · ${t('sb_title')}` : s.nameKo}
            </option>
          ))}
        </select>
        <div className="btn-row">
          <button
            type="button"
            className="btn btn--primary"
            // disabled를 쓰면 포커스가 탭 순서에서 빠져 왜 못 누르는지 알 수 없다.
            aria-disabled={spreadPending || undefined}
            onClick={onDraw}
          >
            {t('practice_draw')}
          </button>
        </div>
        {spreadPending && (
          <p className="muted" role="status">
            {t('loading')}
          </p>
        )}
      </div>

      {cards.length > 0 && (
        <>
          <SpreadCards cards={cards} />
          {analysis && (
            <div className="panel">
              <h2 style={{ marginTop: 0 }}>{t('analyze_title')}</h2>
              <ul>
                {/* 수트 이름은 값이 아니라 사전 키로 온다. noteParams가 t()로 옮겨 넣는다. */}
                {analysis.notes.map((n) => (
                  <li key={n.key}>{t(n.key, noteParams(n, t))}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="panel">
            <label className="label" htmlFor="note">
              {t('practice_note_label')}
            </label>
            <textarea
              id="note"
              className="field"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('practice_note_ph')}
            />
          </div>
          <div className="btn-row">
            <button
              type="button"
              className="btn btn--primary"
              disabled={busy}
              onClick={() => void onAdvice()}
            >
              {busy ? t('practice_advice_busy') : t('practice_advice')}
            </button>
            <button type="button" className="btn" onClick={() => void runSave()}>
              {t('nav_save')}
            </button>
          </div>
        </>
      )}

      {error && <p className="error-text" role="alert">{error}</p>}
      {savedMsg && <p className="feedback-ok">{savedMsg}</p>}

      {aiText && (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>{t('practice_advice_title')}</h2>
          <div className="ai-result">{aiText}</div>
          {/* 장문은 읽던 위치를 잃기 쉽다. 문장 단위 낭독으로 주시점을 고정한다. */}
          <ReadingPlayer text={aiText} />
          <div className="btn-row">
            <button
              type="button"
              className="btn"
              onClick={() => {
                setLastSpeakText(aiText)
                void speak(aiText)
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
