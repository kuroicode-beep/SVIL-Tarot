// src/services/customSpreads.ts — 사용자 정의 스프레드 CRUD·기본 프리셋 병합·JSON 내보내기/가져오기.
import presetData from '../data/spreads.json'
import { getDb, type CustomSpread } from './db'

export type { CustomSpread }

// 파일 내려받기 절차(anchor 클릭 + revokeObjectURL)는 백업 모듈과 완전히 같다.
// 같은 코드를 두 벌 두면 한쪽만 고쳐져 어긋나므로 그대로 재사용한다.
export { downloadBackup as downloadSpreadsFile } from './backup'

/** 프리셋과 사용자 정의를 화면이 구분 없이 쓰기 위한 공통 모양. */
export type SpreadPosition = { key: string; labelKo: string }

export type SpreadOption = {
  id: string
  nameKo: string
  cardCount: number
  positions: SpreadPosition[]
  /** 색이 아니라 값으로 구분한다 — 화면은 이 값으로 '내 스프레드' 라벨을 붙인다. */
  custom: boolean
}

/** 사용자 스프레드 id 접두어. 기본 프리셋(one/three/five)과 절대 겹치지 않게 강제한다. */
export const CUSTOM_ID_PREFIX = 'custom_'

/** 내보내기 파일 서명. 확장자만으로는 남의 JSON과 구분되지 않아 가져오기 전에 이 값으로 거른다. */
export const SPREADS_FORMAT = 'svil-tarot-spreads'

/**
 * 자리 개수 상한.
 * 무한정 추가하면 카드 뽑기·낭독·화면이 전부 감당하지 못하고, 저시력 화면에서는 목록이 길어질수록
 * 현재 위치를 잃는다. 실제 타로 스프레드도 이 범위를 넘지 않는다.
 */
export const MAX_POSITIONS = 24

// 서비스 계층은 로케일을 모른다. 사용자 문구 대신 sentinel만 던지고 번역은 화면에서 한다.
export const ERR_NAME_REQUIRED = 'SPREAD_NAME_REQUIRED'
export const ERR_NO_POSITIONS = 'SPREAD_NO_POSITIONS'
export const ERR_LABEL_REQUIRED = 'SPREAD_LABEL_REQUIRED'
export const ERR_BAD_KEY = 'SPREAD_BAD_KEY'
export const ERR_DUP_KEY = 'SPREAD_DUP_KEY'
export const ERR_TOO_MANY = 'SPREAD_TOO_MANY'
export const ERR_BAD_FILE = 'SPREAD_BAD_FILE'

type PresetSpread = {
  id: string
  nameKo: string
  cardCount: number
  positions: SpreadPosition[]
}

// spreads.json은 nameEn·description·quiz도 들고 있지만 스프레드 선택에는 필요 없다.
const presets: PresetSpread[] = presetData

/**
 * 기본 프리셋만 담은 동기 목록.
 * 스프레드 선택은 리딩의 입구라 첫 렌더가 빈 목록이면 안 된다(선택값이 없는 순간
 * '뽑기'를 누르면 화면이 죽는다). 화면은 이걸로 즉시 그리고, IndexedDB 응답이 오면
 * allSpreads() 결과로 갈아 끼운다.
 */
export const PRESET_SPREADS: SpreadOption[] = presets.map((p) => ({
  id: p.id,
  nameKo: p.nameKo,
  cardCount: p.cardCount,
  positions: p.positions.map((x) => ({ key: x.key, labelKo: x.labelKo })),
  custom: false,
}))

export type SpreadsFile = {
  format: typeof SPREADS_FORMAT
  version: number
  exportedAt: string
  count: number
  spreads: CustomSpread[]
}

/**
 * crypto.randomUUID는 보안 컨텍스트에서만 보장된다. 없다고 저장 자체가 막히면 안 되므로 대체 경로를 둔다.
 *
 * 대체 경로는 반드시 난수를 '앞'에 둔다.
 * 시각을 앞에 두면 Date.now().toString(36)이 8자라, 같은 밀리초에 만든 토큰들이 앞 8자를 통째로 공유한다.
 * 앞에서 잘라 쓰는 newPositionKey()는 그러면 사실상 2자만 남아 자리 24개에서 약 19% 확률로 겹쳤고,
 * 겹치면 saveCustomSpread가 SPREAD_DUP_KEY로 저장 자체를 막아 사용자가 빠져나올 수 없었다.
 */
function randomToken(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID().replace(/-/g, '')
  // getRandomValues는 randomUUID와 달리 비보안 컨텍스트(http LAN 접속 등)에서도 쓸 수 있다.
  if (c && typeof c.getRandomValues === 'function') {
    const bytes = new Uint8Array(16)
    c.getRandomValues(bytes)
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  }
  // Math.random().toString(36)은 길이가 일정하지 않다. 잘라 쓸 만큼 채운 뒤에야 시각을 뒤에 붙인다.
  let rand = ''
  while (rand.length < 16) rand += Math.random().toString(36).slice(2)
  return `${rand.slice(0, 16)}${Date.now().toString(36)}`
}

/** 새 스프레드 id. 화면이 '새로 만들기'에서 쓴다. */
export function newSpreadId(): string {
  return `${CUSTOM_ID_PREFIX}${randomToken()}`
}

/**
 * 새 자리 식별자.
 * 사용자에게 보이지 않는 값이라 화면이 자동으로 발급한다 — 사람이 키를 직접 입력하면 반드시 중복이 난다.
 */
export function newPositionKey(): string {
  return `p${randomToken().slice(0, 10)}`
}

/**
 * id를 사용자 영역으로 밀어 넣는다.
 * 기본 프리셋과 같은 id로 저장되면 목록에서 서로를 가리고, 저장된 리딩의 spreadId 해석도 어긋난다.
 * 접두어를 유지하면 다른 기기에서 다시 가져와도 같은 스프레드로 덮어써진다(중복 증식 방지).
 */
function normalizeId(raw: string | undefined): string {
  const id = (raw ?? '').trim()
  if (!id) return newSpreadId()
  if (id.startsWith(CUSTOM_ID_PREFIX)) return id
  return `${CUSTOM_ID_PREFIX}${id}`
}

/** 파일명은 SVIL 규칙(공백 금지·언더스코어)을 따르고, 정렬되도록 로컬 시각을 YYYYMMDD_HHmm으로 쓴다. */
function timestamp(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
  return `${date}_${pad(now.getHours())}${pad(now.getMinutes())}`
}

export async function listCustomSpreads(): Promise<CustomSpread[]> {
  const db = await getDb()
  const rows = await db.getAllFromIndex('customSpreads', 'by-updated')
  // by-updated는 오름차순이라 방금 고친 스프레드가 맨 아래로 밀린다. 최근 것부터 보여준다.
  return rows.reverse()
}

export async function getCustomSpread(id: string): Promise<CustomSpread | undefined> {
  const db = await getDb()
  return db.get('customSpreads', id)
}

/**
 * 저장. id가 비어 있으면 새로 만들고, 있으면 그 스프레드를 덮어쓴다.
 * cardCount는 입력값을 믿지 않는다 — positions와 어긋나면 뽑는 장 수와 자리 수가 달라져 리딩이 깨진다.
 */
export async function saveCustomSpread(
  input: Omit<CustomSpread, 'createdAt' | 'updatedAt'> & { createdAt?: string },
): Promise<CustomSpread> {
  const nameKo = (input.nameKo ?? '').trim()
  if (!nameKo) throw new Error(ERR_NAME_REQUIRED)

  const raw = Array.isArray(input.positions) ? input.positions : []
  if (raw.length === 0) throw new Error(ERR_NO_POSITIONS)
  if (raw.length > MAX_POSITIONS) throw new Error(ERR_TOO_MANY)

  const seen = new Set<string>()
  const positions: SpreadPosition[] = raw.map((p) => {
    const key = (p?.key ?? '').trim()
    if (!key) throw new Error(ERR_BAD_KEY)
    // key는 React 목록 키이자 저장된 리딩의 자리 식별자다. 겹치면 화면이 카드를 바꿔치고 기록도 어긋난다.
    if (seen.has(key)) throw new Error(ERR_DUP_KEY)
    seen.add(key)
    const labelKo = (p?.labelKo ?? '').trim()
    if (!labelKo) throw new Error(ERR_LABEL_REQUIRED)
    return { key, labelKo }
  })

  const now = new Date().toISOString()
  const row: CustomSpread = {
    id: normalizeId(input.id),
    nameKo,
    cardCount: positions.length,
    positions,
    createdAt: input.createdAt ?? now,
    updatedAt: now,
  }
  const db = await getDb()
  await db.put('customSpreads', row)
  return row
}

export async function deleteCustomSpread(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('customSpreads', id)
}

/** 저장된 레코드도 신뢰하지 않는다 — 예전 파일에서 가져온 것이 섞여 있을 수 있다. */
function toOption(s: CustomSpread): SpreadOption | null {
  if (!Array.isArray(s.positions) || s.positions.length === 0) return null
  const positions = s.positions.map((p) => ({ key: p.key, labelKo: p.labelKo }))
  return {
    id: s.id,
    nameKo: s.nameKo,
    cardCount: positions.length,
    positions,
    custom: true,
  }
}

/**
 * 기본 프리셋 + 사용자 정의를 합쳐 돌려준다. 스프레드를 고르는 화면은 이것만 쓰면 된다.
 * 프리셋을 앞에 두어 기본 선택(three)이 흔들리지 않게 한다.
 */
export async function allSpreads(): Promise<SpreadOption[]> {
  // 얕은 복사 — 아래에서 push하므로 모듈 상수를 그대로 쓰면 호출할 때마다 프리셋 목록이 늘어난다.
  const out: SpreadOption[] = [...PRESET_SPREADS]

  let mine: CustomSpread[]
  try {
    mine = await listCustomSpreads()
  } catch {
    // 스프레드 선택은 리딩의 입구다. IndexedDB가 막혀도 기본 프리셋만으로 계속 볼 수 있어야 한다.
    return out
  }

  const seen = new Set(out.map((o) => o.id))
  for (const s of mine) {
    if (seen.has(s.id)) continue
    const opt = toOption(s)
    if (!opt) continue
    seen.add(s.id)
    out.push(opt)
  }
  return out
}

export function exportSpreads(spreads: CustomSpread[]): { blob: Blob; filename: string } {
  // 시각을 두 번 읽으면 분 경계에서 파일명과 exportedAt이 1분 어긋난다. 한 번만 읽어 같이 쓴다.
  const now = new Date()
  const file: SpreadsFile = {
    format: SPREADS_FORMAT,
    version: 1,
    exportedAt: now.toISOString(),
    count: spreads.length,
    spreads,
  }
  // 사람이 열어 볼 수도 있는 파일이라 들여쓰기를 남긴다.
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
  return { blob, filename: `${SPREADS_FORMAT}_${timestamp(now)}.json` }
}

type RawFile = { format: string; spreads: unknown[] }

/** 파싱 결과를 SpreadsFile로 단정하지 않는다. 내용은 사용자가 가져온 파일이라 신뢰할 수 없다. */
function isRawFile(value: unknown): value is RawFile {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  if (obj.format !== SPREADS_FORMAT) return false
  return Array.isArray(obj.spreads)
}

/**
 * 가져온 한 건을 저장 가능한 모양으로 손본다. 살릴 수 없으면 null.
 * 자리 식별자는 사용자에게 보이지 않는 내부 값이라, 비었거나 겹치면 파일을 버리는 대신 번호로 다시 매긴다.
 */
function sanitize(value: unknown, now: string): CustomSpread | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const obj = value as Record<string, unknown>

  const nameKo = typeof obj.nameKo === 'string' ? obj.nameKo.trim() : ''
  if (!nameKo) return null

  const rawPositions = obj.positions
  if (!Array.isArray(rawPositions) || rawPositions.length === 0) return null
  if (rawPositions.length > MAX_POSITIONS) return null

  const seen = new Set<string>()
  const positions: SpreadPosition[] = []
  for (let i = 0; i < rawPositions.length; i += 1) {
    const p = rawPositions[i]
    if (typeof p !== 'object' || p === null) return null
    const src = p as Record<string, unknown>
    let key = typeof src.key === 'string' ? src.key.trim() : ''
    if (!key || seen.has(key)) key = `p${i + 1}_${randomToken().slice(0, 6)}`
    seen.add(key)
    const label = typeof src.labelKo === 'string' ? src.labelKo.trim() : ''
    // 라벨이 비면 자리 번호만 남긴다. 서비스 계층은 로케일을 몰라 번역 문구를 만들 수 없다.
    positions.push({ key, labelKo: label || String(i + 1) })
  }

  const createdAt = typeof obj.createdAt === 'string' && obj.createdAt ? obj.createdAt : now
  return {
    id: normalizeId(typeof obj.id === 'string' ? obj.id : ''),
    nameKo,
    cardCount: positions.length,
    positions,
    createdAt,
    updatedAt: now,
  }
}

export async function importSpreads(file: File): Promise<{ count: number }> {
  const text = await file.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error(ERR_BAD_FILE)
  }
  if (!isRawFile(parsed)) throw new Error(ERR_BAD_FILE)

  const now = new Date().toISOString()
  const db = await getDb()
  let count = 0
  for (const raw of parsed.spreads) {
    const row = sanitize(raw, now)
    if (!row) continue
    try {
      await db.put('customSpreads', row)
      count += 1
    } catch {
      // 한 건이 실패해도 나머지는 들여온다 — 파일 전체를 잃는 쪽이 훨씬 나쁘다.
    }
  }
  return { count }
}
