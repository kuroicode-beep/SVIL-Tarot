import { getDb, type Customer, type Consultation, type ServiceType, SERVICE_LABEL_KEYS } from './db'

export { type Customer, type Consultation, type ServiceType, SERVICE_LABEL_KEYS }

export async function listCustomers(): Promise<Customer[]> {
  const db = await getDb()
  const all = await db.getAllFromIndex('customers', 'by-updated')
  return all.reverse()
}

export async function getCustomer(id: string): Promise<Customer | undefined> {
  const db = await getDb()
  return db.get('customers', id)
}

export async function saveCustomer(
  input: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> & {
    id?: string
    createdAt?: string
  },
): Promise<Customer> {
  const now = new Date().toISOString()
  // 수정 폼에는 createdAt이 없다. 이전 레코드에서 살려두지 않으면 put이 통째로 덮어써
  // 최초 등록일이 매 수정마다 사라진다(복구 불가).
  const prev = input.id ? await getCustomer(input.id) : undefined
  const full: Customer = {
    name: input.name.trim(),
    phone: input.phone?.trim() || '',
    email: input.email?.trim() || '',
    gender: input.gender ?? '',
    birthDate: input.birthDate || '',
    birthTime: input.birthTime || '',
    calendarType: input.calendarType ?? 'solar',
    notes: input.notes || '',
    id: input.id ?? crypto.randomUUID(),
    createdAt: input.createdAt ?? prev?.createdAt ?? now,
    updatedAt: now,
  }
  if (!full.name) throw new Error('CUSTOMER_NAME_REQUIRED')
  const db = await getDb()
  await db.put('customers', full)
  return full
}

/**
 * 고객 삭제는 상담뿐 아니라 history까지 지운다.
 * history 항목은 AI 리딩 전문(aiText)과 customerId를 그대로 담고 있어,
 * 남겨두면 "고객과 기록을 모두 삭제"라는 안내와 달리 개인정보가 기록 화면에 계속 노출된다.
 * 인덱스 조회도 트랜잭션 안에서 해야 그 사이 추가된 레코드가 새지 않는다.
 */
export async function deleteCustomer(id: string): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(['customers', 'consultations', 'history'], 'readwrite')
  const cons = await tx.objectStore('consultations').index('by-customer').getAllKeys(id)
  const hist = await tx.objectStore('history').index('by-customer').getAllKeys(id)
  await Promise.all([
    tx.objectStore('customers').delete(id),
    ...cons.map((key) => tx.objectStore('consultations').delete(key)),
    ...hist.map((key) => tx.objectStore('history').delete(key)),
  ])
  await tx.done
}

export async function listConsultations(customerId?: string): Promise<Consultation[]> {
  const db = await getDb()
  if (customerId) {
    const list = await db.getAllFromIndex('consultations', 'by-customer', customerId)
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
  const all = await db.getAllFromIndex('consultations', 'by-date')
  return all.reverse()
}

export async function getConsultation(id: string): Promise<Consultation | undefined> {
  const db = await getDb()
  return db.get('consultations', id)
}

export async function saveConsultation(
  input: Omit<Consultation, 'id' | 'createdAt'> & { id?: string; createdAt?: string },
): Promise<Consultation> {
  const full: Consultation = {
    ...input,
    id: input.id ?? crypto.randomUUID(),
    createdAt: input.createdAt ?? new Date().toISOString(),
    summary: input.summary.slice(0, 500),
  }
  const db = await getDb()
  await db.put('consultations', full)
  const customer = await db.get('customers', full.customerId)
  if (customer) {
    await db.put('customers', { ...customer, updatedAt: new Date().toISOString() })
  }
  return full
}

export async function deleteConsultation(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('consultations', id)
}

export async function clearConsultations(): Promise<void> {
  const db = await getDb()
  await db.clear('consultations')
}

/**
 * id를 받을 수 있어야 같은 리딩을 두 번 저장했을 때 새 상담이 생기지 않고 덮어써진다.
 * (저장 버튼 연타·상단바 저장 중복 호출로 상담이 계속 늘어나던 문제)
 */
export async function recordServiceConsultation(opts: {
  id?: string
  createdAt?: string
  customerId: string
  serviceType: ServiceType
  title: string
  summary: string
  detail?: string
  resultText?: string
  historyId?: string
  meta?: Consultation['meta']
}): Promise<Consultation> {
  return saveConsultation({
    id: opts.id,
    createdAt: opts.createdAt,
    customerId: opts.customerId,
    serviceType: opts.serviceType,
    title: opts.title,
    summary: opts.summary,
    detail: opts.detail,
    resultText: opts.resultText,
    historyId: opts.historyId,
    meta: opts.meta,
  })
}
