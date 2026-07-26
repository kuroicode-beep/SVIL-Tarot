import { getDb, type Customer, type Consultation, type ServiceType, SERVICE_LABELS } from './db'

export { type Customer, type Consultation, type ServiceType, SERVICE_LABELS }

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
    createdAt: input.createdAt ?? now,
    updatedAt: now,
  }
  if (!full.name) throw new Error('고객 이름은 필수입니다.')
  const db = await getDb()
  await db.put('customers', full)
  return full
}

export async function deleteCustomer(id: string): Promise<void> {
  const db = await getDb()
  const cons = await db.getAllFromIndex('consultations', 'by-customer', id)
  const tx = db.transaction(['customers', 'consultations'], 'readwrite')
  await tx.objectStore('customers').delete(id)
  await Promise.all(cons.map((c) => tx.objectStore('consultations').delete(c.id)))
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

export async function recordServiceConsultation(opts: {
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
