import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { DrawnCard } from '../lib/cards'

export type HistoryKind =
  | 'practice'
  | 'ai'
  | 'soul'
  | 'learn'
  | 'saju'
  | 'compat'
  | 'nameology'
  | 'naming'

export type ServiceType =
  | 'practice'
  | 'ai'
  | 'soul'
  | 'saju'
  | 'compat'
  | 'nameology'
  | 'naming'
  | 'other'

export type Customer = {
  id: string
  name: string
  phone?: string
  email?: string
  gender?: 'female' | 'male' | 'other' | ''
  birthDate?: string
  birthTime?: string
  calendarType?: 'solar' | 'lunar'
  notes?: string
  createdAt: string
  updatedAt: string
}

export type Consultation = {
  id: string
  customerId: string
  serviceType: ServiceType
  title: string
  summary: string
  detail?: string
  resultText?: string
  historyId?: string
  meta?: Record<string, string | number | boolean>
  createdAt: string
}

export type HistoryEntry = {
  id: string
  kind: HistoryKind
  title: string
  createdAt: string
  cards?: DrawnCard[]
  userNote?: string
  aiText?: string
  customerId?: string
  consultationId?: string
  meta?: Record<string, string | number>
}

interface TarotDB extends DBSchema {
  history: {
    key: string
    value: HistoryEntry
    indexes: { 'by-date': string }
  }
  customers: {
    key: string
    value: Customer
    indexes: { 'by-name': string; 'by-updated': string }
  }
  consultations: {
    key: string
    value: Consultation
    indexes: { 'by-customer': string; 'by-date': string; 'by-service': string }
  }
}

let dbPromise: Promise<IDBPDatabase<TarotDB>> | null = null

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<TarotDB>('svil-tarot', 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const store = db.createObjectStore('history', { keyPath: 'id' })
          store.createIndex('by-date', 'createdAt')
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains('history')) {
            const store = db.createObjectStore('history', { keyPath: 'id' })
            store.createIndex('by-date', 'createdAt')
          }
          const customers = db.createObjectStore('customers', { keyPath: 'id' })
          customers.createIndex('by-name', 'name')
          customers.createIndex('by-updated', 'updatedAt')
          const consultations = db.createObjectStore('consultations', { keyPath: 'id' })
          consultations.createIndex('by-customer', 'customerId')
          consultations.createIndex('by-date', 'createdAt')
          consultations.createIndex('by-service', 'serviceType')
        }
      },
    })
  }
  return dbPromise
}

export const SERVICE_LABELS: Record<ServiceType, string> = {
  practice: '실전 타로',
  ai: 'AI 타로',
  soul: '소울카드',
  saju: '사주풀이',
  compat: '궁합',
  nameology: '성명학',
  naming: '작명',
  other: '기타',
}
