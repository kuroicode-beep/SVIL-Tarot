// src/lib/daily.ts — "오늘의 한 장" 날짜 시드 결정적 뽑기·저장·연속일수 계산.
import { allCards, type DrawnCard } from './cards'
import { getDb, type DailyDraw } from '../services/db'

/** 두 자리 0 패딩. Intl/toISOString은 로캘·UTC에 끌려가므로 직접 만든다. */
function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * 로컬 기준 YYYY-MM-DD.
 * toISOString은 UTC라 KST 자정 직후에 어제 날짜가 나온다. 그래서 getFullYear/getMonth/getDate만 쓴다.
 */
export function todayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/**
 * xmur3 — 문자열을 32비트 시드로 접는다.
 * 날짜 문자열은 하루에 한 글자만 바뀌므로, 확산이 약한 해시를 쓰면 인접한 날이 같은 카드로 몰린다.
 */
function xmur3(str: string): number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  return (h ^ (h >>> 16)) >>> 0
}

/**
 * mulberry32 — 시드 하나로 [0,1) 난수열을 만든다.
 * 상태가 32비트뿐이라 서버 없이도 같은 시드면 항상 같은 순서가 재현된다.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * 날짜 문자열을 시드로 하는 결정적 뽑기. 같은 날짜면 카드도 정/역방향도 항상 같다.
 * 난수를 두 번 뽑되 같은 스트림에서 이어 뽑아, 카드와 방향이 한 시드로 함께 고정되게 한다.
 */
export function seededDraw(dateKey: string): DrawnCard {
  if (allCards.length === 0) throw new Error('Empty deck: cards.json has no cards')
  const rand = mulberry32(xmur3(dateKey))
  const card = allCards[Math.floor(rand() * allCards.length)]
  return {
    id: card.id,
    nameKo: card.nameKo,
    nameEn: card.nameEn,
    isReversed: rand() < 0.5,
  }
}

/**
 * 오늘 카드를 읽고, 없으면 뽑아 저장한 뒤 돌려준다.
 * 카드 자체는 시드로 재현되지만, 기록이 있어야 연속일수(getStreak)를 셀 수 있어 항상 저장한다.
 */
export async function getOrCreateDailyDraw(dateKey: string = todayKey()): Promise<DailyDraw> {
  const db = await getDb()
  // 조회와 생성을 한 트랜잭션에 묶는다. 따로 하면 AI 해설 저장과 겹칠 때
  // 뒤늦게 도착한 생성 put이 aiText 없는 레코드로 덮어써 해설이 사라진다.
  const tx = db.transaction('dailyDraws', 'readwrite')
  const existing = await tx.store.get(dateKey)
  if (existing) {
    await tx.done
    return existing
  }
  const created: DailyDraw = {
    date: dateKey,
    card: seededDraw(dateKey),
    createdAt: new Date().toISOString(),
  }
  await tx.store.put(created)
  await tx.done
  return created
}

/**
 * 오늘 카드에 AI 해설을 붙여 저장한다.
 * 기존 레코드를 먼저 확보해 createdAt·card를 보존한다(덮어쓰면 첫 방문 시각이 날아간다).
 */
export async function saveDailyAiText(dateKey: string, aiText: string): Promise<void> {
  const current = await getOrCreateDailyDraw(dateKey)
  const db = await getDb()
  await db.put('dailyDraws', { ...current, aiText })
}

/**
 * 오늘 기준 연속 일수. 오늘 기록이 없으면 연속이 끊긴 것으로 보고 0을 돌려준다.
 * 커서를 정오로 잡아 서머타임이 있는 지역에서도 하루씩 빼는 계산이 날짜를 건너뛰지 않게 한다.
 */
export async function getStreak(): Promise<number> {
  const db = await getDb()
  const keys = await db.getAllKeys('dailyDraws')
  const saved = new Set(keys)
  const now = new Date()
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0)
  let streak = 0
  while (saved.has(todayKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}
