import { cardImageUrl, type DrawnCard, getCard } from '../lib/cards'

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
  return (
    <div className="spread-slot">
      {positionLabel && <div className="spread-slot__pos">{positionLabel}</div>}
      <img
        className={`card-img${isReversed ? ' card-img--reversed' : ''}`}
        src={cardImageUrl(card)}
        alt={`${card.nameKo} ${isReversed ? '역방향' : '정방향'}`}
        style={large ? { maxWidth: 280 } : undefined}
      />
      <div style={{ marginTop: 8, fontWeight: 700 }}>{card.nameKo}</div>
      <div className="muted" style={{ fontSize: '0.9rem' }}>
        {card.nameEn}
      </div>
      <span className="dir-label" aria-label={isReversed ? '역방향' : '정방향'}>
        {isReversed ? '역방향' : '정방향'}
      </span>
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
