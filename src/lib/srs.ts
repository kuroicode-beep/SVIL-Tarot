// src/lib/srs.ts — SM-2 간격반복(SRS) 스케줄러: 순수 계산 + IndexedDB 저장·집계
import type { IDBPDatabase } from 'idb'
import { allCards } from './cards'
import { getDb } from '../services/db'

export type SrsCard = {
  cardId: string
  ease: number
  interval: number
  reps: number
  lapses: number
  dueAt: string
  updatedAt: string
}

/** 0~5 품질 평가. 3 미만이면 실패로 보고 처음부터. */
export type SrsGrade = 0 | 1 | 2 | 3 | 4 | 5

/** 리포트 카드 화면이 그대로 렌더링할 수 있는 진도 요약. */
export type SrsSummary = {
  total: number
  studied: number
  due: number
  mastered: number
  weak: { cardId: string; lapses: number; ease: number }[]
}

/** 부모가 v4 마이그레이션에서 만들 스토어·인덱스 이름. 여기서만 문자열을 들고 있는다. */
export const SRS_STORE = 'srs'
export const SRS_DUE_INDEX = 'by-due'

export const DEFAULT_EASE = 2.5
export const MIN_EASE = 1.3
/** interval이 이 일수 이상이면 "익힘"으로 센다. */
export const MASTERED_DAYS = 21
/**
 * interval 상한 100년. SM-2는 ease에 상한이 없어 만점만 계속 주면 간격이 지수로 폭주한다.
 * 14회쯤에 dueAt이 서기 23238년이 되는데, 이때 toISOString이 '+023238-…' 확장 연도 표기로 바뀐다.
 * '+'는 숫자보다 사전순으로 앞서므로 isDue·byDueAsc·by-due 인덱스 범위가 전부 뒤집혀
 * "가장 안 급한 카드"가 "가장 밀린 카드"로 둔갑하고, 16회에는 Date 범위를 넘어 toISOString이 던진다.
 * 100년이면 사실상 "다시 안 봄"이면서 연도가 네 자리로 유지돼 문자열 비교가 그대로 성립한다.
 */
export const MAX_INTERVAL_DAYS = 36500

// 3 미만은 실패 — SM-2 원문의 기준선이라 상수로 고정해 둔다.
const PASS_GRADE = 3
const DAY_MS = 86400000
const WEAK_LIMIT = 10

// 덱에서 빠진 카드의 옛 기록이 목록·집계에 새어 나오지 않게, 유효 id를 한 번만 만들어 재사용한다.
const knownIds = new Set(allCards.map((c) => c.id))

/**
 * ease는 원래 소수 둘째 자리까지만 나온다(초기 2.5 + 증감폭 0.1 / 0 / -0.14 / -0.32 / -0.54 / -0.8).
 * 그런데 부동소수 누적은 2.5+0.1을 2.6000000000000005로 만들어 저장값과 화면 표시가 지저분해지고,
 * 값 비교도 흔들린다. 수학적 값은 그대로 두고 IEEE754 잡음만 걷어내려고 둘째 자리로 되돌린다.
 */
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// 타입 밖의 값(옛 저장본·잘못된 호출)이 들어와도 계산이 NaN으로 번지지 않게 잘라 낸다.
function clampGrade(grade: SrsGrade): number {
  if (!Number.isFinite(grade)) return 0
  return Math.min(5, Math.max(0, Math.round(grade)))
}

/**
 * 저장본의 숫자 필드도 grade와 같은 기준으로 막는다.
 * 백업 복원(backup.ts)은 문자열 필드만 검사하므로 손상된 파일에서 ease가 문자열·NaN으로 들어올 수 있다.
 * 하나라도 NaN이면 interval까지 NaN이 되고, 결국 new Date(NaN).toISOString()이 RangeError로 화면을 죽인다.
 */
function finiteOr(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

// ISO 문자열(항상 UTC·고정 길이)은 사전순 = 시간순이라 Date 변환 없이 그대로 비교·정렬한다.
function byDueAsc(a: SrsCard, b: SrsCard): number {
  if (a.dueAt !== b.dueAt) return a.dueAt < b.dueAt ? -1 : 1
  return a.cardId < b.cardId ? -1 : 1
}

/**
 * 순수 함수 — 저장 없이 다음 상태만 계산한다.
 * cardId는 prev에서만 물려받는다(신규 카드면 빈 문자열). 저장 주체인 recordAnswer가 채워 넣는다.
 */
export function scheduleNext(prev: SrsCard | undefined, grade: SrsGrade, now: Date = new Date()): SrsCard {
  const q = clampGrade(grade)
  const prevEase = finiteOr(prev?.ease, DEFAULT_EASE)
  const prevInterval = Math.max(0, finiteOr(prev?.interval, 0))
  const prevReps = Math.max(0, Math.trunc(finiteOr(prev?.reps, 0)))
  const prevLapses = Math.max(0, Math.trunc(finiteOr(prev?.lapses, 0)))

  let reps: number
  let interval: number
  let lapses = prevLapses

  if (q < PASS_GRADE) {
    // 실패 — 연속 정답 카운터를 0으로 되돌리고 내일 다시 본다. ease는 아래에서 따로 깎인다.
    reps = 0
    interval = 1
    lapses = prevLapses + 1
  } else {
    reps = prevReps + 1
    // 원본 SM-2는 갱신된 ease가 아니라 "직전 ease"로 다음 간격을 곱한다.
    // 순서를 바꾸면 3회차부터 간격이 한 단계씩 앞서 나가 실제보다 빨리 벌어진다.
    interval = reps === 1 ? 1 : reps === 2 ? 6 : Math.round(prevInterval * prevEase)
  }

  // ease += 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02), 하한 1.3
  const diff = 5 - q
  const ease = round2(Math.max(MIN_EASE, prevEase + (0.1 - diff * (0.08 + diff * 0.02))))

  // 간격이 0 이하로 떨어지면 영영 "기한 지남" 상태로 굳는다 — 최소 1일을 보장한다.
  // 상한은 dueAt이 네 자리 연도를 벗어나지 않게 막는다(MAX_INTERVAL_DAYS 주석 참고).
  const days = Math.min(MAX_INTERVAL_DAYS, Math.max(1, interval))
  const nowMs = now.getTime()
  return {
    cardId: prev?.cardId ?? '',
    ease,
    interval: days,
    reps,
    lapses,
    // 일수 가산은 ms로 한다. setDate로 더하면 서머타임이 있는 지역에서 하루가 어긋난다.
    dueAt: new Date(nowMs + days * DAY_MS).toISOString(),
    updatedAt: new Date(nowMs).toISOString(),
  }
}

/** 지금 기준 복습 대상인지. UI가 배지·텍스트 라벨을 붙일 때 쓴다. */
export function isDue(card: SrsCard, now: Date = new Date()): boolean {
  return card.dueAt <= now.toISOString()
}

/**
 * srs 스토어는 아직 db.ts 스키마(DB_VERSION=3)에 없다 — 부모가 v4 마이그레이션에서 추가한다.
 * 그때까지는 스토어 없는 DB를 만나므로 타입을 느슨한 IDBPDatabase로 낮추고,
 * 스토어 존재를 먼저 확인해 없으면 null을 돌려준다. 호출부는 전부 빈 결과로 폴백한다.
 */
async function openSrsDb(): Promise<IDBPDatabase | null> {
  try {
    const db = (await getDb()) as unknown as IDBPDatabase
    return db.objectStoreNames.contains(SRS_STORE) ? db : null
  } catch {
    return null
  }
}

async function readAllSrs(): Promise<SrsCard[]> {
  const db = await openSrsDb()
  if (!db) return []
  try {
    return ((await db.getAll(SRS_STORE)) as SrsCard[]) ?? []
  } catch {
    return []
  }
}

export async function getSrsCard(cardId: string): Promise<SrsCard | undefined> {
  const db = await openSrsDb()
  if (!db) return undefined
  try {
    return (await db.get(SRS_STORE, cardId)) as SrsCard | undefined
  } catch {
    return undefined
  }
}

export async function recordAnswer(cardId: string, grade: SrsGrade): Promise<SrsCard> {
  const now = new Date()
  const db = await openSrsDb()
  // 스토어가 아직 없어도 계산 결과는 돌려준다 — 호출부가 답을 못 받아 화면이 멈추는 편이 더 나쁘다.
  if (!db) return { ...scheduleNext(undefined, grade, now), cardId }
  try {
    // 읽기와 쓰기를 한 트랜잭션에 묶는다. 나눠 하면 같은 카드를 빠르게 두 번 채점했을 때
    // 늦게 도착한 쓰기가 옛 상태로 계산한 값을 덮어써 reps가 되감긴다.
    const tx = db.transaction(SRS_STORE, 'readwrite')
    const prev = (await tx.store.get(cardId)) as SrsCard | undefined
    const next = { ...scheduleNext(prev, grade, now), cardId }
    await tx.store.put(next)
    await tx.done
    return next
  } catch {
    // 트랜잭션이 깨지면 직전 상태를 알 수 없다. 신규 취급으로라도 결과를 돌려주고 저장은 포기한다.
    return { ...scheduleNext(undefined, grade, now), cardId }
  }
}

async function dueRecords(nowIso: string): Promise<SrsCard[]> {
  const db = await openSrsDb()
  if (!db) return []
  try {
    // by-due는 dueAt 오름차순이라 상한 범위만 긁으면 "가장 오래 밀린 순"으로 바로 나온다.
    const rows = (await db.getAllFromIndex(
      SRS_STORE,
      SRS_DUE_INDEX,
      IDBKeyRange.upperBound(nowIso),
    )) as SrsCard[]
    return rows ?? []
  } catch {
    // 인덱스가 아직 없는 DB — 전체를 읽어 직접 거르고 정렬한다(덱이 78장이라 비용이 무의미하다).
    const all = await readAllSrs()
    return all.filter((c) => c.dueAt <= nowIso).sort(byDueAsc)
  }
}

/** 오늘 복습할 카드 id 목록. 기한 지난 순. limit 없으면 전부. */
export async function dueCards(limit?: number): Promise<string[]> {
  const nowIso = new Date().toISOString()
  const rows = (await dueRecords(nowIso))
    .filter((c) => knownIds.has(c.cardId) && c.dueAt <= nowIso)
    .sort(byDueAsc)
  // limit=0은 "0장"이라는 뜻이라 undefined(전부)와 구분한다.
  const take = typeof limit === 'number' && Number.isFinite(limit) && limit >= 0 ? limit : undefined
  return rows.slice(0, take).map((c) => c.cardId)
}

/** 학습 진도 요약 — 리포트 카드 화면이 쓴다. */
export async function srsSummary(): Promise<SrsSummary> {
  const nowIso = new Date().toISOString()
  const records = (await readAllSrs()).filter((c) => knownIds.has(c.cardId))

  let due = 0
  let mastered = 0
  for (const c of records) {
    if (c.dueAt <= nowIso) due += 1
    if (c.interval >= MASTERED_DAYS) mastered += 1
  }

  // 취약 = 틀린 적이 있거나 ease가 기본값 아래로 내려간 카드.
  // lapses·ease 값을 그대로 넘겨, 화면이 색이 아니라 숫자로 상태를 보여줄 수 있게 한다.
  const weak = records
    .filter((c) => c.lapses > 0 || c.ease < DEFAULT_EASE)
    .sort((a, b) => b.lapses - a.lapses || a.ease - b.ease || (a.cardId < b.cardId ? -1 : 1))
    .slice(0, WEAK_LIMIT)
    .map((c) => ({ cardId: c.cardId, lapses: c.lapses, ease: c.ease }))

  return {
    total: allCards.length,
    studied: records.length,
    due,
    mastered,
    weak,
  }
}
