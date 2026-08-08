// src/pages/AiTarotPage.tsx — AI 타로 화면(질문·카테고리 → 스프레드 뽑기 → 로컬 LLM 리딩)
import { useEffect, useRef, useState } from 'react'
import spreads from '../data/spreads.json'
import { deckUrl, drawCards, formatDrawnForPrompt, type DrawnCard } from '../lib/cards'
import { SpreadCards } from '../components/TarotCardView'
import { fullAiReading, OLLAMA_MODEL } from '../services/ollama'
import { saveHistory } from '../services/history'
import { recordServiceConsultation } from '../services/customers'
import { useApp } from '../context/AppContext'
import { ConnectionBadge } from '../components/ConnectionBadge'
import { CustomerPicker } from '../components/CustomerPicker'
import { useCustomerQueryParam } from '../hooks/useCustomerQueryParam'

// 값은 한국어로 유지(LLM 프롬프트·저장 메타에 사용), 화면 라벨만 번역한다.
const CATEGORIES = ['연애', '직업', '금전', '건강', '종합'] as const
const CATEGORY_KEY: Record<(typeof CATEGORIES)[number], string> = {
  연애: 'cat_love',
  직업: 'cat_job',
  금전: 'cat_money',
  건강: 'cat_health',
  종합: 'cat_all',
}
type Spread = (typeof spreads)[number]

export function AiTarotPage() {
  const list = spreads as Spread[]
  const [mode, setMode] = useState<'question' | 'category'>('question')
  const [question, setQuestion] = useState('')
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('종합')
  const [spreadId, setSpreadId] = useState('three')
  const [cards, setCards] = useState<DrawnCard[]>([])
  const [result, setResult] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)
  const [customerId, setCustomerId] = useCustomerQueryParam()
  const { speak, setLastSpeakText, ollamaOk, registerSaveHandler, runSave, setSaveMessage, t } =
    useApp()

  const spread = list.find((s) => s.id === spreadId) ?? list[1]
  const stateRef = useRef({ cards, result, mode, question, category, spreadId, customerId })
  stateRef.current = { cards, result, mode, question, category, spreadId, customerId }

  const onSave = async () => {
    // 직전 성공 문구가 남아 있으면 저장 실패 배너와 나란히 떠서 저장된 줄 착각한다. 시도마다 지운다.
    setSavedMsg(null)
    const s = stateRef.current
    if (!s.cards.length) {
      setSaveMessage(t('save_none'))
      return
    }
    const title =
      s.mode === 'question' ? `AI · ${s.question.slice(0, 40) || '질문'}` : `AI · ${s.category}`
    const hist = await saveHistory({
      kind: 'ai',
      title,
      cards: s.cards,
      aiText: s.result,
      customerId: s.customerId || undefined,
      meta: { mode: s.mode, question: s.question, category: s.category, spreadId: s.spreadId },
    })
    if (s.customerId) {
      await recordServiceConsultation({
        customerId: s.customerId,
        serviceType: 'ai',
        title,
        summary: s.result?.slice(0, 120) || 'AI 타로 상담',
        resultText: s.result,
        historyId: hist.id,
        meta: { mode: s.mode, category: s.category },
      })
    }
    const msg = t('save_ok')
    setSavedMsg(msg)
    setSaveMessage(msg)
  }

  useEffect(() => {
    registerSaveHandler(() => onSave())
    return () => registerSaveHandler(null)
  }, [registerSaveHandler, t])

  const run = async () => {
    setBusy(true)
    setError(null)
    setSavedMsg(null)
    try {
      const drawn = drawCards(spread.cardCount, spread.positions)
      setCards(drawn)
      const text = await fullAiReading({
        mode,
        question,
        category,
        cardsText: formatDrawnForPrompt(drawn),
      })
      setResult(text)
      setLastSpeakText(text)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('load_error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page">
      <h1>{t('home_ai')}</h1>
      <p className="muted">{t('ai_desc', { model: OLLAMA_MODEL })}</p>
      <div className="btn-row">
        <ConnectionBadge label="Ollama" ok={ollamaOk} />
      </div>

      <div className="segment" role="group" aria-label={t('ai_mode_group')} style={{ margin: '16px 0', width: '100%', maxWidth: 480 }}>
        {/* 선택 상태를 색(is-on)만으로 알리지 않도록 aria-pressed로도 노출한다. */}
        <button
          type="button"
          className={mode === 'question' ? 'is-on' : ''}
          style={{ flex: 1 }}
          aria-pressed={mode === 'question'}
          onClick={() => setMode('question')}
        >
          {t('ai_mode_question')}
        </button>
        <button
          type="button"
          className={mode === 'category' ? 'is-on' : ''}
          style={{ flex: 1 }}
          aria-pressed={mode === 'category'}
          onClick={() => setMode('category')}
        >
          {t('ai_mode_category')}
        </button>
      </div>

      <div className="ai-layout">
        <div className="panel">
          <CustomerPicker value={customerId} onChange={setCustomerId} />
          {mode === 'question' ? (
            <div>
              <label className="label" htmlFor="q">
                {t('ai_q_label')}
              </label>
              <textarea
                id="q"
                className="field"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={t('ai_q_ph')}
              />
            </div>
          ) : (
            <div>
              <div className="label">{t('ai_category')}</div>
              <div className="chip-row">
                {CATEGORIES.map((c) => (
                  // chip은 선택돼도 텍스트가 바뀌지 않아, 보조기술에는 aria-pressed로 선택 여부를 준다.
                  <button
                    key={c}
                    type="button"
                    className={`chip${category === c ? ' is-on' : ''}`}
                    aria-pressed={category === c}
                    onClick={() => setCategory(c)}
                  >
                    {t(CATEGORY_KEY[c])}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <label className="label" htmlFor="sp">
              {t('ai_spread_label')}
            </label>
            <select
              id="sp"
              className="field"
              value={spreadId}
              onChange={(e) => setSpreadId(e.target.value)}
            >
              {list.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nameKo}
                </option>
              ))}
            </select>
          </div>

          <div className="btn-row">
            <button
              type="button"
              className="btn btn--primary"
              style={{ width: '100%' }}
              disabled={busy}
              aria-busy={busy}
              onClick={() => void run()}
            >
              {busy ? t('ai_run_busy') : t('ai_run')}
            </button>
          </div>
        </div>

        <div>
          {/* 뽑기 전 장식용 카드 뒷면만 숨긴다. 카드가 있으면 카드명·정역방향을 읽어야 하므로 노출한다. */}
          <div className="ai-visual" aria-hidden={cards.length === 0}>
            {cards.length === 0 ? (
              <>
                <div className="card-back" style={{ transform: 'rotate(-6deg)' }} />
                <img
                  src={deckUrl('17_The_Star_00001_.webp')}
                  alt=""
                  style={{
                    width: 96,
                    borderRadius: 10,
                    border: '3px solid var(--accent)',
                    transform: 'translateY(-8px)',
                  }}
                />
                <div className="card-back" style={{ transform: 'rotate(6deg)' }} />
              </>
            ) : (
              <SpreadCards cards={cards} />
            )}
          </div>

          {error && <p className="error-text" role="alert">{error}</p>}
          {savedMsg && <p className="feedback-ok">{savedMsg}</p>}

          {/* 결과 전문(수천 자)이 음성 큐에 통째로 들어가지 않도록, 상태만 한 줄로 알린다.
              노드를 조건부로 렌더하면 변경이 안 읽히므로 항상 DOM에 둔다. 전문 낭독은 아래 낭독 버튼이 맡는다.
              진행 상태는 실행 버튼 문구로, 결과 도착은 아래 리포트 패널로 이미 눈에 보인다.
              같은 문구를 한 번 더 띄우면 h2와 겹쳐 보여서, 화면에서는 지우고 보조기술에만 남긴다.
              (tokens.css에 sr-only 유틸리티가 없어 인라인으로 둔다.) */}
          <p
            role="status"
            style={{
              position: 'absolute',
              width: 1,
              height: 1,
              margin: -1,
              padding: 0,
              border: 0,
              overflow: 'hidden',
              clip: 'rect(0 0 0 0)',
              whiteSpace: 'nowrap',
            }}
          >
            {busy ? t('ai_run_busy') : result ? t('ai_report_title') : ''}
          </p>

          <div className="panel">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                marginBottom: 12,
              }}
            >
              <h2 style={{ margin: 0 }}>{t('ai_report_title')}</h2>
              {result && (
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
              )}
            </div>
            {result ? (
              <>
                <div className="ai-result">{result}</div>
                <div className="btn-row">
                  {/* onSave를 직접 부르면 rejection이 void로 사라져 저장 실패가 조용히 묻힌다.
                      runSave는 등록된 핸들러를 try/catch로 감싸 save_fail 배너까지 띄운다. */}
                  <button type="button" className="btn btn--primary" onClick={() => void runSave()}>
                    {t('nav_save')}
                  </button>
                </div>
              </>
            ) : (
              <p className="muted">{t('ai_report_empty')}</p>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
