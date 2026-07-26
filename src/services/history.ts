import { getDb, type HistoryEntry, type HistoryKind } from './db'
import type { DrawnCard } from '../lib/cards'

export type { HistoryEntry, HistoryKind }

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

export type { DrawnCard }
