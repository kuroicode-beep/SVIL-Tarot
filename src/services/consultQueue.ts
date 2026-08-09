// src/services/consultQueue.ts — 상담 대기열(상태·마감일·AI 상담노트) 도메인 로직
import { getDb, type Consultation } from './db'
import { ollamaChat } from './ollama'

export type ConsultationStatus = 'todo' | 'doing' | 'done'

/**
 * db.ts의 Consultation 위에 대기열 필드(v5: dueAt·status·aiNote)를 겹쳐 놓은 지역 타입.
 * db.ts는 다른 작업과 충돌하므로 손대지 않는다. 교집합 타입이라 db.ts가 같은 필드를
 * 이미 선언하고 있어도 구조가 동일해 충돌하지 않고, 이 파일 혼자서도 컴파일된다.
 */
export type QueuedConsultation = Consultation & {
  dueAt?: string
  status?: ConsultationStatus
  aiNote?: string
}

export type QueueCounts = {
  overdue: number
  today: number
  todo: number
  doing: number
}

export type DueState = 'none' | 'overdue' | 'today' | 'upcoming'

export const CONSULT_STATUSES: readonly ConsultationStatus[] = ['todo', 'doing', 'done']

/**
 * 서비스 계층은 i18n 키만 들고 있는다(db.ts의 SERVICE_LABEL_KEYS와 같은 규칙).
 * 여기서 한국어를 직접 들면 5개 언어 중 한국어만 화면에 새어 나온다.
 */
export const STATUS_LABEL_KEYS: Record<ConsultationStatus, string> = {
  todo: 'queue_status_todo',
  doing: 'queue_status_doing',
  done: 'queue_status_done',
}

/** 화면에 그대로 못 쓰는 원인 문자열 대신 이 sentinel만 던진다. 문구는 페이지가 t()로 고른다. */
export const QUEUE_ERR = {
  notFound: 'CONSULTATION_NOT_FOUND',
  noSource: 'AI_NOTE_NO_SOURCE',
  aiFailed: 'AI_NOTE_FAILED',
} as const

/** 프롬프트가 무한정 길어지면 로컬 12B 모델이 타임아웃 난다. 원문은 잘라서 넣는다. */
const SOURCE_LIMIT = 4000

const AI_NOTE_SYSTEM =
  '당신은 타로·사주 상담사의 상담 기록을 정리해 주는 한국어 보조 도구입니다. ' +
  '개인정보(이름·연락처·주소·생년월일·직장 등)는 절대 그대로 옮겨 적지 말고 "내담자"처럼 일반화해서 요약하세요. ' +
  '원문을 통째로 복사하지 말고 반드시 짧게 요약하세요. ' +
  '단정적 예언과 의료·법률 판단은 쓰지 마세요.'

const AI_NOTE_FORMAT =
  '아래 형식 그대로, 군더더기 없이 한국어로만 답하세요.\n' +
  '핵심 질문: (한 문장)\n' +
  '뽑힌 카드: (기록에 있으면 카드 이름과 정/역방향을 한 줄로. 없으면 "기록 없음")\n' +
  '조언:\n' +
  '1. (한 문장)\n' +
  '2. (한 문장)\n' +
  '3. (한 문장)'

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/**
 * 저장·비교에 쓰는 로컬 'YYYY-MM-DD' 키.
 * 'YYYY-MM-DD'를 new Date()로 파싱하면 UTC 자정으로 읽혀 시간대에 따라 하루가 밀린다.
 * 그래서 이미 날짜꼴인 문자열은 파싱하지 않고 그대로 자른다.
 */
export function toDateKey(value: string | Date): string {
  if (typeof value !== 'string') return localDateKey(value)
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim())
  if (m) return m[1]
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : localDateKey(d)
}

export function todayKey(): string {
  return localDateKey(new Date())
}

/**
 * 상태가 없는 옛 레코드는 'done'으로 취급한다(하위 호환).
 * 'todo'로 보면 v5 이전에 쌓인 상담 전부가 갑자기 '할 일'로 쏟아져 대기열이 못 쓰게 된다.
 */
export function statusOf(c: Pick<QueuedConsultation, 'status'>): ConsultationStatus {
  return c.status === 'todo' || c.status === 'doing' ? c.status : 'done'
}

/** 끝난 건은 마감을 따지지 않는다. 완료 후에도 '마감 지남'이 남으면 배지가 신호 구실을 못한다. */
export function dueStateOf(
  c: Pick<QueuedConsultation, 'status' | 'dueAt'>,
  today: string = todayKey(),
): DueState {
  if (!c.dueAt) return 'none'
  if (statusOf(c) === 'done') return 'none'
  const key = toDateKey(c.dueAt)
  if (!key) return 'none'
  if (key < today) return 'overdue'
  if (key === today) return 'today'
  return 'upcoming'
}

/** 읽고-고치고-쓰기를 한 트랜잭션 안에서 끝낸다. 없는 id는 쓰기 없이 sentinel로 알린다. */
async function patch(
  id: string,
  apply: (c: QueuedConsultation) => QueuedConsultation,
): Promise<QueuedConsultation> {
  const db = await getDb()
  const tx = db.transaction('consultations', 'readwrite')
  const store = tx.objectStore('consultations')
  const prev = (await store.get(id)) as QueuedConsultation | undefined
  const next = prev ? apply(prev) : undefined
  if (next) await store.put(next)
  await tx.done
  // abort() 대신 트랜잭션을 정상 종료시킨 뒤 던진다. abort하면 tx.done이 별도로 reject돼
  // 잡히지 않는 rejection이 하나 더 생긴다.
  if (!next) throw new Error(QUEUE_ERR.notFound)
  return next
}

export async function setStatus(id: string, status: ConsultationStatus): Promise<void> {
  await patch(id, (c) => ({ ...c, status }))
}

export async function setDueAt(id: string, dueAt: string | undefined): Promise<void> {
  const key = dueAt ? toDateKey(dueAt) : ''
  await patch(id, (c) => {
    const next: QueuedConsultation = { ...c, dueAt: key }
    // 빈 문자열을 남기면 '마감 없음'인데도 dueAt 키가 존재해 이후 판정이 헷갈린다. 아예 지운다.
    if (!key) delete next.dueAt
    return next
  })
}

/** 요약할 거리가 있는지까지 판단한다. 제목만으론 노트를 만들 수 없다. */
function buildSource(c: QueuedConsultation): string {
  const body = [
    c.summary?.trim() ? `요약: ${c.summary.trim()}` : '',
    c.detail?.trim() ? `상세: ${c.detail.trim()}` : '',
    c.resultText?.trim() ? `결과 본문: ${c.resultText.trim()}` : '',
  ].filter(Boolean)
  if (body.length === 0) return ''
  const title = c.title?.trim() ? `제목: ${c.title.trim()}` : ''
  return [title, ...body].filter(Boolean).join('\n\n').slice(0, SOURCE_LIMIT)
}

/** 로컬 LLM이 '핵심 질문 / 뽑힌 카드 / 조언 3줄'로 요약해 aiNote에 붙인다. */
export async function generateAiNote(id: string): Promise<string> {
  const db = await getDb()
  const target = (await db.get('consultations', id)) as QueuedConsultation | undefined
  if (!target) throw new Error(QUEUE_ERR.notFound)

  const source = buildSource(target)
  if (!source) throw new Error(QUEUE_ERR.noSource)

  let raw: string
  try {
    raw = await ollamaChat(
      [
        { role: 'system', content: AI_NOTE_SYSTEM },
        { role: 'user', content: `${AI_NOTE_FORMAT}\n\n[상담 기록]\n${source}` },
      ],
      // 요약이라 창의성이 필요 없다. 온도를 낮춰야 형식이 흔들리지 않는다.
      { temperature: 0.2, timeoutMs: 90_000 },
    )
  } catch {
    // ollama.ts가 던지는 메시지는 한국어 하드코딩이라 화면에 그대로 못 쓴다.
    throw new Error(QUEUE_ERR.aiFailed)
  }

  const note = raw.trim()
  if (!note) throw new Error(QUEUE_ERR.aiFailed)
  await patch(id, (c) => ({ ...c, aiNote: note }))
  return note
}

/** 오늘 마감·지난 마감 건수. 화면 배지가 쓴다. */
export async function queueCounts(): Promise<QueueCounts> {
  const db = await getDb()
  const all = (await db.getAll('consultations')) as QueuedConsultation[]
  const today = todayKey()
  const counts: QueueCounts = { overdue: 0, today: 0, todo: 0, doing: 0 }
  for (const c of all) {
    const status = statusOf(c)
    if (status === 'done') continue
    if (status === 'todo') counts.todo += 1
    else counts.doing += 1
    const due = dueStateOf(c, today)
    if (due === 'overdue') counts.overdue += 1
    else if (due === 'today') counts.today += 1
  }
  return counts
}
