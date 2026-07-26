/** 간이 만세력·성명 헬퍼 (전문 엔진 아님 — AI 풀이 보조 요약용) */

const STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const
const BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'] as const
const STEM_ELEM = ['목', '목', '화', '화', '토', '토', '금', '금', '수', '수'] as const
const BRANCH_ELEM = ['수', '토', '목', '목', '토', '화', '화', '토', '금', '금', '토', '수'] as const

export function yearPillar(year: number): { ganji: string; stem: string; branch: string; element: string } {
  const stemIdx = (year - 4) % 10
  const branchIdx = (year - 4) % 12
  const stem = STEMS[(stemIdx + 10) % 10]
  const branch = BRANCHES[(branchIdx + 12) % 12]
  return {
    ganji: `${stem}${branch}`,
    stem,
    branch,
    element: `${STEM_ELEM[(stemIdx + 10) % 10]}·${BRANCH_ELEM[(branchIdx + 12) % 12]}`,
  }
}

export function monthPillarApprox(year: number, month: number): { ganji: string; note: string } {
  // 절기 미반영 간이: 인월=1월 근사
  const yearStem = (year - 4) % 10
  const monthBranchIdx = (month + 1) % 12 // 1월→인(2) 근사 보정
  const startStem = [2, 4, 6, 8, 0][yearStem % 5] // 갑기년 병인월 규칙 근사
  const stemIdx = (startStem + month - 1) % 10
  const branch = BRANCHES[(monthBranchIdx + 12) % 12]
  const stem = STEMS[(stemIdx + 10) % 10]
  return {
    ganji: `${stem}${branch}`,
    note: '절기 미반영 간이 월주(참고용)',
  }
}

export function dayPillarApprox(isoDate: string): { ganji: string; note: string } {
  // 기준일 근사: 1900-01-01 ≈ 갑술 로 두고 일수 가산 (완전 정확하지 않음)
  const base = Date.UTC(1900, 0, 1)
  const [y, m, d] = isoDate.split('-').map(Number)
  if (!y || !m || !d) return { ganji: '—', note: '날짜 오류' }
  const cur = Date.UTC(y, m - 1, d)
  const days = Math.floor((cur - base) / 86400000)
  const stemIdx = (0 + days) % 10
  const branchIdx = (10 + days) % 12 // 갑술=0,10
  return {
    ganji: `${STEMS[(stemIdx + 10) % 10]}${BRANCHES[(branchIdx + 12) % 12]}`,
    note: '간이 일주(참고용, 전문 만세력과 다를 수 있음)',
  }
}

export type SajuSummary = {
  birthDate: string
  birthTime: string
  gender: string
  calendarType: string
  year: ReturnType<typeof yearPillar>
  month: ReturnType<typeof monthPillarApprox>
  day: ReturnType<typeof dayPillarApprox>
  textBlock: string
}

export function buildSajuSummary(opts: {
  birthDate: string
  birthTime?: string
  gender?: string
  calendarType?: string
}): SajuSummary {
  const [y, m] = opts.birthDate.split('-').map(Number)
  const year = yearPillar(y)
  const month = monthPillarApprox(y, m)
  const day = dayPillarApprox(opts.birthDate)
  const textBlock = [
    `양력(입력): ${opts.birthDate} ${opts.birthTime || '(시간 미상)'}`,
    `달력: ${opts.calendarType === 'lunar' ? '음력 입력(환산 미적용·참고)' : '양력'}`,
    `성별: ${opts.gender || '미지정'}`,
    `년주: ${year.ganji} (${year.element})`,
    `월주(간이): ${month.ganji} — ${month.note}`,
    `일주(간이): ${day.ganji} — ${day.note}`,
  ].join('\n')
  return {
    birthDate: opts.birthDate,
    birthTime: opts.birthTime || '',
    gender: opts.gender || '',
    calendarType: opts.calendarType || 'solar',
    year,
    month,
    day,
    textBlock,
  }
}

/** 한글 초성·획수 근사 (성명학 보조) */
const HANGUL_STROKES: Record<string, number> = {
  ㄱ: 2, ㄲ: 4, ㄴ: 2, ㄷ: 3, ㄸ: 6, ㄹ: 5, ㅁ: 4, ㅂ: 4, ㅃ: 8,
  ㅅ: 2, ㅆ: 4, ㅇ: 1, ㅈ: 3, ㅉ: 6, ㅊ: 4, ㅋ: 3, ㅌ: 4, ㅍ: 4, ㅎ: 3,
  ㅏ: 2, ㅐ: 3, ㅑ: 3, ㅒ: 4, ㅓ: 2, ㅔ: 3, ㅕ: 3, ㅖ: 4, ㅗ: 2,
  ㅘ: 4, ㅙ: 5, ㅚ: 3, ㅛ: 3, ㅜ: 2, ㅝ: 4, ㅞ: 5, ㅟ: 3, ㅠ: 3,
  ㅡ: 1, ㅢ: 2, ㅣ: 1,
}

function hangulJamo(ch: string): string[] {
  const code = ch.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return [ch]
  const n = code - 0xac00
  const cho = [
    'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
  ][Math.floor(n / 588)]
  const jung = [
    'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ',
  ][Math.floor((n % 588) / 28)]
  const jongList = [
    '', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
  ]
  const jong = jongList[n % 28]
  return jong ? [cho, jung, jong] : [cho, jung]
}

export function estimateHangulStrokes(name: string): {
  total: number
  perChar: { char: string; strokes: number }[]
  elementHint: string
} {
  const perChar: { char: string; strokes: number }[] = []
  let total = 0
  for (const ch of name.replace(/\s/g, '')) {
    let s = 0
    for (const j of hangulJamo(ch)) {
      s += HANGUL_STROKES[j] ?? 2
    }
    if (s === 0) s = 3
    perChar.push({ char: ch, strokes: s })
    total += s
  }
  const elems = ['목', '화', '토', '금', '수']
  const elementHint = elems[total % 5]
  return { total, perChar, elementHint }
}
