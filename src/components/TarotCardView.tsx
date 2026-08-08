import { useRef, useState } from 'react'
import { cardImageUrl, type DrawnCard, getCard } from '../lib/cards'
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
  const card = getCard(cardId)
  const { t } = useApp()
  const dir = isReversed ? t('reversed') : t('upright')
  const [zoomOpen, setZoomOpen] = useState(false)
  // 뷰어를 닫으면 포커스를 열었던 버튼으로 되돌린다. 안 그러면 키보드 위치가 문서 처음으로 튄다.
  const openerRef = useRef<HTMLButtonElement>(null)

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
      <div className="muted" style={{ fontSize: '0.9rem' }}>
        {card.nameEn}
      </div>
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
