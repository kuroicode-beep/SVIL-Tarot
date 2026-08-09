// src/lib/almanac.ts — 일진(간지) 기반 택일·운세 캘린더 계산. 난수 없는 결정적 규칙, 완전 오프라인.
import { dayPillarApprox, monthPillarApprox, yearPillar } from './sajuName'

const BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해']

/** 오행 인덱스 — 0목 1화 2토 3금 4수. sajuName.ts의 STEM_ELEM·BRANCH_ELEM과 같은 순서다. */
const STEM_ELEM = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4]
const BRANCH_ELEM = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4]

export type PurposeId = 'contract' | 'move' | 'interview' | 'meeting' | 'travel' | 'start'

/** 화면이 칩·필터를 만들 때 쓰는 순서. 여기 하나만 고치면 UI가 따라온다. */
export const PURPOSE_IDS: PurposeId[] = [
  'contract',
  'move',
  'interview',
  'meeting',
  'travel',
  'start',
]

/** 목적 이름은 5개 언어를 타야 하므로 이 파일에는 i18n 키만 둔다(사용자 문자열 금지). */
export const PURPOSE_LABEL_KEY: Record<PurposeId, string> = {
  contract: 'cal_purpose_contract',
  move: 'cal_purpose_move',
  interview: 'cal_purpose_interview',
  meeting: 'cal_purpose_meeting',
  travel: 'cal_purpose_travel',
  start: 'cal_purpose_start',
}

export type DayInfo = {
  date: string          // YYYY-MM-DD
  dayGanji: string      // 일진
  dayStem: string
  dayBranch: string
  /** 십이신살/건제12신 같은 전통 길흉 지표를 규칙으로 계산한 점수 0~100. */
  score: number
  /** 목적별 적합도. 규칙 기반이며 근거 키를 함께 담는다. */
  purposes: Record<PurposeId, { good: boolean; reasonKey: string }>
  // ── 아래는 상세 패널이 근거를 그대로 보여 주기 위한 부가 정보(전부 i18n 키) ──
  /** 0=일요일 */
  weekday: number
  /** 건제12신(建除十二神) 이름 키 */
  officerKey: string
  /** 십이신살 이름 키 */
  sinsalKey: string
  /** 황도 길신 / 흑도 흉신 키 */
  godKey: string
  godGood: boolean
  /** 점수 등급 키 — 점수를 색이 아니라 말로도 알리기 위해 함께 낸다. */
  gradeKey: string
}

/* ─────────────────────────────────────────────────────────────
   길흉 규칙의 근거 (전부 전통 역법의 결정적 산식이라 같은 날 = 같은 결과)

   1) 건제12신(建除十二神): 그 달의 월건 지지와 같은 지지의 날이 '건(建)'이고,
      이후 제·만·평·정·집·파·위·성·수·개·폐가 하루씩 순환한다.
      → officer = (일지 - 월지) mod 12.  월지는 절기월(입절 전이면 이전 달)을 쓴다.

   2) 황도흑도(黃道黑道) 12신: 월지별로 '청룡'이 시작하는 일지가 정해져 있다.
      인·신월→자일, 묘·유월→인일, 진·술월→진일, 사·해월→오일, 오·자월→신일, 미·축월→술일.
      → 시작 지지 = (2 × (월지 - 인)) mod 12.
      청룡·명당·금궤·천덕·옥당·사명이 황도(길), 천형·주작·백호·천뢰·현무·구진이 흑도(흉).

   3) 십이신살: 그 해 지지의 삼합국으로 '겁살' 자리가 정해진다.
      신자진→사, 사유축→인, 인오술→해, 해묘미→신.  (지지 index를 4로 나눈 나머지로 갈린다)
      → 이후 겁·재·천·지·연·월·망신·장성·반안·역마·육해·화개 순으로 순환한다.

   점수는 위 세 지표에 일주 간지의 오행 생극을 더한 참고용 합산이며,
   절기 '시각'까지는 반영하지 않아 전통 만세력과 다를 수 있다(화면에서 반드시 고지한다).
   ───────────────────────────────────────────────────────────── */

/** 건(建) 제(除) 만(滿) 평(平) 정(定) 집(執) 파(破) 위(危) 성(成) 수(收) 개(開) 폐(閉) */
const OFFICER_KEYS = [
  'cal_officer_gun',
  'cal_officer_je',
  'cal_officer_man',
  'cal_officer_pyeong',
  'cal_officer_jeong',
  'cal_officer_jip',
  'cal_officer_pa',
  'cal_officer_wi',
  'cal_officer_seong',
  'cal_officer_su',
  'cal_officer_gae',
  'cal_officer_pye',
]

/** 건제12신 기본 가중치. 성·개가 최고, 파·폐가 최저라는 전통 평가를 그대로 옮겼다. */
const OFFICER_SCORE = [6, 12, 8, 4, 14, -6, -20, -12, 18, 6, 18, -16]

/** 청룡 명당 천형 주작 금궤 천덕 백호 옥당 천뢰 현무 사명 구진 */
const GOD_GOOD = [true, true, false, false, true, true, false, true, false, false, true, false]

/** 겁살 재살 천살 지살 연살 월살 망신살 장성살 반안살 역마살 육해살 화개살 */
const SINSAL_KEYS = [
  'cal_sinsal_geopsal',
  'cal_sinsal_jaesal',
  'cal_sinsal_cheonsal',
  'cal_sinsal_jisal',
  'cal_sinsal_yeonsal',
  'cal_sinsal_wolsal',
  'cal_sinsal_mangsin',
  'cal_sinsal_jangseong',
  'cal_sinsal_banan',
  'cal_sinsal_yeokma',
  'cal_sinsal_yukhae',
  'cal_sinsal_hwagae',
]

const SINSAL_SCORE = [-6, -6, -4, 2, 0, -4, -2, 4, 4, 2, -2, 2]

/** 신살이 '왜 좋은지'를 말로 설명할 수 있는 것만 별도 근거 키를 준다. */
const SINSAL_REASON: Record<number, string> = {
  3: 'cal_reason_jisal',
  4: 'cal_reason_yeonsal',
  7: 'cal_reason_jangseong',
  8: 'cal_reason_banan',
  9: 'cal_reason_yeokma',
  11: 'cal_reason_hwagae',
}

/** 겁살 시작 지지 — 연지 index를 4로 나눈 나머지로 삼합국이 갈린다(0:신자진 1:사유축 2:인오술 3:해묘미). */
const SINSAL_START = [5, 2, 11, 8]

type PurposeRule = {
  goodOfficers: number[]
  badOfficers: number[]
  goodSinsal: number[]
  badSinsal: number[]
}

/** 목적별 규칙. 전통 택일서에서 각 목적에 흔히 권하는 건제12신·신살을 옮긴 것이다. */
const PURPOSE_RULES: Record<PurposeId, PurposeRule> = {
  // 계약 — 매듭짓는 일이라 정(定)·성(成)·수(收)가 좋고 파(破)·위(危)·폐(閉)를 피한다
  contract: { goodOfficers: [4, 8, 9, 10, 2], badOfficers: [6, 7, 11, 5], goodSinsal: [8, 11], badSinsal: [0, 1] },
  // 이사 — 자리를 옮기는 일이라 성(成)·개(開)가 좋고, 흙을 건드리는 건(建)·집(執)은 꺼린다
  move: { goodOfficers: [8, 10, 1, 2], badOfficers: [6, 11, 0, 5], goodSinsal: [3, 9], badSinsal: [2, 5] },
  // 면접 — 사람 앞에 서는 일이라 장성살·정(定)·성(成)이 힘을 싣는다
  interview: { goodOfficers: [8, 10, 4, 3], badOfficers: [6, 7, 11, 9], goodSinsal: [7, 8], badSinsal: [0, 6] },
  // 미팅 — 무난한 평(平)·정(定)이 오히려 좋고 파(破)·폐(閉)만 피하면 된다
  meeting: { goodOfficers: [3, 4, 8, 10], badOfficers: [6, 11, 7], goodSinsal: [7, 4], badSinsal: [1, 10] },
  // 여행 — 출행은 제(除)·개(開)·건(建)이 길하고 위(危)는 이름 그대로 피한다
  travel: { goodOfficers: [1, 10, 8, 0], badOfficers: [7, 6, 11, 5], goodSinsal: [9, 3], badSinsal: [2, 0] },
  // 시작·개업 — 문을 여는 개(開)·건(建)·성(成)이 핵심이고 거두는 수(收)·닫는 폐(閉)는 반대 방향이다
  start: { goodOfficers: [0, 10, 8, 2], badOfficers: [6, 11, 7, 9], goodSinsal: [11, 7], badSinsal: [5, 10] },
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function isoOf(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

/** 해당 달의 마지막 날. 0일 = 전달 마지막 날이라는 Date 규칙을 쓴다. */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/** 일주 간지 안의 오행 생극. 천간·지지가 서로 생하면 힘이 모이고, 극하면 어긋난다고 본다. */
function harmonyScore(stemIdx: number, branchIdx: number): number {
  const se = STEM_ELEM[stemIdx]
  const be = BRANCH_ELEM[branchIdx]
  if (se === be) return 2
  if ((se + 1) % 5 === be || (be + 1) % 5 === se) return 6
  if ((se + 2) % 5 === be || (be + 2) % 5 === se) return -6
  return 0
}

function gradeKeyOf(score: number): string {
  if (score >= 75) return 'cal_grade_best'
  if (score >= 60) return 'cal_grade_good'
  if (score >= 45) return 'cal_grade_normal'
  if (score >= 30) return 'cal_grade_caution'
  return 'cal_grade_avoid'
}

/** 목적 하나에 대한 적합 판정. 점수가 아니라 별도 가점표를 쓴다 —
 *  전체 점수가 높아도 그 목적을 막는 일진이 있을 수 있기 때문이다. */
function judgePurpose(
  rule: PurposeRule,
  officer: number,
  godGood: boolean,
  sinsal: number,
): { good: boolean; reasonKey: string } {
  const officerGood = rule.goodOfficers.includes(officer)
  const officerBad = rule.badOfficers.includes(officer)
  const sinsalGood = rule.goodSinsal.includes(sinsal)
  const sinsalBad = rule.badSinsal.includes(sinsal)

  let pts = 0
  if (officerGood) pts += 2
  if (officerBad) pts -= 2
  pts += godGood ? 1 : -1
  if (sinsalGood) pts += 1
  if (sinsalBad) pts -= 1

  if (pts >= 2) {
    if (sinsalGood && SINSAL_REASON[sinsal]) return { good: true, reasonKey: SINSAL_REASON[sinsal] }
    if (officerGood) return { good: true, reasonKey: 'cal_reason_officer_good' }
    if (godGood) return { good: true, reasonKey: 'cal_reason_yellow_day' }
    return { good: true, reasonKey: 'cal_reason_mild_good' }
  }
  if (officerBad) return { good: false, reasonKey: 'cal_reason_officer_bad' }
  if (sinsalBad) return { good: false, reasonKey: 'cal_reason_sinsal_bad' }
  if (!godGood) return { good: false, reasonKey: 'cal_reason_black_day' }
  return { good: false, reasonKey: 'cal_reason_mild_bad' }
}

/** 간지를 세울 수 없는 날(날짜 파싱 실패 등)도 화면이 죽지 않게 중립값으로 채운다. */
function unknownDay(date: string, weekday: number): DayInfo {
  const purposes = {} as DayInfo['purposes']
  for (const p of PURPOSE_IDS) purposes[p] = { good: false, reasonKey: 'cal_reason_unknown' }
  return {
    date,
    dayGanji: '—',
    dayStem: '',
    dayBranch: '',
    score: 50,
    purposes,
    weekday,
    officerKey: '',
    sinsalKey: '',
    godKey: '',
    godGood: false,
    gradeKey: 'cal_grade_normal',
  }
}

/** 하루치 길흉. 같은 날짜면 항상 같은 값을 돌려준다(난수·시각 의존 없음). */
export function dayInfo(year: number, month: number, day: number): DayInfo {
  const date = isoOf(year, month, day)
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()

  const dp = dayPillarApprox(date)
  // 월지는 절기월이라 달의 1일이 아니라 입절일에 바뀐다 — sajuName이 이미 처리한다
  const mp = monthPillarApprox(year, month, day)
  // 연지도 1/1이 아니라 입춘에 바뀐다
  const yp = yearPillar(year, month, day)

  const monthBranchIdx = BRANCHES.indexOf(mp.branch)
  const yearBranchIdx = BRANCHES.indexOf(yp.branch)
  if (dp.branchIdx < 0 || dp.stemIdx < 0 || monthBranchIdx < 0 || yearBranchIdx < 0) {
    return unknownDay(date, weekday)
  }

  const officer = mod(dp.branchIdx - monthBranchIdx, 12)
  const godStart = mod(2 * (monthBranchIdx - 2), 12)
  const god = mod(dp.branchIdx - godStart, 12)
  const godGood = GOD_GOOD[god]
  const sinsal = mod(dp.branchIdx - SINSAL_START[yearBranchIdx % 4], 12)

  const raw =
    50 +
    OFFICER_SCORE[officer] +
    (godGood ? 10 : -10) +
    harmonyScore(dp.stemIdx, dp.branchIdx) +
    SINSAL_SCORE[sinsal]
  const score = Math.max(0, Math.min(100, Math.round(raw)))

  const purposes = {} as DayInfo['purposes']
  for (const p of PURPOSE_IDS) {
    purposes[p] = judgePurpose(PURPOSE_RULES[p], officer, godGood, sinsal)
  }

  return {
    date,
    dayGanji: dp.ganji,
    dayStem: dp.stem,
    dayBranch: dp.branch,
    score,
    purposes,
    weekday,
    officerKey: OFFICER_KEYS[officer],
    sinsalKey: SINSAL_KEYS[sinsal],
    godKey: godGood ? 'cal_god_yellow' : 'cal_god_black',
    godGood,
    gradeKey: gradeKeyOf(score),
  }
}

/** 한 달치 일진. month는 1~12이며 범위를 벗어나면 빈 배열을 돌려준다. */
export function monthDays(year: number, month: number): DayInfo[] {
  if (!Number.isInteger(year) || year < 1) return []
  if (!Number.isInteger(month) || month < 1 || month > 12) return []
  const last = daysInMonth(year, month)
  const out: DayInfo[] = []
  for (let d = 1; d <= last; d += 1) out.push(dayInfo(year, month, d))
  return out
}

/** 목적에 맞는 좋은 날 상위 N. 기간은 오늘부터 daysAhead일.
 *  같은 점수면 빠른 날짜가 앞선다 — 정렬까지 결정적이어야 새로고침할 때마다 순서가 바뀌지 않는다. */
export function bestDays(
  purpose: PurposeId,
  daysAhead: number,
  from?: Date,
  limit = 5,
): DayInfo[] {
  if (!Number.isInteger(daysAhead) || daysAhead < 1) return []
  const base = from ?? new Date()
  // 로컬 날짜 성분만 뽑아 UTC로 다시 조립한다. 서머타임이 있어도 하루 단위 가산이 어긋나지 않는다.
  const startMs = Date.UTC(base.getFullYear(), base.getMonth(), base.getDate())
  const out: DayInfo[] = []
  for (let i = 0; i < daysAhead; i += 1) {
    const dt = new Date(startMs + i * 86400000)
    const info = dayInfo(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())
    if (info.purposes[purpose]?.good) out.push(info)
  }
  out.sort((a, b) => (b.score - a.score) || a.date.localeCompare(b.date))
  return out.slice(0, Math.max(0, limit))
}
