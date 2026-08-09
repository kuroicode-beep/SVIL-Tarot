// src/services/db.ts — IndexedDB 스키마·연결 단일 소스.
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
  | 'daily'

export type ServiceType =
  | 'practice'
  | 'ai'
  | 'soul'
  | 'saju'
  | 'compat'
  | 'nameology'
  | 'naming'
  | 'other'

/** 리딩이 실제로 어떻게 됐는지. 색이 아니라 값으로 남겨 통계에 쓴다. */
export type ReadingOutcome = 'hit' | 'partial' | 'miss'

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
  /** 사후 피드백 — 이 리딩이 실제로 맞았는지. v3에서 추가. */
  outcome?: ReadingOutcome
  outcomeNote?: string
  outcomeAt?: string
  meta?: Record<string, string | number>
}

/** 카드별 사용자 개인 키워드·해석. AI 프롬프트에 주입해 개인화한다. v3에서 추가. */
export type CardNote = {
  cardId: string
  keywords?: string
  meaning?: string
  updatedAt: string
}

/** 오늘의 한 장 — 날짜(YYYY-MM-DD)를 키로 하루치 결과를 캐시한다. v3에서 추가. */
export type DailyDraw = {
  date: string
  card: DrawnCard
  aiText?: string
  createdAt: string
}

/** SM-2 간격반복 학습 상태. 카드별로 하나. v4에서 추가. */
export type SrsCard = {
  cardId: string
  /** 난이도 계수. 초기 2.5, 하한 1.3. */
  ease: number
  /** 다음 복습까지 일수. */
  interval: number
  /** 연속 정답 횟수. 틀리면 0으로 리셋. */
  reps: number
  lapses: number
  /** ISO. 이 시각이 지나면 복습 대상. by-due 인덱스로 조회한다. */
  dueAt: string
  updatedAt: string
}

interface TarotDB extends DBSchema {
  history: {
    key: string
    value: HistoryEntry
    indexes: { 'by-date': string; 'by-customer': string }
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
  cardNotes: {
    key: string
    value: CardNote
  }
  dailyDraws: {
    key: string
    value: DailyDraw
  }
  srs: {
    key: string
    value: SrsCard
    indexes: { 'by-due': string }
  }
}

export const DB_NAME = 'svil-tarot'
export const DB_VERSION = 4

let dbPromise: Promise<IDBPDatabase<TarotDB>> | null = null

/**
 * 연결 캐시를 비운다. 실패한 Promise를 영구 캐시하면 앱이 영영 복구되지 않으므로
 * 실패·blocked·강제종료 시 반드시 여기를 거쳐 다음 호출에서 재시도되게 한다.
 */
function resetDb(target?: Promise<IDBPDatabase<TarotDB>>) {
  if (!target || dbPromise === target) dbPromise = null
}

export function getDb(): Promise<IDBPDatabase<TarotDB>> {
  if (!dbPromise) {
    const pending: Promise<IDBPDatabase<TarotDB>> = openDB<TarotDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, tx) {
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
        if (oldVersion < 3) {
          // 고객 삭제 시 기록까지 원자적으로 지우려면 history에도 고객 인덱스가 필요하다.
          // 기존 스토어의 인덱스는 versionchange 트랜잭션(tx)에서 꺼내 만든다.
          const historyStore = tx.objectStore('history')
          if (!historyStore.indexNames.contains('by-customer')) {
            historyStore.createIndex('by-customer', 'customerId')
          }
          if (!db.objectStoreNames.contains('cardNotes')) {
            db.createObjectStore('cardNotes', { keyPath: 'cardId' })
          }
          if (!db.objectStoreNames.contains('dailyDraws')) {
            db.createObjectStore('dailyDraws', { keyPath: 'date' })
          }
        }
        if (oldVersion < 4) {
          // 간격반복 학습. 오늘 복습할 카드를 뽑아야 하므로 dueAt 인덱스가 필수다.
          if (!db.objectStoreNames.contains('srs')) {
            const srs = db.createObjectStore('srs', { keyPath: 'cardId' })
            srs.createIndex('by-due', 'dueAt')
          }
        }
      },
      // 다른 탭이 옛 버전을 붙들고 있으면 업그레이드가 무한 대기한다. 사용자에게 알릴 수 있게 캐시를 비운다.
      blocked() {
        resetDb()
      },
      // 이 탭이 다른 탭의 업그레이드를 막고 있는 경우 — 연결을 닫아 길을 터준다.
      blocking() {
        void dbPromise?.then((db) => db.close()).catch(() => {})
        resetDb()
      },
      terminated() {
        resetDb()
      },
    })
    // 실패한 Promise가 캐시에 남으면 새로고침 전까지 앱이 복구되지 않는다.
    pending.catch(() => resetDb(pending))
    dbPromise = pending
  }
  return dbPromise
}

/**
 * 서비스 라벨은 i18n 키만 들고 있는다.
 * db 계층이 i18n을 import하면 순환 의존이 생기고 5개 언어 중 한국어만 새어 나온다.
 */
export const SERVICE_LABEL_KEYS: Record<ServiceType, string> = {
  practice: 'kind_practice',
  ai: 'kind_ai',
  soul: 'kind_soul',
  saju: 'kind_saju',
  compat: 'kind_compat',
  nameology: 'kind_nameology',
  naming: 'kind_naming',
  other: 'kind_other',
}
