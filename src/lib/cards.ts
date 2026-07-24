export type TarotCard = {
  id: string
  deckNumber: number
  arcana: 'major' | 'minor'
  suit?: string
  nameKo: string
  nameEn: string
  file: string
  upright: string
  reversed: string
  lesson: string
}

import cardsJson from '../data/cards.json'

export const allCards = cardsJson as TarotCard[]

const byId = new Map(allCards.map((c) => [c.id, c]))

export function getCard(id: string): TarotCard {
  const card = byId.get(id)
  if (!card) throw new Error(`Unknown card: ${id}`)
  return card
}

// Vite base(예: 서브패스 배포) 아래에서도 덱 이미지 경로가 깨지지 않도록 BASE_URL을 붙인다.
export function deckUrl(file: string): string {
  return `${import.meta.env.BASE_URL}deck/${file}`
}

export function cardImageUrl(card: TarotCard | string): string {
  const file = typeof card === 'string' ? getCard(card).file : card.file
  return deckUrl(file)
}

export type DrawnCard = {
  id: string
  nameKo: string
  nameEn: string
  isReversed: boolean
  positionKey?: string
  positionLabel?: string
}

export function drawCards(count: number, positionKeys?: { key: string; labelKo: string }[]): DrawnCard[] {
  const pool = [...allCards]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, count).map((card, i) => ({
    id: card.id,
    nameKo: card.nameKo,
    nameEn: card.nameEn,
    isReversed: Math.random() < 0.5,
    positionKey: positionKeys?.[i]?.key,
    positionLabel: positionKeys?.[i]?.labelKo,
  }))
}

export function formatDrawnForPrompt(cards: DrawnCard[]): string {
  return cards
    .map((c) => {
      const meta = getCard(c.id)
      const dir = c.isReversed ? '역방향' : '정방향'
      const meaning = c.isReversed ? meta.reversed : meta.upright
      const pos = c.positionLabel ? `[${c.positionLabel}] ` : ''
      return `${pos}${c.nameKo}(${c.nameEn}) ${dir} — ${meaning}`
    })
    .join('\n')
}
