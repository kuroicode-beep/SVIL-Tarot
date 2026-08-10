// src/components/CardViewer.tsx — 카드 도판을 전체화면으로 확대·대비 강화해 보는 저시력 판독 뷰어
import { useEffect, useId, useRef, useState } from 'react'
import { cardImageUrl, findLocalizedCard, subtitleEn } from '../lib/cards'
import { useApp } from '../context/AppContext'

const ZOOM_MIN = 100
const ZOOM_MAX = 400
const ZOOM_STEP = 25
const CONTRAST_MIN = 100
const CONTRAST_MAX = 250
const CONTRAST_STEP = 10

export function CardViewer({
  cardId,
  isReversed,
  onClose,
}: {
  cardId: string
  isReversed?: boolean
  onClose: () => void
}) {
  const { t, settings } = useApp()
  // 덱에서 빠진 카드면 undefined. 훅 순서를 지키려고 렌더 분기는 훅을 전부 부른 뒤에 한다.
  const card = findLocalizedCard(cardId, settings.locale)
  const uid = useId()
  const [zoom, setZoom] = useState(ZOOM_MIN)
  const [contrast, setContrast] = useState(CONTRAST_MIN)
  const [inverted, setInverted] = useState(false)
  // 역방향 카드를 정방향으로 돌려 읽을 수 있어야 하므로, 원래 방향은 초기값으로만 쓰고 이후는 사용자 조작에 맡긴다.
  const [rotated, setRotated] = useState(Boolean(isReversed))
  const rootRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  // onClose가 인라인 함수로 넘어와도 keydown 리스너가 매 렌더마다 재등록되지 않게 ref로 최신 값만 읽는다.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab') return
      // aria-modal은 스크린리더에만 적용돼, Tab은 화면을 덮은 뷰어 뒤 컨트롤로 그대로 빠져나간다.
      // 보이지 않는 곳에 포커스가 남으면 저시력 사용자가 위치를 잃으므로 순환을 뷰어 안에 가둔다.
      const root = rootRef.current
      if (!root) return
      const items = root.querySelectorAll<HTMLElement>('button, input, [tabindex="0"]')
      const first = items[0]
      const last = items[items.length - 1]
      if (!first || !last) return
      const active = document.activeElement
      const inside = active instanceof HTMLElement && root.contains(active)
      if (e.shiftKey && (!inside || active === first)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (!inside || active === last)) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // 확대 중 뒤 배경까지 스크롤되면 초점을 잃는다. 원래 값으로 되돌려 다른 화면 스크롤을 망가뜨리지 않는다.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // 열리자마자 첫 컨트롤(닫기)로 포커스를 옮겨 키보드 사용자가 오버레이 밖에 남지 않게 한다.
  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  const dirLabel = isReversed ? t('reversed') : t('upright')
  const onOff = (v: boolean) => (v ? t('viewer_on') : t('viewer_off'))
  // invert와 contrast는 순서를 바꿔도 결과가 같다. 대신 반전이 꺼지면 invert(0)을 남기지 않고 문자열에서 빼,
  // 기본 상태에서는 불필요한 필터 합성 레이어가 생기지 않게 한다(확대 시 리페인트 비용).
  const filter = `${inverted ? 'invert(1) ' : ''}contrast(${contrast}%)`

  const reset = () => {
    setZoom(ZOOM_MIN)
    setContrast(CONTRAST_MIN)
    setInverted(false)
    setRotated(Boolean(isReversed))
  }

  // 덱에서 빠진 카드는 확대할 도판이 없다. 진입 경로(TarotCardView)가 이미 막지만,
  // 여기서도 조용히 닫히지 않게 이유를 남긴다.
  if (!card) {
    return (
      <div className="card-viewer" role="dialog" aria-modal="true" aria-label={t('viewer_title')}>
        <div className="card-viewer__bar">
          <p className="error-text" role="alert">
            {t('card_unknown', { id: cardId })}
          </p>
          <button ref={closeRef} type="button" className="btn btn--primary" onClick={onClose}>
            {t('viewer_close')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={rootRef}
      className="card-viewer"
      role="dialog"
      aria-modal="true"
      aria-label={t('viewer_title')}
    >
      <div className="card-viewer__bar">
        {/* 확대하면 그림만 보여 무엇을 보는지 잃는다. 이름·정역 라벨을 상단에 고정으로 남긴다. */}
        <div>
          <div style={{ fontWeight: 700 }}>{card.nameKo}</div>
          <div className="muted" style={{ fontSize: '0.85rem' }}>
            {/* 영어 로케일에서는 부제가 표시 이름과 같아지므로 정·역 라벨만 남긴다. */}
            {subtitleEn(card) ? `${subtitleEn(card)} · ${dirLabel}` : dirLabel}
          </div>
        </div>
        <button ref={closeRef} type="button" className="btn btn--primary" onClick={onClose}>
          {t('viewer_close')}
        </button>
      </div>

      {/* 스테이지 CSS가 justify-content: center라 확대 배율이 커지면 왼쪽으로 넘친 영역은 scrollLeft로 닿을 수 없다.
          safe center는 넘칠 때만 start처럼 동작해 전체를 스크롤로 훑을 수 있게 한다(미지원 브라우저는 값을 무시해 현행 유지). */}
      <div
        className="card-viewer__stage"
        style={{ justifyContent: 'safe center' }}
        tabIndex={0}
        role="group"
        aria-label={t('viewer_stage')}
      >
        <img
          className="card-viewer__img"
          src={cardImageUrl(card)}
          // 영어에서는 이름이 겹쳐 "The Fool The Fool Upright"로 낭독된다. 겹치면 한 번만 읽는다.
          alt={[card.nameKo, subtitleEn(card), dirLabel].filter(Boolean).join(' ')}
          // 배율은 뷰포트에 맞춘 기본 크기에 곱한다. 넘치는 만큼은 스테이지가 스크롤로 받는다.
          style={{
            width: `calc(min(62vh, 86vw) * ${zoom / 100})`,
            maxWidth: 'none',
            filter,
            transform: rotated ? 'rotate(180deg)' : 'none',
          }}
        />
      </div>

      <div className="card-viewer__controls">
        <div>
          <label className="label" htmlFor={`${uid}-zoom`}>
            {t('viewer_zoom')} <span className="mono">{zoom}%</span>
          </label>
          <input
            id={`${uid}-zoom`}
            className="field"
            type="range"
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            step={ZOOM_STEP}
            value={zoom}
            aria-valuetext={`${zoom}%`}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
        </div>

        <div>
          <label className="label" htmlFor={`${uid}-contrast`}>
            {t('viewer_contrast')} <span className="mono">{contrast}%</span>
          </label>
          <input
            id={`${uid}-contrast`}
            className="field"
            type="range"
            min={CONTRAST_MIN}
            max={CONTRAST_MAX}
            step={CONTRAST_STEP}
            value={contrast}
            aria-valuetext={`${contrast}%`}
            onChange={(e) => setContrast(Number(e.target.value))}
          />
        </div>

        {/* 켜짐 여부를 색이 아니라 aria-pressed + ✓ 글리프(.chip.is-on) + 켬/끔 텍스트로 알린다. */}
        <div className="chip-row">
          <button
            type="button"
            className={`chip${inverted ? ' is-on' : ''}`}
            aria-pressed={inverted}
            onClick={() => setInverted((v) => !v)}
          >
            {t('viewer_invert')} {onOff(inverted)}
          </button>
          <button
            type="button"
            className={`chip${rotated ? ' is-on' : ''}`}
            aria-pressed={rotated}
            onClick={() => setRotated((v) => !v)}
          >
            {t('viewer_rotate')} {onOff(rotated)}
          </button>
          <button type="button" className="chip" onClick={reset}>
            {t('viewer_reset')}
          </button>
        </div>

        <p className="muted" style={{ fontSize: '0.85rem', margin: 0 }}>
          {t('viewer_hint')}
        </p>
      </div>
    </div>
  )
}
