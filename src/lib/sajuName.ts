// src/lib/sajuName.ts — 간이 만세력·성명 헬퍼 (전문 엔진 아님 — AI 풀이 보조 요약용)

const STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const
const BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'] as const
const STEM_ELEM = ['목', '목', '화', '화', '토', '토', '금', '금', '수', '수'] as const
const BRANCH_ELEM = ['수', '토', '목', '목', '토', '화', '화', '토', '금', '금', '토', '수'] as const

/** 경고 문구는 화면마다 언어가 달라야 하므로 텍스트 대신 i18n 키만 넘긴다 */
export const SAJU_WARN = {
  lunarNotConverted: 'saju_warn_lunar_not_converted',
  hourMissing: 'saju_warn_hour_missing',
  solarTermBoundary: 'saju_warn_solar_term_boundary',
  lateZiHour: 'saju_warn_late_zi_hour',
} as const

/** 입춘 날짜(KST) 표 — 1900~2060, 한 해당 한 글자로 "2월 며칠"을 담는다.
 *  "기본 2/4 + 몇 해만 2/3" 근사는 1902~1984의 38개 해(실제 2/5)에서 연주를 한 해 앞당겨 틀린다.
 *  예: 1984-02-04는 실제 입춘(2/5 00:24 KST) 전이라 계해년인데 근사로는 갑자년이 된다. */
const LICHUN_START_YEAR = 1900
const LICHUN_DAYS = [
  '4455545554555455544554455445544554455445', // 1900~1939
  '5445544554455444544454445444544454445444', // 1940~1979
  '5444544444444444444444444444444444444444', // 1980~2019
  '4344434443444344434443444344434443444334', // 2020~2059
  '4', // 2060
].join('')

// 표 밖의 해는 근거가 없어 최빈값 2/4로 두되, 아래 경계 note가 2/3~2/5에 항상 붙는다
function lichunDay(year: number): number {
  const ch = LICHUN_DAYS[year - LICHUN_START_YEAR]
  return ch ? Number(ch) : 4
}

// 음수 나머지를 피하려고 항상 양수로 정규화한다
function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}

/** 연주는 1/1이 아니라 입춘에 바뀌므로, 입춘 이전 출생은 전년도 간지를 쓴다.
 *  월·일을 넘기지 않으면 예전처럼 양력 연도 그대로 계산한다(하위 호환). */
export function yearPillar(
  year: number,
  month?: number,
  day?: number,
): { ganji: string; stem: string; branch: string; element: string; note: string } {
  let effYear = year
  let note = ''
  if (month && day) {
    const lichun = lichunDay(year)
    // 1월 전체와 입춘 전 2월 초는 아직 전년도 간지다
    if (month === 1 || (month === 2 && day < lichun)) effYear = year - 1
    // 절입은 시각 단위라 경계 ±1일은 뒤집힐 수 있어 확인 요청을 남긴다
    if (month === 2 && Math.abs(day - lichun) <= 1) {
      note = '입춘 경계라 실제 절입 시각 확인 필요'
    }
  }
  const stemIdx = mod(effYear - 4, 10)
  const branchIdx = mod(effYear - 4, 12)
  const stem = STEMS[stemIdx]
  const branch = BRANCHES[branchIdx]
  return {
    ganji: `${stem}${branch}`,
    stem,
    branch,
    element: `${STEM_ELEM[stemIdx]}·${BRANCH_ELEM[branchIdx]}`,
    note,
  }
}

/** 월주 근사 — 인월은 양력 1월이 아니라 2월(입춘 이후)이므로 지지는 월 번호와 그대로 맞물린다.
 *  1월(축월)은 절기상 전년도에 속해 연간(年干)을 한 해 당겨서 월간을 뽑는다. */
export function monthPillarApprox(
  year: number,
  month: number,
  day?: number,
): { ganji: string; stem: string; branch: string; note: string } {
  // 입춘 전 2월 초는 아직 축월이라 1월과 같게 취급한다
  const m = day && month === 2 && day < lichunDay(year) ? 1 : month
  const baseYear = m === 1 ? year - 1 : year
  const yearStem = mod(baseYear - 4, 10)
  const branchIdx = m % 12 // 2월→인(2), 12월→자(0), 1월→축(1)
  const startStem = [2, 4, 6, 8, 0][yearStem % 5] // 갑기년 병인두 규칙
  const order = mod(m - 2, 12) // 인월을 0번째로 둔 순서
  const stemIdx = (startStem + order) % 10
  const stem = STEMS[stemIdx]
  const branch = BRANCHES[branchIdx]
  return {
    ganji: `${stem}${branch}`,
    stem,
    branch,
    note: '절기 근사 월주(월초 절입 미반영, 참고용)',
  }
}

/** 일주 — 1900-01-01 = 갑술 기준으로 일수 가산(2000-01-01 무오로 검산됨) */
export function dayPillarApprox(isoDate: string): {
  ganji: string
  stem: string
  branch: string
  stemIdx: number
  branchIdx: number
  note: string
} {
  const base = Date.UTC(1900, 0, 1)
  const [y, m, d] = isoDate.split('-').map(Number)
  if (!y || !m || !d) {
    return { ganji: '—', stem: '', branch: '', stemIdx: -1, branchIdx: -1, note: '날짜 오류' }
  }
  const cur = Date.UTC(y, m - 1, d)
  const days = Math.floor((cur - base) / 86400000)
  const stemIdx = mod(days, 10) // 갑술 = 간0, 지10
  const branchIdx = mod(10 + days, 12)
  const stem = STEMS[stemIdx]
  const branch = BRANCHES[branchIdx]
  return {
    ganji: `${stem}${branch}`,
    stem,
    branch,
    stemIdx,
    branchIdx,
    note: '간이 일주(참고용, 전문 만세력과 다를 수 있음)',
  }
}

/** 시주 — 시두법(일간으로 자시의 시간이 정해짐): 갑기→갑자 / 을경→병자 / 병신→무자 / 정임→경자 / 무계→임자.
 *  hour는 야자시 보정이 끝난 일주의 일간과 짝을 맞춰 넘겨야 한다. */
export function hourPillarApprox(
  dayStemIdx: number,
  hour: number,
): { ganji: string; stem: string; branch: string; element: string; note: string } | null {
  // 일주가 날짜 오류(-1)거나 NaN이면 시주를 세울 근거가 없다 — NaN은 부등호를 다 통과하므로 정수 검사가 필요
  if (!Number.isInteger(dayStemIdx) || dayStemIdx < 0 || dayStemIdx > 9) return null
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null
  // 자시가 23시에 시작하므로 (시각+1)/2로 지지 칸을 만든다
  const branchIdx = Math.floor(mod(hour + 1, 24) / 2)
  const startStem = [0, 2, 4, 6, 8][dayStemIdx % 5]
  const stemIdx = (startStem + branchIdx) % 10
  const stem = STEMS[stemIdx]
  const branch = BRANCHES[branchIdx]
  return {
    ganji: `${stem}${branch}`,
    stem,
    branch,
    element: `${STEM_ELEM[stemIdx]}·${BRANCH_ELEM[branchIdx]}`,
    note: '간이 시주(참고용, 지역 표준시·서머타임 미보정)',
  }
}

// 'HH:MM' 형식만 시각으로 인정한다(빈 값·이상값은 시주 미산출로 넘긴다)
function parseHour(birthTime?: string): number | null {
  if (!birthTime) return null
  const match = /^(\d{1,2}):(\d{2})$/.exec(birthTime.trim())
  if (!match) return null
  const hh = Number(match[1])
  const mm = Number(match[2])
  // 저장된 고객 레코드 등 input[type=time]을 안 거친 값이 들어올 수 있어 분까지 확인한다
  if (hh > 23 || mm > 59) return null
  return hh
}

// 야자시(23시 이후)는 일주가 다음 날로 넘어가므로 날짜를 하루 민다
function shiftIsoDate(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  if (!y || !m || !d) return isoDate
  const dt = new Date(Date.UTC(y, m - 1, d) + days * 86400000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`
}

export type SajuSummary = {
  birthDate: string
  birthTime: string
  gender: string
  calendarType: string
  year: ReturnType<typeof yearPillar>
  month: ReturnType<typeof monthPillarApprox>
  day: ReturnType<typeof dayPillarApprox>
  /** 출생 시각 미입력이면 null (항상 채워지지만 기존 호출부 호환을 위해 선택 필드) */
  hour?: ReturnType<typeof hourPillarApprox>
  /** 호출부가 t()로 띄울 경고 i18n 키 목록 (항상 채워지지만 선택 필드) */
  warnings?: string[]
  textBlock: string
}

export function buildSajuSummary(opts: {
  birthDate: string
  birthTime?: string
  gender?: string
  calendarType?: string
}): SajuSummary {
  const [y, m, d] = opts.birthDate.split('-').map(Number)
  const hour = parseHour(opts.birthTime)
  const isLunar = opts.calendarType === 'lunar'
  const isLateZi = hour !== null && hour >= 23

  // 연·월주는 절기 경계 판정에 일자가 필요하므로 월·일까지 넘긴다
  const year = yearPillar(y, m, d)
  const month = monthPillarApprox(y, m, d)
  // 야자시면 일주만 다음 날로 넘기고 연·월주는 원래 날짜 기준을 유지한다
  const dayDate = isLateZi ? shiftIsoDate(opts.birthDate, 1) : opts.birthDate
  const day = dayPillarApprox(dayDate)
  const hourPillar = hour === null ? null : hourPillarApprox(day.stemIdx, hour)

  const warnings: string[] = []
  if (isLunar) warnings.push(SAJU_WARN.lunarNotConverted)
  if (!hourPillar) warnings.push(SAJU_WARN.hourMissing)
  if (year.note) warnings.push(SAJU_WARN.solarTermBoundary)
  if (isLateZi) warnings.push(SAJU_WARN.lateZiHour)

  const textBlock = [
    `입력: ${opts.birthDate} ${opts.birthTime || '(시간 미상)'}`,
    `달력: ${isLunar ? '음력 입력(양력 환산 미적용 — 결과 부정확)' : '양력'}`,
    `성별: ${opts.gender || '미지정'}`,
    `년주: ${year.ganji} (${year.element})${year.note ? ` — ${year.note}` : ''}`,
    `월주(간이): ${month.ganji} — ${month.note}`,
    `일주(간이): ${day.ganji} — ${day.note}${isLateZi ? ' · 야자시라 다음 날 일주 적용' : ''}`,
    hourPillar
      ? `시주(간이): ${hourPillar.ganji} (${hourPillar.element}) — ${hourPillar.note}`
      : '시주: 미산출 — 출생 시각이 없어 시주를 세우지 않았습니다',
  ].join('\n')

  return {
    birthDate: opts.birthDate,
    birthTime: opts.birthTime || '',
    gender: opts.gender || '',
    calendarType: opts.calendarType || 'solar',
    year,
    month,
    day,
    hour: hourPillar,
    warnings,
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
  // 수리오행은 총획의 끝자리 기준(1·2 목 / 3·4 화 / 5·6 토 / 7·8 금 / 9·0 수)이라 나머지 5가 아니다
  const elementHint = elems[Math.floor(((total + 9) % 10) / 2)]
  return { total, perChar, elementHint }
}
