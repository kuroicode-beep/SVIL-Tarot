// src/pages/SpreadBuilderPage.tsx — 내 스프레드(사용자 정의 스프레드) 만들기·수정·내보내기 화면.
import { useEffect, useRef, useState } from 'react'
import {
  MAX_POSITIONS,
  deleteCustomSpread,
  downloadSpreadsFile,
  exportSpreads,
  importSpreads,
  listCustomSpreads,
  newPositionKey,
  newSpreadId,
  saveCustomSpread,
  type CustomSpread,
  type SpreadPosition,
} from '../services/customSpreads'
import { useApp } from '../context/AppContext'

/** 편집 중인 스프레드. 저장 전에는 DB에 없어서 createdAt이 비어 있다. */
type Draft = {
  id: string
  nameKo: string
  positions: SpreadPosition[]
  createdAt?: string
}

// 서비스는 로케일을 모른다. sentinel만 던지므로 화면 문구로 옮기는 표는 여기 둔다.
const ERROR_KEYS: Record<string, string> = {
  SPREAD_NAME_REQUIRED: 'sb_err_name',
  SPREAD_NO_POSITIONS: 'sb_err_no_pos',
  SPREAD_LABEL_REQUIRED: 'sb_err_label',
  SPREAD_BAD_KEY: 'sb_err_dup',
  SPREAD_DUP_KEY: 'sb_err_dup',
  SPREAD_TOO_MANY: 'sb_err_too_many',
  SPREAD_BAD_FILE: 'sb_err_bad_file',
}

/** 새로 만들 때 미리 깔아 두는 자리 수. 완전히 빈 화면보다 형태가 보이는 쪽이 시작하기 쉽다. */
const DEFAULT_ROWS = 3

function blankRows(n: number): SpreadPosition[] {
  return Array.from({ length: n }, () => ({ key: newPositionKey(), labelKo: '' }))
}

export function SpreadBuilderPage() {
  const { t, speak, setLastSpeakText } = useApp()
  const [list, setList] = useState<CustomSpread[]>([])
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [errorKey, setErrorKey] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [focusId, setFocusId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // DB 열기 실패와 '스프레드 없음'이 같은 화면으로 보이면 데이터가 사라진 건지 구분할 수 없다.
  const reload = async () => {
    setLoadState('loading')
    try {
      setList(await listCustomSpreads())
      setLoadState('ready')
    } catch {
      setLoadState('error')
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  // 자리를 위/아래로 옮기면 버튼도 같이 움직여 포커스가 body로 튕긴다. 옮긴 자리의 같은 버튼으로 되돌린다.
  useEffect(() => {
    if (!focusId) return
    document.getElementById(focusId)?.focus()
    setFocusId(null)
  }, [focusId])

  const openEditor = (next: Draft) => {
    setErrorKey(null)
    setMsg(null)
    setDraft(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const onNew = () => {
    openEditor({ id: newSpreadId(), nameKo: '', positions: blankRows(DEFAULT_ROWS) })
  }

  const onEdit = (s: CustomSpread) => {
    // DB 레코드를 그대로 들고 편집하면 취소해도 화면 목록이 이미 바뀌어 있다. 복사본으로 연다.
    openEditor({
      id: s.id,
      nameKo: s.nameKo,
      positions: s.positions.map((p) => ({ key: p.key, labelKo: p.labelKo })),
      createdAt: s.createdAt,
    })
  }

  const setLabel = (index: number, labelKo: string) => {
    setDraft((d) =>
      d ? { ...d, positions: d.positions.map((p, i) => (i === index ? { ...p, labelKo } : p)) } : d,
    )
  }

  // 포커스 이동은 상태 갱신 함수 밖에서 정한다.
  // setDraft(updater) 안에서 다른 setState를 부르면 StrictMode에서 updater가 두 번 돌며 포커스가 엉킨다.
  const addPosition = () => {
    if (!draft || draft.positions.length >= MAX_POSITIONS) return
    setErrorKey(null)
    const row = { key: newPositionKey(), labelKo: '' }
    setDraft({ ...draft, positions: [...draft.positions, row] })
    // 추가한 자리에 바로 입력할 수 있게 포커스를 옮긴다. 안 그러면 화면 끝까지 다시 찾아 내려가야 한다.
    setFocusId(`sb-label-${row.key}`)
  }

  const removePosition = (index: number) => {
    if (!draft) return
    setErrorKey(null)
    const positions = draft.positions.filter((_, i) => i !== index)
    setDraft({ ...draft, positions })
    // 누른 삭제 버튼이 사라지면 포커스가 body로 떨어져 처음부터 다시 탭해 내려와야 한다.
    // 지운 자리를 메운 이웃(없으면 앞 자리)의 이름 칸으로 옮기고, 자리가 다 없어지면 추가 버튼으로 보낸다.
    const nearIndex = Math.min(index, positions.length - 1)
    const near = nearIndex >= 0 ? positions[nearIndex] : null
    setFocusId(near ? `sb-label-${near.key}` : 'sb-pos-add')
  }

  /** 순서 바꾸기는 드래그가 아니라 버튼이다. 드래그는 저시력·운동장애 사용자가 조작할 수 없다. */
  const movePosition = (index: number, delta: number) => {
    if (!draft) return
    const to = index + delta
    if (to < 0 || to >= draft.positions.length) return
    const positions = draft.positions.slice()
    const [row] = positions.splice(index, 1)
    positions.splice(to, 0, row)
    setDraft({ ...draft, positions })
    setFocusId(`sb-${delta < 0 ? 'up' : 'down'}-${row.key}`)
  }

  const onSave = async () => {
    if (!draft) return
    setErrorKey(null)
    setMsg(null)
    try {
      const saved = await saveCustomSpread({
        id: draft.id,
        nameKo: draft.nameKo,
        cardCount: draft.positions.length,
        // 비워 둔 자리는 번호 라벨로 채운다. 번역 문구라 서비스가 아니라 여기서 만든다.
        positions: draft.positions.map((p, i) => ({
          key: p.key,
          labelKo: p.labelKo.trim() || t('sb_pos_n', { n: i + 1 }),
        })),
        createdAt: draft.createdAt,
      })
      setDraft(null)
      setMsg(t('sb_saved', { name: saved.nameKo }))
      await reload()
    } catch (e) {
      const code = e instanceof Error ? e.message : ''
      setErrorKey(ERROR_KEYS[code] ?? 'save_fail')
    }
  }

  const onDelete = async (s: { id: string; nameKo: string }) => {
    if (!window.confirm(t('sb_delete_confirm', { name: s.nameKo }))) return
    setErrorKey(null)
    try {
      await deleteCustomSpread(s.id)
      setDraft(null)
      setMsg(t('sb_deleted', { name: s.nameKo }))
      await reload()
    } catch {
      setErrorKey('save_fail')
    }
  }

  const onExport = () => {
    setErrorKey(null)
    if (list.length === 0) {
      setMsg(t('sb_export_empty'))
      return
    }
    const { blob, filename } = exportSpreads(list)
    downloadSpreadsFile(blob, filename)
    setMsg(t('sb_exported', { n: list.length }))
  }

  const onImport = async (file: File) => {
    setErrorKey(null)
    setMsg(null)
    if (!window.confirm(t('sb_import_confirm'))) return
    try {
      const { count } = await importSpreads(file)
      setMsg(t('sb_imported', { n: count }))
      await reload()
    } catch (e) {
      const code = e instanceof Error ? e.message : ''
      setErrorKey(ERROR_KEYS[code] ?? 'load_error')
    }
  }

  if (draft) {
    const nameOk = draft.nameKo.trim().length > 0
    const posOk = draft.positions.length > 0
    const canSave = nameOk && posOk
    // 저장을 막을 땐 disabled 대신 aria-disabled를 쓴다. disabled는 포커스가 튕기고 이유도 읽히지 않는다.
    const reasonKey = !posOk ? 'sb_need_pos' : !nameOk ? 'sb_need_name' : null
    const full = draft.positions.length >= MAX_POSITIONS
    const previewLines = draft.positions.map(
      (p, i) => `${i + 1}. ${p.labelKo.trim() || t('sb_pos_n', { n: i + 1 })}`,
    )
    const previewText = `${draft.nameKo.trim() || t('sb_editor_new')}. ${t('card_count', {
      n: draft.positions.length,
    })}. ${previewLines.join(', ')}`

    return (
      <main className="page">
        <h1>{draft.createdAt ? t('sb_editor_edit') : t('sb_editor_new')}</h1>
        <p className="muted">{t('sb_move_hint')}</p>

        <div className="panel">
          <label className="label" htmlFor="sb-name">
            {t('sb_name')}
          </label>
          <input
            id="sb-name"
            className="field"
            value={draft.nameKo}
            placeholder={t('sb_name_ph')}
            onChange={(e) => setDraft({ ...draft, nameKo: e.target.value })}
          />
        </div>

        <div className="panel">
          <h2 style={{ marginTop: 0 }}>{t('sb_positions')}</h2>
          {draft.positions.length === 0 && <p className="muted">{t('sb_pos_empty')}</p>}
          {draft.positions.map((p, i) => (
            <div key={p.key} className="panel" style={{ marginTop: 12, padding: 16 }}>
              <label className="label" htmlFor={`sb-label-${p.key}`}>
                {t('sb_pos_n', { n: i + 1 })}
              </label>
              <input
                id={`sb-label-${p.key}`}
                className="field"
                value={p.labelKo}
                placeholder={t('sb_pos_ph')}
                onChange={(e) => setLabel(i, e.target.value)}
              />
              <div className="btn-row">
                <button
                  id={`sb-up-${p.key}`}
                  type="button"
                  className="btn"
                  aria-disabled={i === 0 || undefined}
                  aria-label={t('sb_move_up_aria', { n: i + 1 })}
                  onClick={() => movePosition(i, -1)}
                >
                  {t('sb_move_up')}
                </button>
                <button
                  id={`sb-down-${p.key}`}
                  type="button"
                  className="btn"
                  aria-disabled={i === draft.positions.length - 1 || undefined}
                  aria-label={t('sb_move_down_aria', { n: i + 1 })}
                  onClick={() => movePosition(i, 1)}
                >
                  {t('sb_move_down')}
                </button>
                <button
                  type="button"
                  className="btn btn--danger"
                  aria-label={t('sb_pos_delete_aria', { n: i + 1 })}
                  onClick={() => removePosition(i)}
                >
                  {t('sb_pos_delete')}
                </button>
              </div>
            </div>
          ))}
          <div className="btn-row">
            <button
              id="sb-pos-add"
              type="button"
              className="btn btn--primary"
              aria-disabled={full || undefined}
              onClick={() => {
                if (full) {
                  setErrorKey('sb_err_too_many')
                  return
                }
                addPosition()
              }}
            >
              {t('sb_pos_add')}
            </button>
          </div>
          {full && <p className="warn-inline">{t('sb_err_too_many', { n: MAX_POSITIONS })}</p>}
        </div>

        {/* 미리보기는 격자가 아니라 번호 붙은 세로 목록이다. 격자는 저시력에서 행·열 추적이 어렵다. */}
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>{t('sb_preview')}</h2>
          <p className="muted mono">{t('card_count', { n: draft.positions.length })}</p>
          {draft.positions.length === 0 ? (
            <p className="muted">{t('sb_preview_empty')}</p>
          ) : (
            <ol>
              {draft.positions.map((p, i) => (
                <li key={p.key}>{p.labelKo.trim() || t('sb_pos_n', { n: i + 1 })}</li>
              ))}
            </ol>
          )}
          <div className="btn-row">
            <button
              type="button"
              className="btn"
              onClick={() => {
                setLastSpeakText(previewText)
                void speak(previewText)
              }}
            >
              {t('nav_tts')}
            </button>
          </div>
        </div>

        {errorKey && (
          <p className="error-text" role="alert">
            {t(errorKey, { n: MAX_POSITIONS })}
          </p>
        )}
        {reasonKey && (
          <p className="warn-inline" id="sb-save-reason">
            {t(reasonKey)}
          </p>
        )}

        <div className="btn-row">
          <button
            type="button"
            className="btn btn--primary"
            aria-disabled={!canSave || undefined}
            aria-describedby={reasonKey ? 'sb-save-reason' : undefined}
            onClick={() => {
              if (!canSave) {
                setErrorKey(posOk ? 'sb_err_name' : 'sb_err_no_pos')
                return
              }
              void onSave()
            }}
          >
            {t('sb_save')}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setDraft(null)
              setErrorKey(null)
            }}
          >
            {t('sb_cancel')}
          </button>
          {draft.createdAt && (
            <button
              type="button"
              className="btn btn--danger"
              onClick={() => void onDelete({ id: draft.id, nameKo: draft.nameKo })}
            >
              {t('delete_label')}
            </button>
          )}
        </div>
      </main>
    )
  }

  return (
    <main className="page">
      <h1>{t('sb_title')}</h1>
      <p className="muted">{t('sb_desc')}</p>

      <div className="btn-row">
        <button type="button" className="btn btn--primary" onClick={onNew}>
          {t('sb_new')}
        </button>
        <button type="button" className="btn" onClick={onExport}>
          {t('sb_export')}
        </button>
        <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
          {t('sb_import')}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          // 같은 파일을 연속으로 고를 수 있게 값을 비운다(change 이벤트가 안 뜨는 문제).
          e.target.value = ''
          if (file) void onImport(file)
        }}
      />

      {msg && (
        <p className="feedback-ok" role="status">
          {msg}
        </p>
      )}
      {errorKey && (
        <p className="error-text" role="alert">
          {t(errorKey, { n: MAX_POSITIONS })}
        </p>
      )}

      <h2>{t('sb_list_title', { n: list.length })}</h2>
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
      ) : list.length === 0 ? (
        <p className="muted">{t('sb_empty')}</p>
      ) : (
        <div>
          {list.map((s) => (
            <div key={s.id} className="panel">
              <strong>{s.nameKo}</strong>
              <p className="muted mono">{t('card_count', { n: s.cardCount })}</p>
              {/* 자리 이름을 미리 보여 준다. 이름만으로는 어떤 스프레드였는지 기억나지 않는다. */}
              <p className="muted">{s.positions.map((p) => p.labelKo).join(' · ')}</p>
              <div className="btn-row">
                <button
                  type="button"
                  className="btn btn--primary"
                  aria-label={t('sb_edit_aria', { name: s.nameKo })}
                  onClick={() => onEdit(s)}
                >
                  {t('sb_edit')}
                </button>
                <button
                  type="button"
                  className="btn btn--danger"
                  aria-label={t('sb_delete_aria', { name: s.nameKo })}
                  onClick={() => void onDelete(s)}
                >
                  {t('delete_label')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
