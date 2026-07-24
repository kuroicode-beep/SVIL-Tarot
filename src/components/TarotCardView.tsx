import { cardImageUrl, type DrawnCard, getCard } from '../lib/cards'
import { useApp } from '../context/AppContext'

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
