// src/pages/DictionaryPage.tsx — 78장 카드 사전. 검색·필터로 좁혀 보고, 카드마다 내 키워드·해석을 적는다.
import { useEffect, useMemo, useRef, useState } from 'react'
import { allCards, type TarotCard } from '../lib/cards'
import { useApp } from '../context/AppContext'
import { TarotCardView } from '../components/TarotCardView'
import {
  deleteCardNote,
  getCardNote,
  listCardNotes,
  saveCardNote,
  type CardNote,
} from '../services/cardNotes'

type ArcanaFilter = 'all' | 'major' | 'minor'
type SuitFilter = 'all' | 'cup' | 'wand' | 'sword' | 'pentacle'

const ARCANA_CHIPS: { id: ArcanaFilter; key: string }[] = [
  { id: 'all', key: 'dict_arcana_all' },
  { id: 'major', key: 'dict_arcana_major' },
  { id: 'minor', key: 'dict_arcana_minor' },
]

const SUIT_CHIPS: { id: SuitFilter; key: string }[] = [
  { id: 'all', key: 'dict_suit_all' },
  { id: 'cup', key: 'dict_suit_cup' },
  { id: 'wand', key: 'dict_suit_wand' },
  { id: 'sword', key: 'dict_suit_sword' },
  { id: 'pentacle', key: 'dict_suit_pentacle' },
]

export function DictionaryPage() {
  const { t, setLastSpeakText } = useApp()

  const [query, setQuery] = useState('')
  const [arcana, setArcana] = useState<ArcanaFilter>('all')
  const [suit, setSuit] = useState<SuitFilter>('all')
  const [onlyNoted, setOnlyNoted] = useState(false)

  const [notes, setNotes] = useState<Map<string, CardNote>>(new Map())
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [keywords, setKeywords] = useState('')
  const [meaning, setMeaning] = useState('')
  // 문구가 아니라 i18n 키만 들고 있는다. 번역을 렌더에서 하면 로딩 이펙트가 t에 의존하지 않아,
  // 언어를 바꿨다고 메모를 다시 읽어와 편집 중이던 입력을 덮어쓰는 일이 없다.
  const [noteMsgKey, setNoteMsgKey] = useState<string | null>(null)
  const [noteErrKey, setNoteErrKey] = useState<string | null>(null)

  // 상세를 닫았을 때 포커스를 원래 목록 항목으로 돌려놓는다. 안 그러면 78장 목록의 맨 위로 튄다.
  const detailHeadingRef = useRef<HTMLHeadingElement>(null)
  const listHeadingRef = useRef<HTMLHeadingElement>(null)
  const returnFocusId = useRef<string | null>(null)
  const itemRefs = useRef(new Map<string, HTMLButtonElement | null>())

  // DB 열기 실패와 '메모 0개'가 같은 화면으로 보이면 데이터 소실과 구분할 수 없다.
  const reload = async () => {
    setLoadState('loading')
    try {
      const all = await listCardNotes()
      setNotes(new Map(all.map((n) => [n.cardId, n])))
      setLoadState('ready')
    } catch {
      setLoadState('error')
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  const selected: TarotCard | null = useMemo(
    () => (selectedId ? (allCards.find((c) => c.id === selectedId) ?? null) : null),
    [selectedId],
  )

  // 상세를 열 때 저장소에서 다시 읽는다. 목록 캐시만 믿으면 다른 화면에서 바뀐 메모를 덮어쓴다.
  useEffect(() => {
    if (!selectedId) return
    let alive = true
    setNoteMsgKey(null)
    setNoteErrKey(null)
    void (async () => {
      try {
        const note = await getCardNote(selectedId)
        if (!alive) return
        setKeywords(note?.keywords ?? '')
        setMeaning(note?.meaning ?? '')
      } catch {
        if (!alive) return
        setKeywords('')
        setMeaning('')
        setNoteErrKey('load_error')
      }
    })()
    return () => {
      alive = false
    }
  }, [selectedId])

  // 상단바 '읽어주기'가 지금 보고 있는 카드를 읽도록 문장을 넘겨 둔다.
  useEffect(() => {
    if (!selected) return
    setLastSpeakText(
      `${selected.nameKo}. ${t('upright')}: ${selected.upright}. ${t('reversed')}: ${selected.reversed}. ${selected.lesson}`,
    )
  }, [selected, setLastSpeakText, t])

  useEffect(() => {
    if (selectedId) {
      detailHeadingRef.current?.focus()
      return
    }
    if (!returnFocusId.current) return
    const back = itemRefs.current.get(returnFocusId.current)
    returnFocusId.current = null
    // 메모를 지우면 '내 메모 있는 것만' 필터에서 그 카드가 빠져 돌아갈 항목 자체가 사라진다.
    // 그때 포커스가 body로 떨어지면 키보드·스크린리더 사용자는 현재 위치를 통째로 잃으므로 제목이 받아 준다.
    if (back) back.focus()
    else listHeadingRef.current?.focus()
  }, [selectedId])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allCards.filter((c) => {
      if (arcana !== 'all' && c.arcana !== arcana) return false
      if (suit !== 'all' && c.suit !== suit) return false
      const note = notes.get(c.id)
      if (onlyNoted && !note) return false
      if (!q) return true
      // 내가 적어 둔 키워드로도 찾을 수 있어야 한다. 사전을 외우는 게 아니라 내 어휘로 되찾는 게 목적이다.
      const hay = [c.nameKo, c.nameEn, c.upright, c.reversed, note?.keywords ?? '', note?.meaning ?? '']
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [query, arcana, suit, onlyNoted, notes])

  const filterActive = query.trim() !== '' || arcana !== 'all' || suit !== 'all' || onlyNoted

  const resetFilters = () => {
    setQuery('')
    setArcana('all')
    setSuit('all')
    setOnlyNoted(false)
  }

  const onArcana = (v: ArcanaFilter) => {
    setArcana(v)
    // 메이저 아르카나에는 수트가 없다. 항상 0건이 되는 막다른 조합을 애초에 막는다.
    if (v === 'major') setSuit('all')
  }

  const onSuit = (v: SuitFilter) => {
    setSuit(v)
    if (v !== 'all') setArcana('minor')
  }

  const openCard = (id: string) => {
    returnFocusId.current = id
    // 저장소에서 읽어오기 전까지 직전 카드의 메모가 입력란에 남아 있으면
    // 다른 카드 내용을 자기 것으로 착각하고 그대로 저장할 수 있다. 열 때 먼저 비운다.
    setKeywords('')
    setMeaning('')
    setSelectedId(id)
  }

  const closeCard = () => {
    setSelectedId(null)
    setNoteMsgKey(null)
    setNoteErrKey(null)
  }

  const onSave = async () => {
    if (!selected) return
    setNoteMsgKey(null)
    setNoteErrKey(null)
    try {
      const next = await saveCardNote(selected.id, keywords, meaning)
      const map = new Map(notes)
      if (next.keywords || next.meaning) map.set(next.cardId, next)
      else map.delete(next.cardId)
      setNotes(map)
      setKeywords(next.keywords ?? '')
      setMeaning(next.meaning ?? '')
      setNoteMsgKey(next.keywords || next.meaning ? 'dict_saved' : 'dict_cleared')
    } catch {
      setNoteErrKey('save_fail')
    }
  }

  const onDelete = async () => {
    if (!selected) return
    if (!window.confirm(t('dict_delete_confirm'))) return
    setNoteMsgKey(null)
    setNoteErrKey(null)
    try {
      await deleteCardNote(selected.id)
      const map = new Map(notes)
      map.delete(selected.id)
      setNotes(map)
      setKeywords('')
      setMeaning('')
      setNoteMsgKey('dict_cleared')
    } catch {
      setNoteErrKey('save_fail')
    }
  }

  if (selected) {
    const hasNote = notes.has(selected.id)
    return (
      <main className="page">
        <div className="btn-row" style={{ marginTop: 0 }}>
          <button type="button" className="btn" onClick={closeCard}>
            {t('dict_back')}
          </button>
        </div>

        {/* tabIndex -1 — 목록에서 넘어온 포커스를 제목에 앉혀 어디로 이동했는지 소리로 알린다. */}
        <h1 ref={detailHeadingRef} tabIndex={-1}>
          {selected.nameKo}
        </h1>
        <p className="muted mono">{selected.nameEn}</p>

        <div className="panel learn-bento">
          <TarotCardView cardId={selected.id} />
          <div>
            <h2 style={{ marginTop: 0 }}>{t('upright')}</h2>
            <p>{selected.upright}</p>
            <h2>{t('reversed')}</h2>
            <p>{selected.reversed}</p>
            <h2>{t('dict_lesson')}</h2>
            <p>{selected.lesson}</p>
          </div>
        </div>

        <div className="panel">
          <h2 style={{ marginTop: 0 }}>{t('dict_my_note')}</h2>
          <p className="muted">{t('dict_note_hint')}</p>
          <p>{hasNote ? t('dict_has_note') : t('dict_no_note')}</p>

          <label className="label" htmlFor="dict-kw">
            {t('dict_my_keywords')}
          </label>
          <textarea
            id="dict-kw"
            className="field"
            style={{ minHeight: 90 }}
            placeholder={t('dict_my_keywords_ph')}
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
          />

          <label className="label" htmlFor="dict-mean" style={{ marginTop: 16 }}>
            {t('dict_my_meaning')}
          </label>
          <textarea
            id="dict-mean"
            className="field"
            placeholder={t('dict_my_meaning_ph')}
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
          />

          <div className="btn-row">
            <button type="button" className="btn btn--primary" onClick={() => void onSave()}>
              {t('dict_save')}
            </button>
            {hasNote && (
              <button type="button" className="btn btn--danger" onClick={() => void onDelete()}>
                {t('dict_delete')}
              </button>
            )}
          </div>
          {noteMsgKey && (
            <p className="feedback-ok" role="status">
              {t(noteMsgKey)}
            </p>
          )}
          {noteErrKey && (
            <p className="error-text" role="alert">
              {t(noteErrKey)}
            </p>
          )}
        </div>
      </main>
    )
  }

  return (
    <main className="page">
      {/* tabIndex -1 — 돌아갈 목록 항목이 사라졌을 때 포커스를 받아 주는 자리. */}
      <h1 ref={listHeadingRef} tabIndex={-1}>
        {t('dict_title')}
      </h1>
      <p className="muted">{t('dict_desc')}</p>

      <div className="panel">
        <label className="label" htmlFor="dict-search">
          {t('dict_search_label')}
        </label>
        <input
          id="dict-search"
          type="search"
          className="field"
          placeholder={t('dict_search_ph')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <p className="label" style={{ marginTop: 16, marginBottom: 8 }}>
          {t('dict_filter_arcana')}
        </p>
        <div className="chip-row" role="group" aria-label={t('dict_filter_arcana')}>
          {ARCANA_CHIPS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`chip${arcana === c.id ? ' is-on' : ''}`}
              aria-pressed={arcana === c.id}
              onClick={() => onArcana(c.id)}
            >
              {t(c.key)}
            </button>
          ))}
        </div>

        <p className="label" style={{ marginTop: 16, marginBottom: 8 }}>
          {t('dict_filter_suit')}
        </p>
        <div className="chip-row" role="group" aria-label={t('dict_filter_suit')}>
          {SUIT_CHIPS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`chip${suit === c.id ? ' is-on' : ''}`}
              aria-pressed={suit === c.id}
              onClick={() => onSuit(c.id)}
            >
              {t(c.key)}
            </button>
          ))}
        </div>

        <div className="chip-row" style={{ marginTop: 16 }}>
          <button
            type="button"
            className={`chip${onlyNoted ? ' is-on' : ''}`}
            aria-pressed={onlyNoted}
            onClick={() => setOnlyNoted(!onlyNoted)}
          >
            {t('dict_filter_note')}
          </button>
          {filterActive && (
            <button type="button" className="btn" onClick={resetFilters}>
              {t('dict_reset')}
            </button>
          )}
        </div>

        <p className="muted" style={{ marginTop: 12 }}>
          {t('dict_note_count', { n: notes.size })}
        </p>
      </div>

      {/* 필터를 좁혔을 때 몇 장이 남았는지 화면을 훑지 않고도 알아야 한다. */}
      <p role="status" style={{ fontWeight: 700 }}>
        {t('dict_count', { n: filtered.length })}
      </p>

      {loadState === 'loading' ? (
        <p className="muted" role="status">
          {t('loading')}
        </p>
      ) : loadState === 'error' ? (
        <div className="panel">
          <p className="error-text" role="alert">
            {t('load_error')}
          </p>
          <button type="button" className="btn btn--primary" onClick={() => void reload()}>
            {t('retry')}
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="panel">
          <p>{t('dict_empty')}</p>
          <div className="btn-row">
            <button type="button" className="btn btn--primary" onClick={resetFilters}>
              {t('dict_reset')}
            </button>
          </div>
        </div>
      ) : (
        <div className="list-choice">
          {filtered.map((c) => {
            const hasNote = notes.has(c.id)
            return (
              <button
                key={c.id}
                type="button"
                ref={(el) => {
                  itemRefs.current.set(c.id, el)
                }}
                // aria-label은 버튼 안의 글자를 대체해 버린다. 메모 유무를 여기 넣지 않으면
                // 화면에는 '메모 있음'이 보여도 스크린리더로는 들리지 않아 색 대신 둔 텍스트 라벨이 무의미해진다.
                aria-label={`${c.nameKo}. ${hasNote ? t('dict_has_note') : t('dict_no_note')}. ${t('dict_open')}`}
                onClick={() => openCard(c.id)}
              >
                <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <strong>{c.nameKo}</strong>
                  <span className="muted">{c.nameEn}</span>
                  <span>{c.upright}</span>
                  {/* 메모 유무를 색이 아니라 글자로 알린다. */}
                  <span className="muted">{hasNote ? t('dict_has_note') : t('dict_no_note')}</span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </main>
  )
}
