// src/lib/cards.ts — 78장 타로 덱 데이터 접근·로케일 오버레이·드로우·프롬프트 포맷

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
import cardsI18nJson from '../data/cards.i18n.json'

export const allCards = cardsJson as TarotCard[]

const byId = new Map(allCards.map((c) => [c.id, c]))

export function getCard(id: string): TarotCard {
  const card = byId.get(id)
  if (!card) throw new Error(`Unknown card: ${id}`)
  return card
}

// ---------- 로케일 오버레이 ----------

/** cards.i18n.json 한 항목. 한국어 원본(cards.json)에 덮어씌울 번역 텍스트다. */
type CardI18nEntry = {
  name: string
  upright: string
  reversed: string
  lesson: string
}

// JSON 모듈은 리터럴 타입으로 추론돼 인덱스 시그니처가 없다. 언어·카드 id로 자유롭게
// 조회하려면 Record로 좁혀야 하므로 unknown을 한 번 거쳐 캐스팅한다.
const cardsI18n = cardsI18nJson as unknown as Record<string, Record<string, CardI18nEntry>>

/**
 * 로케일 문자열을 언어 코드로 정규화한다.
 * localStorage나 브라우저에서 'en-US' 'zh_CN' 처럼 지역 접미사가 붙어 들어와도
 * 'en' 'zh' 테이블을 찾도록 앞부분만 소문자로 잘라 쓴다.
 */
function normalizeLocale(locale: string): string {
  if (typeof locale !== 'string') return 'ko'
  const lang = locale.trim().toLowerCase().split(/[-_]/)[0]
  return lang || 'ko'
}

/**
 * 로케일을 적용한 카드. 번역이 없으면 한국어 원본으로 폴백한다.
 *
 * 화면들이 이미 `card.nameKo`로 이름을 그리고 있어서, 번역된 이름도 같은 `nameKo`
 * 자리에 넣어 돌려준다(필드 이름은 '한국어'지만 실제 의미는 '표시용 이름'). `nameEn`은
 * 원문 영어 이름 그대로 두어 부제·검색·이미지 alt에서 계속 쓸 수 있게 한다.
 *
 * 없는 카드 id에는 `getCard`와 똑같이 `Unknown card: <id>` 에러를 던진다(동작 일관성).
 */
export function getLocalizedCard(id: string, locale: string): TarotCard {
  const base = getCard(id)
  const lang = normalizeLocale(locale)
  if (lang === 'ko') return base
  const entry = cardsI18n[lang]?.[id]
  if (!entry) return base
  return {
    ...base,
    nameKo: entry.name || base.nameKo,
    upright: entry.upright || base.upright,
    reversed: entry.reversed || base.reversed,
    lesson: entry.lesson || base.lesson,
  }
}

/** 카드 객체에서 해당 로케일의 표시 이름만 뽑는다. 번역이 없으면 한국어 원본 이름. */
export function localizedName(card: TarotCard, locale: string): string {
  const lang = normalizeLocale(locale)
  if (lang === 'ko') return card.nameKo
  return cardsI18n[lang]?.[card.id]?.name || card.nameKo
}

// 사전·통계처럼 78장을 통째로 그리는 화면이 렌더마다 78개 객체를 새로 만들지 않도록
// 언어별로 한 번만 만들어 재사용한다.
const localizedDeckCache = new Map<string, TarotCard[]>()

/** 로케일을 적용한 78장 전체. 언어별로 캐시하므로 매 렌더 호출해도 안전하다. */
export function getLocalizedCards(locale: string): TarotCard[] {
  const lang = normalizeLocale(locale)
  if (lang === 'ko') return allCards
  const cached = localizedDeckCache.get(lang)
  if (cached) return cached
  const deck = allCards.map((c) => getLocalizedCard(c.id, lang))
  localizedDeckCache.set(lang, deck)
  return deck
}

// ---------- 이미지 ----------

// Vite base(예: 서브패스 배포) 아래에서도 덱 이미지 경로가 깨지지 않도록 BASE_URL을 붙인다.
export function deckUrl(file: string): string {
  return `${import.meta.env.BASE_URL}deck/${file}`
}

export function cardImageUrl(card: TarotCard | string): string {
  const file = typeof card === 'string' ? getCard(card).file : card.file
  return deckUrl(file)
}

// ---------- 드로우 ----------

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

// LLM 프롬프트 전용이라 로케일과 무관하게 한국어 원본을 쓴다.
// 프롬프트 언어가 사용자 로케일마다 흔들리면 모델이 뽑는 리딩의 품질·형식이 같이
// 흔들리기 때문에, 입력은 한국어로 고정하고 출력 언어만 프롬프트 지시로 다룬다.
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
