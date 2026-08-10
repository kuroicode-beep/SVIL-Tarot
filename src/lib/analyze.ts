// src/lib/analyze.ts — 뽑힌 카드 배열을 규칙 연산만으로 진단하는 스프레드 분석기
import { allCards, type DrawnCard } from './cards'

export type SpreadAnalysis = {
  total: number
  majorCount: number
  majorPct: number
  reversedCount: number
  reversedPct: number
  /** 수트별 장수. 마이너가 없으면 빈 객체. 키는 카드 데이터의 원본 수트 id(cup/wand/sword/pentacle). */
  suitCounts: Record<string, number>
  /** 가장 편중된 수트. 편중이 없으면 null. suit는 원본 수트 id다. */
  dominantSuit: { suit: string; count: number } | null
  /** i18n 키 + 파라미터 형태의 진단 항목. 문구 자체는 담지 않는다.
   *  params는 translate(locale, key, params)에 그대로 넘길 수 있게 맞춰져 있다.
   *  paramKeys에 든 항목은 '값이 아니라 사전 키'라서, 화면이 t()로 옮긴 뒤 넣어야 한다
   *  (noteParams 헬퍼를 쓴다). 수트 이름이 여기 해당한다. */
  notes: Array<{
    key: string
    params: Record<string, string | number>
    paramKeys?: Record<string, string>
  }>
}

// 판정 임계값을 상수로 모아 둔다 — 규칙이 바뀔 때 한 곳만 고치면 되도록.
const MAJOR_THRESHOLD = 0.5
const REVERSED_THRESHOLD = 0.6
const SUIT_THRESHOLD = 0.4
const SUIT_MIN_COUNT = 2

// 동점일 때 어느 수트를 고를지 흔들리지 않게, 비교 순서를 데이터가 아닌 여기서 고정한다.
const SUIT_ORDER = ['cup', 'wand', 'sword', 'pentacle']

// LLM 프롬프트(analysisToPrompt)용 한국어 표기. 프롬프트는 로케일과 무관하게 한국어로 고정한다.
const SUIT_LABELS: Record<string, string> = {
  cup: '컵',
  wand: '완드',
  sword: '소드',
  pentacle: '펜타클',
}

// 화면용 수트 이름은 사전 키로 넘긴다. 사전(dict_suit_*)에 5개 언어가 모두 있다.
const SUIT_I18N: Record<string, string> = {
  cup: 'dict_suit_cup',
  wand: 'dict_suit_wand',
  sword: 'dict_suit_sword',
  pentacle: 'dict_suit_pentacle',
}

// LLM에게 수트 편중의 의미까지 알려 주려고, 라벨과 별개로 짧은 힌트를 붙인다.
const SUIT_HINTS: Record<string, string> = {
  cup: '감정 이슈',
  wand: '행동·의욕 이슈',
  sword: '사고·갈등 이슈',
  pentacle: '현실·물질 이슈',
}

// getCard는 미등록 id에 throw한다. 저장된 옛 기록을 분석할 때 화면이 통째로 죽지 않도록
// 여기서는 throw하지 않는 조회 맵을 따로 둔다.
const metaById = new Map(allCards.map((c) => [c.id, c]))

// 퍼센트는 UI·프롬프트 양쪽에서 정수로만 쓰이고, 0장일 때 NaN이 새지 않게 막는다.
function pct(part: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((part / total) * 100)
}

export function analyzeSpread(cards: DrawnCard[]): SpreadAnalysis {
  const total = cards.length
  let majorCount = 0
  let reversedCount = 0
  const suitCounts: Record<string, number> = {}

  for (const drawn of cards) {
    if (drawn.isReversed) reversedCount++
    const meta = metaById.get(drawn.id)
    if (!meta) continue
    if (meta.arcana === 'major') {
      majorCount++
    } else if (meta.suit) {
      suitCounts[meta.suit] = (suitCounts[meta.suit] ?? 0) + 1
    }
  }

  const majorPct = pct(majorCount, total)
  const reversedPct = pct(reversedCount, total)

  // 최다 수트를 먼저 고른 뒤 임계값을 적용한다 — dominantSuit가 null이면 analyze_suit도 없다는 뜻.
  let topSuit: string | null = null
  let topCount = 0
  for (const suit of SUIT_ORDER) {
    const count = suitCounts[suit] ?? 0
    if (count > topCount) {
      topSuit = suit
      topCount = count
    }
  }
  const isDominant =
    topSuit !== null && topCount >= SUIT_MIN_COUNT && total > 0 && topCount / total >= SUIT_THRESHOLD
  const dominantSuit = isDominant && topSuit ? { suit: topSuit, count: topCount } : null

  const notes: SpreadAnalysis['notes'] = []
  if (total > 0 && majorCount / total >= MAJOR_THRESHOLD) {
    notes.push({ key: 'analyze_major', params: { n: majorCount, total, pct: majorPct } })
  }
  if (total > 0 && reversedCount / total >= REVERSED_THRESHOLD) {
    notes.push({ key: 'analyze_reversed', params: { n: reversedCount, pct: reversedPct } })
  }
  if (dominantSuit) {
    notes.push({
      key: 'analyze_suit',
      // suit는 값이 아니라 사전 키다 — 화면이 noteParams로 옮겨 넣는다.
      params: { suit: dominantSuit.suit, n: dominantSuit.count },
      paramKeys: SUIT_I18N[dominantSuit.suit] ? { suit: SUIT_I18N[dominantSuit.suit] } : undefined,
    })
  }
  // 진단이 하나도 없을 때 목록이 비면 화면이 텅 비어 보여서, 대신 "편중 없음"을 명시한다.
  if (notes.length === 0) {
    notes.push({ key: 'analyze_none', params: {} })
  }

  return {
    total,
    majorCount,
    majorPct,
    reversedCount,
    reversedPct,
    suitCounts,
    dominantSuit,
    notes,
  }
}

/**
 * 진단 항목의 파라미터를 화면 언어로 옮긴다.
 * paramKeys에 든 항목은 사전 키이므로 t()를 한 번 더 거쳐야 한다 — 안 그러면 수트 이름만
 * 영어 화면에 'cup'(또는 한국어 '컵')으로 남는다.
 */
export function noteParams(
  note: SpreadAnalysis['notes'][number],
  t: (key: string) => string,
): Record<string, string | number> {
  if (!note.paramKeys) return note.params
  const out: Record<string, string | number> = { ...note.params }
  for (const [field, key] of Object.entries(note.paramKeys)) out[field] = t(key)
  return out
}

/** LLM 프롬프트에 넣을 한 문단 요약. 이건 모델용이라 한국어 평문이어도 된다. */
export function analysisToPrompt(a: SpreadAnalysis): string {
  // 카드가 없으면 빈 힌트를 프롬프트 앞에 붙이지 않도록 빈 문자열을 돌려준다.
  if (a.total === 0) return ''

  const parts: string[] = []
  if (a.majorCount / a.total >= MAJOR_THRESHOLD) {
    parts.push(`메이저 ${a.majorCount}/${a.total}장(${a.majorPct}%) — 큰 전환기 신호.`)
  }
  if (a.reversedCount / a.total >= REVERSED_THRESHOLD) {
    parts.push(`역방향 ${a.reversedCount}장(${a.reversedPct}%) — 지연·내면화 경향.`)
  }
  if (a.dominantSuit) {
    const label = SUIT_LABELS[a.dominantSuit.suit] ?? a.dominantSuit.suit
    const hint = SUIT_HINTS[a.dominantSuit.suit]
    parts.push(`${label} 편중 ${a.dominantSuit.count}장${hint ? ` — ${hint}` : ''}.`)
  }
  if (parts.length === 0) {
    parts.push(`특이한 편중 없음 — 메이저 ${a.majorCount}장, 역방향 ${a.reversedCount}장의 균형 배열.`)
  }
  return parts.join(' ')
}
