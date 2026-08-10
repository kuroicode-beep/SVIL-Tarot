// src/components/TarotCardView.tsx — 카드 한 장 표시(도판·이름·정역 라벨·확대 뷰어 진입)
import { useRef, useState } from 'react'
import { cardImageUrl, type DrawnCard, findLocalizedCard, subtitleEn } from '../lib/cards'
import { useApp } from '../context/AppContext'
import { CardViewer } from './CardViewer'

export function TarotCardView({
  cardId,
  isReversed,
  positionLabel,
  large,
}: {
  cardId: string
  isReversed?: boolean
  positionLabel?: string
  large?: boolean
}) {
  const { t, settings } = useApp()
  // 화면 표시용이라 로케일을 적용한다. LLM 프롬프트로 나가는 텍스트는 여기서 만들지 않는다.
  // throw하지 않는 조회 — 옛 기록의 낯선 카드 id 하나로 기록 화면 전체가 죽지 않게 한다.
  const card = findLocalizedCard(cardId, settings.locale)
  const dir = isReversed ? t('reversed') : t('upright')
  const [zoomOpen, setZoomOpen] = useState(false)
  // 뷰어를 닫으면 포커스를 열었던 버튼으로 되돌린다. 안 그러면 키보드 위치가 문서 처음으로 튄다.
  const openerRef = useRef<HTMLButtonElement>(null)

  // 덱에서 빠진 카드. 자리는 남기고 왜 그림이 없는지 글자로 알린다(빈 칸이면 고장으로 읽힌다).
  if (!card) {
    return (
      <div className="spread-slot">
        {positionLabel && <div className="spread-slot__pos">{positionLabel}</div>}
        <p className="muted">{t('card_unknown', { id: cardId })}</p>
        <span className="dir-label" aria-label={dir}>
          {dir}
        </span>
      </div>
    )
  }

  return (
    <div className="spread-slot">
      {positionLabel && <div className="spread-slot__pos">{positionLabel}</div>}
      <img
        className={`card-img${isReversed ? ' card-img--reversed' : ''}`}
        src={cardImageUrl(card)}
        alt={`${card.nameKo} ${dir}`}
        style={large ? { maxWidth: 280 } : undefined}
      />
      <div style={{ marginTop: 8, fontWeight: 700 }}>{card.nameKo}</div>
      {/* 영어 로케일에서는 표시 이름이 곧 영어 원명이라 부제를 그리면 같은 글자가 두 번 나온다. */}
      {subtitleEn(card) && (
        <div className="muted" style={{ fontSize: '0.9rem' }}>
          {subtitleEn(card)}
        </div>
      )}
      <span className="dir-label" aria-label={dir}>
        {dir}
      </span>
      {/* 220px 도판으로는 저시력 사용자가 그림을 판독할 수 없다. 확대·대비 강화 뷰어로 넘어가는 통로. */}
      <button
        ref={openerRef}
        type="button"
        className="btn"
        style={{ marginTop: 8 }}
        aria-label={`${card.nameKo} ${t('viewer_open')}`}
        onClick={() => setZoomOpen(true)}
      >
        {t('viewer_open')}
      </button>
      {zoomOpen && (
        <CardViewer
          cardId={cardId}
          isReversed={isReversed}
          onClose={() => {
            setZoomOpen(false)
            openerRef.current?.focus()
          }}
        />
      )}
    </div>
  )
}

export function SpreadCards({ cards }: { cards: DrawnCard[] }) {
  // hasCard로 미리 거르지 않는다 — 없는 카드도 TarotCardView가 자리와 사유를 보여 준다.
  return (
    <div className="spread-row">
      {cards.map((c) => (
        <TarotCardView
          key={`${c.id}-${c.positionKey ?? ''}`}
          cardId={c.id}
          isReversed={c.isReversed}
          positionLabel={c.positionLabel}
        />
      ))}
    </div>
  )
}
