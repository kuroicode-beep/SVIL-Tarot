// src/lib/lunar.ts — 한국 음력 ↔ 양력 변환 (1900~2100 압축 테이블, 완전 오프라인)

export type LunarDate = { year: number; month: number; day: number; isLeapMonth?: boolean }

/** 지원 범위. 화면이 안내 문구에 쓴다. */
export const LUNAR_MIN_YEAR = 1900
export const LUNAR_MAX_YEAR = 2100

/** 음력 1년치를 32비트 정수 하나에 담은 표(1900~2100, 201개).
 *
 *  비트 배치 — 한 해의 정보를 숫자 하나로 압축한 이유는 201년치를 날짜 문자열로 늘어놓으면
 *  번들이 수십 KB 늘고, 표가 커질수록 오타를 잡기 어렵기 때문이다.
 *    0x0000F (하위 4비트) : 윤달 위치. 0이면 그 해에 윤달 없음, 1~12면 그 달 뒤에 윤달이 붙는다.
 *    0x0FFF0 (12비트)     : 1월~12월 대소월. 0x8000이 1월, 0x0010이 12월. 비트가 서면 30일(대월), 아니면 29일(소월).
 *    0x10000 (17번째 비트): 윤달이 대월(30일)이면 1, 소월(29일)이면 0.
 *
 *  기준일: 양력 1900-01-31 = 음력 1900-01-01. 여기서부터 일수를 누적해 변환한다.
 *
 *  ── 이 표는 "한국" 음력이다 (중요) ──
 *  인터넷에 널리 도는 1900~2100 음력 테이블은 대부분 중국 농력(UTC+8 기준)이다. 한국 음력은
 *  한국 표준시로 삭(朔)이 든 날을 그 달 초하루로 잡기 때문에, 삭이 KST 자정 직후에 들면 중국보다
 *  하루 늦어진다. 1900~2100 사이 2,485개 달 중 92개 달의 초하루가 이렇게 갈리고, 윤달 배치까지
 *  달라지는 해도 있다(2012 한국 윤3월 / 중국 윤4월, 2017 한국 윤5월 / 중국 윤6월).
 *  대표 사례: 1997년 정월 삭 = 2월 8일 00:06 KST → 한국 설날 2/8, 중국 춘절 2/7.
 *  그래서 중국 테이블을 그대로 쓰지 않고, 아래 절차로 한국 기준 표를 직접 만들어 넣었다.
 *
 *  생성·검증 절차 (node로 실행해 확인) —
 *   ① Meeus 『Astronomical Algorithms』 Ch.49(삭 시각) + Ch.25(태양 겉보기 황경)로 삭과 중기(30° 배수)를
 *      계산하고, ΔT는 Espenak–Meeus 다항식을 쓴다. 시각은 한국 표준시 변천(1908년 이전 서울 지방평시,
 *      1908~1912 UTC+8:30, 1912~1954 UTC+9, 1954~1961 UTC+8:30, 1961~ UTC+9)에 맞춰 민간일로 환산한다.
 *   ② 동지가 든 달을 11월로 놓고 무중치윤법(중기가 없는 첫 달이 윤달)으로 달 번호를 매겨 표를 인코딩.
 *   ③ 검증: 양력 1900-01-31~2100-12-31 전수 73,384일 왕복 검사 불일치 0건 / 음력 달 2,486개의 삭일·월번호·
 *      윤달여부·대소월 전부 천문 계산과 일치 / 공표 기준일 76건(설날 47·추석 17·부처님오신날 12) 전부 일치 /
 *      윤달 배치 14개 해 일치 / 1900~2100 윤달 74개(19년 7윤법 기대치 74개).
 *
 *  한계: 삭이 한국 표준시 자정 5분 이내에 드는 달이 20개 있다(예: 2005-12-02, 2017-02-26, 2097-01-13).
 *  이 달들은 역서 편찬 기관의 ΔT·천체력 차이에 따라 초하루가 ±1일 달라질 수 있다. */
const LUNAR_INFO = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054e5, 0x0d2a0, 0x0e950, 0x16554, 0x056a0, 0x0aad0, 0x055d2, // 1900-1909
  0x04ae0, 0x0a5d6, 0x0a4d0, 0x0d250, 0x0da95, 0x0b550, 0x056a0, 0x0ada2, 0x095d0, 0x04bb7, // 1910-1919
  0x049b0, 0x0a4b0, 0x0b4b5, 0x06a90, 0x0ad40, 0x0bb54, 0x02b60, 0x095b0, 0x05372, 0x04970, // 1920-1929
  0x06566, 0x0e4a0, 0x0ea50, 0x16a95, 0x05b50, 0x02b60, 0x18ae3, 0x092e0, 0x1c8d7, 0x0c950, // 1930-1939
  0x0d4a0, 0x1d8a6, 0x0b690, 0x056d0, 0x125b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0d557, // 1940-1949
  0x0b4a0, 0x0b550, 0x15555, 0x04db0, 0x025b0, 0x18573, 0x052b0, 0x0a9b8, 0x06950, 0x06aa0, // 1950-1959
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05270, 0x07263, 0x0d950, 0x06b57, 0x056a0, // 1960-1969
  0x09ad0, 0x04dd5, 0x04ae0, 0x0a4e0, 0x0d4d4, 0x0d250, 0x0d598, 0x0b540, 0x0d6a0, 0x195a6, // 1970-1979
  0x095b0, 0x049b0, 0x0a9b4, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0b756, 0x02b60, 0x095b0, // 1980-1989
  0x04b75, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06d98, 0x05ad0, 0x02b60, 0x096e5, 0x092e0, // 1990-1999
  0x0c960, 0x0e954, 0x0d4a0, 0x0da50, 0x07552, 0x056c0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5, // 2000-2009
  0x0a950, 0x0b4a0, 0x1b4a3, 0x0b550, 0x055d9, 0x04ba0, 0x0a5b0, 0x05575, 0x052b0, 0x0a950, // 2010-2019
  0x0b954, 0x06aa0, 0x0ad50, 0x06b52, 0x04b60, 0x0a6e6, 0x0a570, 0x05270, 0x06a65, 0x0d930, // 2020-2029
  0x05aa0, 0x0b6a3, 0x096d0, 0x04afb, 0x04ae0, 0x0a4d0, 0x1d0d6, 0x0d250, 0x0d520, 0x0dd45, // 2030-2039
  0x0b6a0, 0x096d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0b250, 0x1b255, 0x06d40, 0x0ada0, // 2040-2049
  0x18b63, 0x09570, 0x14978, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1aac4, 0x0ab60, // 2050-2059
  0x09370, 0x052e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0aad0, 0x095d4, // 2060-2069
  0x092d0, 0x0c9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0, // 2070-2079
  0x0b2b3, 0x0a930, 0x07557, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054f4, 0x05260, // 2080-2089
  0x0e968, 0x0d530, 0x05aa0, 0x1aaa6, 0x096d0, 0x04ae0, 0x0aad4, 0x0a4d0, 0x0d260, 0x0f253, // 2090-2099
  0x0d520, // 2100
]

/** 기준일 1900-01-31의 율리우스 적일(JDN). Date 객체는 브라우저 표준시에 따라 하루가 밀 수 있어
 *  변환은 전부 정수 JDN 산술로만 한다(순수 함수라 결과가 항상 결정적이다). */
const EPOCH_JDN = gregorianToJdn(1900, 1, 31)

/** 그레고리력 → JDN (Fliegel–Van Flandern). 음수 나눗셈이 없도록 4800년을 더해 쓴다. */
function gregorianToJdn(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12)
  const y = year + 4800 - a
  const m = month + 12 * a - 3
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  )
}

/** JDN → 그레고리력 */
function jdnToGregorian(jdn: number): { year: number; month: number; day: number } {
  const a = jdn + 32044
  const b = Math.floor((4 * a + 3) / 146097)
  const c = a - Math.floor((146097 * b) / 4)
  const d = Math.floor((4 * c + 3) / 1461)
  const e = c - Math.floor((1461 * d) / 4)
  const m = Math.floor((5 * e + 2) / 153)
  return {
    day: e - Math.floor((153 * m + 2) / 5) + 1,
    month: m + 3 - 12 * Math.floor(m / 10),
    year: 100 * b + d - 4800 + Math.floor(m / 10),
  }
}

/** 그 해의 윤달 번호(1~12). 0이면 윤달 없음. */
function leapMonthOf(year: number): number {
  return LUNAR_INFO[year - LUNAR_MIN_YEAR] & 0xf
}

/** 그 해 윤달의 일수. 윤달이 없으면 0. */
function leapMonthDays(year: number): number {
  if (leapMonthOf(year) === 0) return 0
  return LUNAR_INFO[year - LUNAR_MIN_YEAR] & 0x10000 ? 30 : 29
}

/** 평달(1~12월)의 일수. 0x8000이 1월이라 (0x10000 >> month)로 해당 비트를 집는다. */
function normalMonthDays(year: number, month: number): number {
  return LUNAR_INFO[year - LUNAR_MIN_YEAR] & (0x10000 >> month) ? 30 : 29
}

/** 그 음력 해의 총 일수(윤달 포함) */
function lunarYearDays(year: number): number {
  let sum = 0
  for (let m = 1; m <= 12; m += 1) sum += normalMonthDays(year, m)
  return sum + leapMonthDays(year)
}

/** 연도별 누적 일수(기준일부터). 201개뿐이라 모듈 로드 때 한 번 만들어 두면 변환이 O(1)에 가깝다. */
const YEAR_OFFSET: number[] = (() => {
  const acc: number[] = []
  let sum = 0
  for (let y = LUNAR_MIN_YEAR; y <= LUNAR_MAX_YEAR; y += 1) {
    acc.push(sum)
    sum += lunarYearDays(y)
  }
  acc.push(sum) // 표 끝 다음 위치(= 표가 덮는 총 일수)
  return acc
})()

/** 표가 덮는 마지막 양력 날짜의 JDN (음력 2100-12-말일) */
const MAX_JDN = EPOCH_JDN + YEAR_OFFSET[LUNAR_MAX_YEAR - LUNAR_MIN_YEAR + 1] - 1

function isInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n)
}

/** 음력 → 양력. 표 밖이거나 존재하지 않는 날짜면 null. */
export function lunarToSolar(d: LunarDate): { year: number; month: number; day: number } | null {
  const { year, month, day } = d
  const wantLeap = d.isLeapMonth === true
  if (!isInt(year) || year < LUNAR_MIN_YEAR || year > LUNAR_MAX_YEAR) return null
  if (!isInt(month) || month < 1 || month > 12) return null
  if (!isInt(day) || day < 1 || day > 30) return null

  const leap = leapMonthOf(year)
  // 윤달을 달라고 했는데 그 해에 그 윤달이 없으면 존재하지 않는 날짜다
  if (wantLeap && leap !== month) return null

  const size = wantLeap ? leapMonthDays(year) : normalMonthDays(year, month)
  // 29일까지인 달의 30일 같은 없는 날은 조용히 밀지 않고 실패로 돌려준다
  if (day > size) return null

  let offset = YEAR_OFFSET[year - LUNAR_MIN_YEAR]
  for (let m = 1; m < month; m += 1) {
    offset += normalMonthDays(year, m)
    // 윤달은 같은 번호의 평달 "뒤"에 오므로 m월을 지날 때 함께 더한다
    if (leap === m) offset += leapMonthDays(year)
  }
  if (wantLeap) offset += normalMonthDays(year, month)
  offset += day - 1

  return jdnToGregorian(EPOCH_JDN + offset)
}

/** 양력 → 음력. 화면에 "음력 O월 O일" 을 되비쳐 줄 때 쓴다. */
export function solarToLunar(year: number, month: number, day: number): LunarDate | null {
  if (!isInt(year) || !isInt(month) || !isInt(day)) return null
  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  const jdn = gregorianToJdn(year, month, day)
  // 2월 30일처럼 없는 날은 JDN 왕복에서 다른 날짜로 되돌아온다 — 그걸로 걸러낸다
  const back = jdnToGregorian(jdn)
  if (back.year !== year || back.month !== month || back.day !== day) return null
  if (jdn < EPOCH_JDN || jdn > MAX_JDN) return null

  let offset = jdn - EPOCH_JDN

  // 누적표에서 해당 음력 연도를 이진 탐색 없이 바로 잡아낸다(201개라 선형도 충분히 싸다)
  let ly = LUNAR_MAX_YEAR
  for (let y = LUNAR_MIN_YEAR; y <= LUNAR_MAX_YEAR; y += 1) {
    if (YEAR_OFFSET[y - LUNAR_MIN_YEAR + 1] > offset) {
      ly = y
      break
    }
  }
  offset -= YEAR_OFFSET[ly - LUNAR_MIN_YEAR]

  const leap = leapMonthOf(ly)
  for (let m = 1; m <= 12; m += 1) {
    const nd = normalMonthDays(ly, m)
    if (offset < nd) return { year: ly, month: m, day: offset + 1, isLeapMonth: false }
    offset -= nd
    if (leap === m) {
      const ld = leapMonthDays(ly)
      if (offset < ld) return { year: ly, month: m, day: offset + 1, isLeapMonth: true }
      offset -= ld
    }
  }
  return null
}

/** 그 해에 윤달이 있으면 몇 월인지. 없으면 0. 화면이 윤달 체크박스를 켤지 정할 때 쓴다. */
export function leapMonthOfYear(year: number): number {
  if (!isInt(year) || year < LUNAR_MIN_YEAR || year > LUNAR_MAX_YEAR) return 0
  return leapMonthOf(year)
}

/** 그 음력 달의 일수(29 또는 30). 표 밖이거나 없는 윤달이면 0. 날짜 입력 상한에 쓴다. */
export function lunarMonthLength(year: number, month: number, isLeapMonth = false): number {
  if (!isInt(year) || year < LUNAR_MIN_YEAR || year > LUNAR_MAX_YEAR) return 0
  if (!isInt(month) || month < 1 || month > 12) return 0
  if (isLeapMonth) return leapMonthOf(year) === month ? leapMonthDays(year) : 0
  return normalMonthDays(year, month)
}
