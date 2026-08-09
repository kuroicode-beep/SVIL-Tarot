// src/lib/sajuName.ts — 간이 만세력·성명 헬퍼 (전문 엔진 아님 — AI 풀이 보조 요약용)

import { lunarToSolar, LUNAR_MIN_YEAR, LUNAR_MAX_YEAR } from './lunar'

const STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const
const BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'] as const
const STEM_ELEM = ['목', '목', '화', '화', '토', '토', '금', '금', '수', '수'] as const
const BRANCH_ELEM = ['수', '토', '목', '목', '토', '화', '화', '토', '금', '금', '토', '수'] as const

/** 경고 문구는 화면마다 언어가 달라야 하므로 텍스트 대신 i18n 키만 넘긴다 */
export const SAJU_WARN = {
  /** 음력 → 양력 환산에 성공했음을 알린다. 실제 날짜는 SajuSummary.lunarDate·solarDate로 되비친다. */
  lunarConverted: 'saju_warn_lunar_converted',
  /** 환산 실패(지원 범위 밖·없는 날짜·없는 윤달) — 이때는 간지를 아예 세우지 않는다. */
  lunarConvertFailed: 'saju_warn_lunar_convert_failed',
  hourMissing: 'saju_warn_hour_missing',
  solarTermBoundary: 'saju_warn_solar_term_boundary',
  monthTermBoundary: 'saju_warn_month_term_boundary',
  lateZiHour: 'saju_warn_late_zi_hour',
} as const

/** 12절기 절입일(KST) 표 — 1900~2060.
 *  연주·월주 경계는 달의 1일이 아니라 태양황경 기준 12절(節)에서 갈린다:
 *  소한 285°(1월) 입춘 315°(2월) 경칩 345°(3월) 청명 15°(4월) 입하 45°(5월) 망종 75°(6월)
 *  소서 105°(7월) 입추 135°(8월) 백로 165°(9월) 한로 195°(10월) 입동 225°(11월) 대설 255°(12월).
 *
 *  값은 Meeus/VSOP87 겉보기 태양황경(FK5 보정·장동·광행차 포함, ΔT는 Espenak–Meeus)으로
 *  1900~2060을 미리 계산해 박아 넣었다 — 런타임 계산은 비용이 크고, 표로 두면 결과가 항상 결정적이다.
 *  검산: 2024·2025년 KASI 절입시각 24건이 분 단위까지 일치하고, 2021 입춘(2/3 23:59)처럼
 *  자정 직전 사례도 맞는다. 기존에 검증된 입춘 열(1900~2060 161개)과도 전부 일치한다.
 *
 *  "기본 2/4 + 몇 해만 2/3" 식 근사는 1902~1984의 38개 해(실제 2/5)에서 연주를 한 해 앞당겨 틀린다.
 *  예: 1984-02-04는 실제 입춘(2/5 00:19 KST) 전이라 계해년인데 근사로는 갑자년이 된다. */
const TERM_START_YEAR = 1900
/** 달(1~12)별 절입일 최솟값. 실제 일자 = TERM_BASE_DAY[월-1] + TERM_OFFSETS[월-1][해-1900] */
const TERM_BASE_DAY = [5, 3, 5, 4, 5, 5, 6, 7, 7, 7, 7, 6]
/** 한 문자열이 한 절기의 1900~2060(161자)이고, 문자 하나가 그 해의 기준일 대비 오프셋(0~2)이다.
 *  161년 × 12절기를 날짜 그대로 나열하면 표가 비대해져 "기준일 + 오프셋 한 자리"로 줄였다. */
const TERM_OFFSETS = [
  '11112111211121112111111111111111111111111111111111111111101110111011101110111011101110111001100110011001100110011001100110011000100010001000100010001000100010000', // 1월 소한 285°
  '11222122212221222112211221122112211221122112211221122111211121112111211121112111211121111111111111111111111111111111111110111011101110111011101110111011101110011', // 2월 입춘 315°
  '11121112111211121112111111111111111111111111111111111111011101110111011101110111011101110011001100110011001100110011001100010001000100010001000100010001000000000', // 3월 경칩 345°
  '11221122112211221112111211121112111211121112111211111111111111111111111111111111111101110111011101110111011101110111001100110011001100110011001100010001000100010', // 4월 청명 15°
  '11121112111211121111111111111111111111111111111101110111011101110111011101110111001100110011001100110011001100010001000100010001000100010001000000000000000000000', // 5월 입하 45°
  '11221122111211121112111211121112111211111111111111111111111111111111111101110111011101110111011101110011001100110011001100110011000100010001000100010001000100010', // 6월 망종 75°
  '22221222122212221222122212221222112211221122112211221122112211121112111211121112111211121111111111111111111111111111111111110111011101110111011101110111001100110', // 7월 소서 105°
  '11121112111211121111111111111111111111111111111111110111011101110111011101110111001100110011001100110011001100010001000100010001000100010001000000000000000000000', // 8월 입추 135°
  '11121112111211121112111211121112111111111111111111111111111111110111011101110111011101110111011100110011001100110011001100110001000100010001000100010001000100000', // 9월 백로 165°
  '22222222222222222222122212221222122212221222122212221122112211221122112211221122112211121112111211121112111211121111111111111111111111111111111111110111011101110', // 10월 한로 195°
  '11111111111111111111111111111111011101110111011101110111011101110111001100110011001100110011001100110001000100010001000100010001000100000000000000000000000000000', // 11월 입동 225°
  '12221222122212221222122211221122112211221122112211221122111211121112111211121112111211121111111111111111111111111111111111111111011101110111011101110111011101110', // 12월 대설 255°
]

/** 해당 연·월의 절입일(KST). 표 밖의 해·잘못된 달은 근거가 없어 최빈 오프셋 +1로 두되,
 *  호출부가 ±1일에 경계 note를 붙이므로 조용히 틀린 값이 되지는 않는다. */
function solarTermDay(year: number, month: number): number {
  const base = TERM_BASE_DAY[month - 1] ?? 5
  const row = TERM_OFFSETS[month - 1]
  if (!row) return base + 1
  const ch = row[year - TERM_START_YEAR]
  return base + (ch ? Number(ch) : 1)
}

// 연주 경계는 2월 절기인 입춘이다
function lichunDay(year: number): number {
  return solarTermDay(year, 2)
}

// 음수 나머지를 피하려고 항상 양수로 정규화한다
function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}

/** 날짜 파싱이 깨졌는지 판정. Number.isInteger만으로는 부족하다 —
 *  birthDate가 ''이거나 '-03-15'처럼 연도 자리가 비면 split('-')[0]이 ''이 되고
 *  Number('')는 NaN이 아니라 0(정수)이라 검사를 통과한다. 그러면 월주·일주는 '—'인데
 *  연주만 0년 간지(경신)가 찍히는 반쪽 결과가 나온다.
 *  dayPillarApprox의 `!y` 검사와 같은 기준(0 이하 거부)으로 맞춘다. */
function isValidYear(year: number): boolean {
  return Number.isInteger(year) && year >= 1
}

/** 연주는 1/1이 아니라 입춘에 바뀌므로, 입춘 이전 출생은 전년도 간지를 쓴다.
 *  월·일을 넘기지 않으면 예전처럼 양력 연도 그대로 계산한다(하위 호환). */
export function yearPillar(
  year: number,
  month?: number,
  day?: number,
): { ganji: string; stem: string; branch: string; element: string; boundary: boolean; note: string } {
  // 날짜 파싱이 깨진 값이 들어오면 월주·일주와 같게 '—'로 맞춘다(예전엔 'undefinedundefined'가 나왔다)
  if (!isValidYear(year)) {
    return { ganji: '—', stem: '', branch: '', element: '', boundary: false, note: '날짜 오류' }
  }
  let effYear = year
  let note = ''
  let boundary = false
  if (month && day) {
    const lichun = lichunDay(year)
    // 1월 전체와 입춘 전 2월 초는 아직 전년도 간지다
    if (month === 1 || (month === 2 && day < lichun)) effYear = year - 1
    // 절입은 시각 단위라 경계 ±1일은 뒤집힐 수 있어 확인 요청을 남긴다
    if (month === 2 && Math.abs(day - lichun) <= 1) {
      boundary = true
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
    boundary,
    note,
  }
}

/** 월주 — 절기월은 달의 1일이 아니라 그 달의 절(節) 절입일에 바뀐다.
 *  절입 전이면 한 칸 앞 절기월로 되돌린다(예: 3월 3일은 경칩 전이라 아직 인월,
 *  1월 초는 소한 전이라 전해 12월의 자월).
 *  인월은 양력 2월이라 절기월 번호와 지지가 그대로 맞물리고(2월→인, 12월→자, 1월→축),
 *  월간(月干)은 입춘 기준 절기년의 연간에서 "갑기년 병인두" 규칙으로 뽑는다.
 *  1월과 입춘 전 2월은 아직 전년도 절기년이라 연간을 한 해 당긴다. */
export function monthPillarApprox(
  year: number,
  month: number,
  day?: number,
): { ganji: string; stem: string; branch: string; boundary: boolean; note: string } {
  // 날짜 파싱이 깨진 값이 들어오면 간지 대신 '—'를 돌려준다(예전엔 'undefinedundefined'가 나왔다)
  if (!isValidYear(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return { ganji: '—', stem: '', branch: '', boundary: false, note: '날짜 오류' }
  }
  const termDay = solarTermDay(year, month)
  // 일자를 안 넘기면 절입 판정을 할 수 없어 예전처럼 달 번호를 그대로 절기월로 본다(하위 호환)
  const beforeTerm = !!day && day < termDay
  const m = beforeTerm ? (month === 1 ? 12 : month - 1) : month
  // 절입은 시각 단위라 경계 ±1일은 뒤집힐 수 있어 확인 요청을 남긴다
  const boundary = !!day && Math.abs(day - termDay) <= 1
  const beforeLichun = month === 1 || (month === 2 && !!day && day < lichunDay(year))
  const baseYear = beforeLichun ? year - 1 : year
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
    boundary,
    note: boundary
      ? '12절기 절입일 반영 월주 — 절입 경계라 실제 절입 시각 확인 필요'
      : '12절기 절입일 반영 월주(절입 시각까지는 미반영, 참고용)',
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

// 'YYYY-MM-DD'로 0을 채워 맞춘다 — 간지 계산이 문자열 split에 의존하므로 자릿수가 어긋나면 안 된다
function toIsoDate(d: { year: number; month: number; day: number }): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.year}-${pad(d.month)}-${pad(d.day)}`
}

export type SajuSummary = {
  /** 사용자가 입력한 날짜 그대로(음력이면 음력 날짜) */
  birthDate: string
  birthTime: string
  gender: string
  calendarType: string
  /** 간지 계산에 실제로 쓴 양력 날짜. 양력 입력이면 birthDate와 같고, 환산 실패면 undefined.
   *  화면이 "음력 O월 O일 → 양력 O월 O일"을 되비쳐 줄 때 쓴다. */
  solarDate?: string
  /** 음력 입력 원문('YYYY-MM-DD'). 양력 입력이면 undefined. */
  lunarDate?: string
  /** 음력 입력이 윤달이었는지 */
  isLeapMonth?: boolean
  /** 음력 → 양력 환산이 실제로 적용됐는지. false + calendarType==='lunar'면 환산 실패다. */
  lunarConverted?: boolean
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
  /** 음력 입력일 때 그 날짜가 윤달인지. 양력 입력이면 무시된다. */
  isLeapMonth?: boolean
}): SajuSummary {
  const hour = parseHour(opts.birthTime)
  const isLunar = opts.calendarType === 'lunar'
  const isLeap = isLunar && opts.isLeapMonth === true

  // 간지는 전부 양력 기준 공식이라, 음력 입력은 반드시 먼저 양력으로 환산해야 한다.
  // 예전에는 환산 없이 음력 날짜를 그대로 넣어 경고만 띄웠고, 그래서 틀린 사주가 나왔다.
  let solarDate: string | null = opts.birthDate
  if (isLunar) {
    const [ly, lm, ld] = opts.birthDate.split('-').map(Number)
    const converted = lunarToSolar({ year: ly, month: lm, day: ld, isLeapMonth: isLeap })
    solarDate = converted ? toIsoDate(converted) : null
  }
  const lunarFailed = solarDate === null
  // 환산에 실패하면 틀린 값을 보여 주느니 아예 세우지 않는다.
  // 빈 문자열을 넘기면 기존 날짜 검사(isValidYear·dayPillarApprox)가 모든 주를 '—'로 돌려준다.
  const calcDate = solarDate ?? ''
  const [y, m, d] = calcDate.split('-').map(Number)
  const isLateZi = !lunarFailed && hour !== null && hour >= 23

  // 연·월주는 절기 경계 판정에 일자가 필요하므로 월·일까지 넘긴다
  const year = yearPillar(y, m, d)
  const month = monthPillarApprox(y, m, d)
  // 야자시면 일주만 다음 날로 넘기고 연·월주는 원래 날짜 기준을 유지한다
  const dayDate = isLateZi ? shiftIsoDate(calcDate, 1) : calcDate
  const day = dayPillarApprox(dayDate)
  const hourPillar = hour === null || lunarFailed ? null : hourPillarApprox(day.stemIdx, hour)

  const warnings: string[] = []
  if (lunarFailed) {
    // 환산이 깨졌으면 아래 경고들은 세우지도 않은 간지에 대한 잡음이라 띄우지 않는다
    warnings.push(SAJU_WARN.lunarConvertFailed)
  } else {
    if (isLunar) warnings.push(SAJU_WARN.lunarConverted)
    if (!hourPillar) warnings.push(SAJU_WARN.hourMissing)
    if (year.boundary) warnings.push(SAJU_WARN.solarTermBoundary)
    // 연주(입춘)와 월주(그 달의 절)는 각각 다른 절기에서 갈리므로 경고도 따로 띄운다
    if (month.boundary) warnings.push(SAJU_WARN.monthTermBoundary)
    if (isLateZi) warnings.push(SAJU_WARN.lateZiHour)
  }

  const calendarLine = !isLunar
    ? '달력: 양력'
    : lunarFailed
      ? `달력: 음력 입력 — 양력 환산 실패(지원 범위 음력 ${LUNAR_MIN_YEAR}~${LUNAR_MAX_YEAR}년, 윤달 여부·날짜 확인 필요)`
      : `달력: 음력 ${opts.birthDate}${isLeap ? ' 윤달' : ''} → 양력 ${solarDate} 환산 적용`

  const textBlock = [
    `입력: ${opts.birthDate} ${opts.birthTime || '(시간 미상)'}`,
    calendarLine,
    `성별: ${opts.gender || '미지정'}`,
    `년주: ${year.ganji} (${year.element})${year.note ? ` — ${year.note}` : ''}`,
    `월주(간이): ${month.ganji} — ${month.note}`,
    `일주(간이): ${day.ganji} — ${day.note}${isLateZi ? ' · 야자시라 다음 날 일주 적용' : ''}`,
    hourPillar
      ? `시주(간이): ${hourPillar.ganji} (${hourPillar.element}) — ${hourPillar.note}`
      : lunarFailed
        ? '시주: 미산출 — 음력을 양력으로 환산하지 못해 계산하지 않았습니다'
        : '시주: 미산출 — 출생 시각이 없어 시주를 세우지 않았습니다',
  ].join('\n')

  return {
    birthDate: opts.birthDate,
    birthTime: opts.birthTime || '',
    gender: opts.gender || '',
    calendarType: opts.calendarType || 'solar',
    // 빈 문자열(깨진 입력)도 undefined로 눌러야 화면이 "→ 양력 " 같은 반쪽 문구를 찍지 않는다
    solarDate: solarDate || undefined,
    lunarDate: isLunar ? opts.birthDate : undefined,
    isLeapMonth: isLunar ? isLeap : undefined,
    lunarConverted: isLunar ? !lunarFailed : undefined,
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
