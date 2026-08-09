// src/lib/stats.ts — 저장된 리딩 기록(HistoryEntry)을 순수 계산으로 집계하는 통계 모듈
import { allCards } from './cards'
import type { HistoryEntry, ReadingOutcome } from '../services/history'

/** 기간 필터. 0은 '며칠'이 아니라 '전체 기간'을 뜻한다. */
export type Period = 7 | 30 | 90 | 0

/** 화면 세그먼트 순서까지 여기서 고정한다 — 기간 목록이 두 곳에서 어긋나지 않게. */
export const PERIODS: Period[] = [7, 30, 90, 0]

export type TopCard = {
  cardId: string
  count: number
  /** 78장이 균등하게 나왔다면 기대되는 등장 횟수(= totalCards / 78). */
  expected: number
  /** count / expected. 1보다 크면 평균보다 자주 나왔다는 뜻. 소수 첫째 자리 반올림. */
  ratio: number
}

export type BestCard = {
  cardId: string
  /** 0~100 정수. 일부 맞음은 0.5로 계산한다. */
  hitRate: number
  samples: number
}

export type ReadingStats = {
  totalReadings: number
  totalCards: number
  /** 최다 등장 카드(스토커 카드) 상위 N. 78장 균등 분포 대비 배수도 낸다. */
  topCards: TopCard[]
  suitCounts: Record<string, number>
  majorCount: number
  majorPct: number
  reversedCount: number
  reversedPct: number
  /** 사후 결과 분포. outcome 기록이 있는 리딩만 센다. */
  outcomes: { hit: number; partial: number; miss: number; recorded: number }
  /** 결과가 좋았던 카드 — 그 카드가 들어간 리딩의 적중률. 표본 3건 이상만. */
  bestCards: BestCard[]
}

/** 수트 표시 순서를 데이터가 아닌 여기서 고정한다(analyze.ts와 동일 규칙). */
export const SUIT_ORDER = ['cup', 'wand', 'sword', 'pentacle'] as const

const DAY_MS = 86_400_000

/** 덱 크기(78). 균등 분포 기준선의 분모이자 '표본이 충분한가'의 기준이다.
 *  덱이 비어 있어도 0으로 나누지 않도록 최소 1을 보장한다. */
export const DECK_SIZE = Math.max(allCards.length, 1)

const TOP_CARD_LIMIT = 10
const BEST_CARD_LIMIT = 5

/** 표본이 1~2건이면 적중률이 0%/100%로만 튀어 정보가 되지 않는다. 3건부터 낸다. */
const BEST_CARD_MIN_SAMPLES = 3

/** '일부 맞음'을 0으로 버리면 실제 실력보다 낮게, 1로 세면 높게 나온다. 절반으로 둔다. */
const OUTCOME_WEIGHT: Record<ReadingOutcome, number> = { hit: 1, partial: 0.5, miss: 0 }

// getCard는 미등록 id에 throw한다. 옛 기록에 남은 알 수 없는 카드로 통계 화면이 통째로
// 죽지 않도록 throw하지 않는 조회 맵을 따로 둔다(analyze.ts와 같은 이유).
const metaById = new Map(allCards.map((c) => [c.id, c]))

/** 퍼센트는 화면에서 정수로만 쓰이고, 분모 0에서 NaN이 새지 않게 막는다. */
function pct(part: number, total: number): number {
  if (!(total > 0)) return 0
  return Math.round((part / total) * 100)
}

function round(value: number, digits: number): number {
  if (!Number.isFinite(value)) return 0
  const f = 10 ** digits
  return Math.round(value * f) / f
}

/**
 * 기간 안에 들어오면서 '카드를 뽑은' 기록만 남긴다.
 * 사주·작명처럼 카드가 없는 기록까지 세면 리딩 수와 카드 수의 관계가 어긋나
 * 아래 모든 비율의 분모가 흐려진다.
 */
function scopeEntries(entries: HistoryEntry[], period: Period, now: Date): HistoryEntry[] {
  const cutoff = period === 0 ? null : now.getTime() - period * DAY_MS
  return entries.filter((e) => {
    if (!e.cards || e.cards.length === 0) return false
    if (cutoff === null) return true
    // createdAt이 손상돼 파싱되지 않으면 Date.parse가 NaN이라 비교가 항상 false가 된다.
    const time = Date.parse(e.createdAt)
    return Number.isFinite(time) && time >= cutoff
  })
}

export function computeStats(
  entries: HistoryEntry[],
  period: Period,
  now: Date = new Date(),
): ReadingStats {
  const scoped = scopeEntries(entries, period, now)

  const counts = new Map<string, number>()
  // 네 수트를 항상 0으로 깔아 둔다. 없는 수트가 목록에서 사라지면 행 수가 바뀌어
  // 기간을 바꿀 때마다 화면이 흔들린다.
  const suitCounts: Record<string, number> = {}
  for (const suit of SUIT_ORDER) suitCounts[suit] = 0

  let totalCards = 0
  let majorCount = 0
  let reversedCount = 0

  const outcomes = { hit: 0, partial: 0, miss: 0, recorded: 0 }
  /** 카드별 사후 결과 누적 — samples는 그 카드가 들어간 '결과 기록된 리딩' 수. */
  const outcomeByCard = new Map<string, { samples: number; score: number }>()

  for (const entry of scoped) {
    const cards = entry.cards ?? []

    for (const drawn of cards) {
      totalCards++
      if (drawn.isReversed) reversedCount++
      counts.set(drawn.id, (counts.get(drawn.id) ?? 0) + 1)
      const meta = metaById.get(drawn.id)
      if (!meta) continue
      if (meta.arcana === 'major') majorCount++
      else if (meta.suit && meta.suit in suitCounts) suitCounts[meta.suit] += 1
    }

    const outcome = entry.outcome
    if (!outcome) continue
    outcomes.recorded++
    outcomes[outcome] += 1

    // 한 리딩 안에 같은 카드가 두 번 들어가도 표본은 1건이다.
    const weight = OUTCOME_WEIGHT[outcome] ?? 0
    for (const id of new Set(cards.map((c) => c.id))) {
      const acc = outcomeByCard.get(id) ?? { samples: 0, score: 0 }
      acc.samples += 1
      acc.score += weight
      outcomeByCard.set(id, acc)
    }
  }

  // 커뮤니티 비교는 서버가 있어야 해서 하지 않는다. 대신 78장 균등 분포를 기준선으로 쓴다.
  const expectedRaw = totalCards / DECK_SIZE
  const expected = round(expectedRaw, 2)

  const topCards: TopCard[] = [...counts.entries()]
    .map(([cardId, count]) => ({
      cardId,
      count,
      expected,
      ratio: expectedRaw > 0 ? round(count / expectedRaw, 1) : 0,
    }))
    // 동점일 때 순서가 흔들리면 새로고침마다 순위가 달라 보인다. id로 고정한다.
    .sort((a, b) => b.count - a.count || a.cardId.localeCompare(b.cardId))
    .slice(0, TOP_CARD_LIMIT)

  const bestCards: BestCard[] = [...outcomeByCard.entries()]
    .filter(([, v]) => v.samples >= BEST_CARD_MIN_SAMPLES)
    .map(([cardId, v]) => ({ cardId, hitRate: pct(v.score, v.samples), samples: v.samples }))
    .sort(
      (a, b) => b.hitRate - a.hitRate || b.samples - a.samples || a.cardId.localeCompare(b.cardId),
    )
    .slice(0, BEST_CARD_LIMIT)

  return {
    totalReadings: scoped.length,
    totalCards,
    topCards,
    suitCounts,
    majorCount,
    majorPct: pct(majorCount, totalCards),
    reversedCount,
    reversedPct: pct(reversedCount, totalCards),
    outcomes,
    bestCards,
  }
}
