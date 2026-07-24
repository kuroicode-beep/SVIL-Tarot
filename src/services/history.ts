import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { DrawnCard } from '../lib/cards'

export type HistoryKind = 'practice' | 'ai' | 'soul' | 'learn'

export type HistoryEntry = {
  id: string
  kind: HistoryKind
  title: string
  createdAt: string
  cards?: DrawnCard[]
  userNote?: string
  aiText?: string
  meta?: Record<string, string | number>
}

interface TarotDB extends DBSchema {
  history: {
    key: string
    value: HistoryEntry
    indexes: { 'by-date': string }
  }
}

let dbPromise: Promise<IDBPDatabase<TarotDB>> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<TarotDB>('svil-tarot', 1, {
      upgrade(db) {
        const store = db.createObjectStore('history', { keyPath: 'id' })
        store.createIndex('by-date', 'createdAt')
      },
    })
  }
  return dbPromise
}

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
