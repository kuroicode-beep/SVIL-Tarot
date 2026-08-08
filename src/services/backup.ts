// src/services/backup.ts — IndexedDB 전체 데이터를 JSON 파일로 내보내고 되돌리는 수동 백업 모듈.
import {
  getDb,
  DB_VERSION,
  type CardNote,
  type Consultation,
  type Customer,
  type DailyDraw,
  type HistoryEntry,
} from './db'

/** 파일 서명. 확장자만으로는 남의 JSON과 구분되지 않아 복원 전 이 값으로 걸러낸다. */
export const BACKUP_FORMAT = 'svil-tarot-backup'

export type BackupFile = {
  format: 'svil-tarot-backup'
  version: number
  exportedAt: string
  counts: Record<string, number>
  data: {
    history: HistoryEntry[]
    customers: Customer[]
    consultations: Consultation[]
    cardNotes: CardNote[]
    dailyDraws: DailyDraw[]
  }
}

type StoreName = keyof BackupFile['data']

type StoreSpec = {
  name: StoreName
  /** IndexedDB keyPath. 비어 있으면 put 자체가 실패하므로 비어 있지 않은 문자열을 요구한다. */
  keyPath: string
  /** 없으면 화면이 깨지는 필드. 빈 문자열은 허용하고 타입만 본다. */
  requiredStrings: readonly string[]
  requiredObjects?: readonly string[]
}

// 복원 순서·검증 규칙을 한 곳에 모아 둔다. 스토어가 늘면 여기만 고치면 된다.
const STORE_SPECS: readonly StoreSpec[] = [
  { name: 'history', keyPath: 'id', requiredStrings: ['kind', 'title', 'createdAt'] },
  { name: 'customers', keyPath: 'id', requiredStrings: ['name', 'createdAt', 'updatedAt'] },
  {
    name: 'consultations',
    keyPath: 'id',
    requiredStrings: ['customerId', 'serviceType', 'title', 'createdAt'],
  },
  { name: 'cardNotes', keyPath: 'cardId', requiredStrings: ['updatedAt'] },
  { name: 'dailyDraws', keyPath: 'date', requiredStrings: ['createdAt'], requiredObjects: ['card'] },
]

/** 파일명은 SVIL 규칙(공백 금지·언더스코어)을 따르고, 정렬이 되도록 로컬 시각을 YYYYMMDD_HHmm으로 쓴다. */
function timestamp(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
  return `${date}_${pad(now.getHours())}${pad(now.getMinutes())}`
}

export async function exportBackup(): Promise<{ blob: Blob; filename: string; count: number }> {
  const db = await getDb()
  // 시각을 두 번 읽으면 분 경계에서 파일명과 exportedAt이 1분 어긋난다. 한 번만 읽어 같이 쓴다.
  const now = new Date()
  // 스토어를 하나씩 순차로 읽으면 그 사이 다른 화면의 쓰기가 끼어들어 스냅숏이 어긋난다.
  const [history, customers, consultations, cardNotes, dailyDraws] = await Promise.all([
    db.getAll('history'),
    db.getAll('customers'),
    db.getAll('consultations'),
    db.getAll('cardNotes'),
    db.getAll('dailyDraws'),
  ])

  const data: BackupFile['data'] = { history, customers, consultations, cardNotes, dailyDraws }
  const counts: Record<string, number> = {}
  let count = 0
  for (const spec of STORE_SPECS) {
    const rows = data[spec.name]
    counts[spec.name] = rows.length
    count += rows.length
  }

  const file: BackupFile = {
    format: BACKUP_FORMAT,
    version: DB_VERSION,
    exportedAt: now.toISOString(),
    counts,
    data,
  }
  // 사람이 열어 볼 수도 있는 파일이라 들여쓰기를 남긴다.
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
  return { blob, filename: `${BACKUP_FORMAT}_${timestamp(now)}.json`, count }
}

export function downloadBackup(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.rel = 'noopener'
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    a.remove()
  } finally {
    // 클릭 직후 바로 해제하면 일부 브라우저가 저장을 시작하기 전에 URL을 잃는다.
    // 그렇다고 안 풀면 Blob이 탭이 닫힐 때까지 메모리에 남으므로 한 박자 뒤 반드시 해제한다.
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

type RawBackup = { format: string; data: Record<string, unknown> }

/** 파싱 결과를 BackupFile로 단정하지 않는다. 내용은 사용자가 가져온 파일이라 신뢰할 수 없다. */
function isRawBackup(value: unknown): value is RawBackup {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  if (obj.format !== BACKUP_FORMAT) return false
  return typeof obj.data === 'object' && obj.data !== null && !Array.isArray(obj.data)
}

/** 깨진 레코드 하나가 스토어 전체 트랜잭션을 abort시키는 걸 막으려면 넣기 전에 걸러야 한다. */
function isValidRecord(spec: StoreSpec, value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const obj = value as Record<string, unknown>
  const key = obj[spec.keyPath]
  if (typeof key !== 'string' || key.length === 0) return false
  for (const field of spec.requiredStrings) {
    if (typeof obj[field] !== 'string') return false
  }
  for (const field of spec.requiredObjects ?? []) {
    const nested = obj[field]
    if (typeof nested !== 'object' || nested === null) return false
  }
  return true
}

/**
 * 스토어 하나를 트랜잭션 하나로 밀어 넣는다.
 * 스토어를 나눠 두면 한 스토어가 통째로 실패해도 다른 스토어는 살아남고,
 * 그래도 abort가 나면 레코드 단위로 다시 시도해 넣을 수 있는 것만이라도 건진다.
 */
async function putAll(name: StoreName, rows: unknown[]): Promise<number> {
  const db = await getDb()
  try {
    const tx = db.transaction(name, 'readwrite')
    // idb는 트랜잭션을 만드는 순간 done Promise를 만들어 두고 abort 때 그걸 거절한다.
    // 아래 put이 먼저 던지면 done까지 못 가 아무도 안 잡은 거절이 콘솔에 뜨므로 핸들러를 미리 붙인다.
    const done = tx.done
    void done.catch(() => {})
    // 검증을 통과한 해당 스토어의 레코드지만, idb 제네릭이 유니온 스토어명을 좁히지 못해 캐스팅한다.
    await Promise.all(rows.map((row) => tx.store.put(row as never)))
    await done
    return rows.length
  } catch {
    let written = 0
    for (const row of rows) {
      try {
        await db.put(name, row as never)
        written += 1
      } catch {
        // 개별 레코드 실패는 삼킨다 — 나머지 복원을 막지 않는 게 우선이다.
      }
    }
    return written
  }
}

export async function importBackup(file: File): Promise<{ count: number; skipped: number }> {
  const text = await file.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    // 사용자 문구가 아니라 sentinel — 호출부가 t('backup_bad_file')로 번역한다.
    throw new Error('BACKUP_BAD_FILE')
  }
  if (!isRawBackup(parsed)) throw new Error('BACKUP_BAD_FILE')

  let count = 0
  let skipped = 0
  for (const spec of STORE_SPECS) {
    // 구버전 백업에는 없는 스토어다. 없는 건 조용히 건너뛰고 있는 것만 복원한다.
    const rows = parsed.data[spec.name]
    if (!Array.isArray(rows)) continue
    const valid = rows.filter((row) => isValidRecord(spec, row))
    skipped += rows.length - valid.length
    if (valid.length === 0) continue
    const written = await putAll(spec.name, valid)
    skipped += valid.length - written
    count += written
  }
  return { count, skipped }
}
