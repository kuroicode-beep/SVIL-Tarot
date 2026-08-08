import { getDb, type HistoryEntry, type HistoryKind, type ReadingOutcome } from './db'
import type { DrawnCard } from '../lib/cards'

export type { HistoryEntry, HistoryKind, ReadingOutcome }

export async function saveHistory(
  entry: Omit<HistoryEntry, 'id' | 'createdAt'> & { id?: string; createdAt?: string },
): Promise<HistoryEntry> {
  const full: HistoryEntry = {
    ...entry,
    id: entry.id ?? crypto.randomUUID(),
    createdAt: entry.createdAt ?? new Date().toISOString(),
  }
  const db = await getDb()
  await db.put('history', full)
  return full
}

export async function listHistory(): Promise<HistoryEntry[]> {
  const db = await getDb()
  const all = await db.getAllFromIndex('history', 'by-date')
  return all.reverse()
}

export async function getHistory(id: string): Promise<HistoryEntry | undefined> {
  const db = await getDb()
  return db.get('history', id)
}

export async function deleteHistory(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('history', id)
}

export async function clearHistory(): Promise<void> {
  const db = await getDb()
  await db.clear('history')
}

/**
 * 리딩이 실제로 어땠는지를 사후에 붙인다.
 * 예측만 쌓이고 결과가 없으면 실력이 늘었는지 확인할 객관 지표가 생기지 않는다.
 */
export async function setOutcome(
  id: string,
  outcome: ReadingOutcome,
  outcomeNote?: string,
): Promise<HistoryEntry | undefined> {
  const db = await getDb()
  const entry = await db.get('history', id)
  if (!entry) return undefined
  const next: HistoryEntry = {
    ...entry,
    outcome,
    outcomeNote: outcomeNote?.trim() || undefined,
    outcomeAt: new Date().toISOString(),
  }
  await db.put('history', next)
  return next
}

export type { DrawnCard }
