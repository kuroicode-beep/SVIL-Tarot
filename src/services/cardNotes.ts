// src/services/cardNotes.ts — 카드별 개인 키워드·해석(cardNotes 스토어) 읽기·쓰기와 AI 프롬프트 조립.
import { getDb, type CardNote } from './db'
import { getCard } from '../lib/cards'

export type { CardNote }

/** 공백만 남은 값은 '없음'으로 눕힌다. 저장·삭제 판정을 여기 한 곳에서만 내리기 위해서다. */
function normalize(v: string): string | undefined {
  const s = v.trim()
  return s.length > 0 ? s : undefined
}

export async function getCardNote(cardId: string): Promise<CardNote | undefined> {
  const db = await getDb()
  return db.get('cardNotes', cardId)
}

/**
 * 키워드·해석을 저장한다. 빈 문자열은 그 필드를 지우라는 뜻이고, 둘 다 비면 레코드째 지운다.
 * 빈 껍데기를 남기면 '내 메모 있는 것만' 필터와 buildNotesPrompt가 거짓 양성을 내기 때문이다.
 * 삭제한 경우에도 화면이 곧바로 상태를 반영할 수 있게 비워진 형태의 CardNote를 돌려준다.
 */
export async function saveCardNote(
  cardId: string,
  keywords: string,
  meaning: string,
): Promise<CardNote> {
  const next: CardNote = {
    cardId,
    keywords: normalize(keywords),
    meaning: normalize(meaning),
    updatedAt: new Date().toISOString(),
  }
  const db = await getDb()
  if (!next.keywords && !next.meaning) {
    await db.delete('cardNotes', cardId)
    return next
  }
  await db.put('cardNotes', next)
  return next
}

export async function deleteCardNote(cardId: string): Promise<void> {
  const db = await getDb()
  await db.delete('cardNotes', cardId)
}

export async function listCardNotes(): Promise<CardNote[]> {
  const db = await getDb()
  return db.getAll('cardNotes')
}

/**
 * AI 프롬프트에 주입할 문단. 메모가 있는 카드만 모으고, 하나도 없으면 빈 문자열을 준다.
 * 모델을 향한 텍스트라 UI 문자열이 아니다 — ollama.ts의 프롬프트와 같은 층이라 i18n을 타지 않는다.
 */
export async function buildNotesPrompt(cardIds: string[]): Promise<string> {
  if (cardIds.length === 0) return ''
  // 스프레드가 같은 id를 두 번 넘겨도 같은 메모가 프롬프트에 겹쳐 들어가지 않게 한 번만 읽는다.
  const unique = [...new Set(cardIds)]
  const db = await getDb()
  // 카드 수만큼 트랜잭션을 새로 여는 대신 하나로 묶어 읽는다.
  const tx = db.transaction('cardNotes', 'readonly')
  const notes = await Promise.all(unique.map((id) => tx.store.get(id)))
  await tx.done

  const lines: string[] = []
  for (const note of notes) {
    if (!note) continue
    if (!note.keywords && !note.meaning) continue
    let name = note.cardId
    try {
      const card = getCard(note.cardId)
      name = `${card.nameKo}(${card.nameEn})`
    } catch {
      // 덱이 바뀌어 사라진 카드의 메모가 남아 있어도 프롬프트 전체가 죽지 않게 id로 대체한다.
    }
    const parts: string[] = []
    if (note.keywords) parts.push(`키워드: ${note.keywords}`)
    if (note.meaning) parts.push(`해석: ${note.meaning}`)
    lines.push(`- ${name} — ${parts.join(' / ')}`)
  }
  if (lines.length === 0) return ''
  return `사용자가 직접 정리해 둔 카드 메모입니다. 아래 어휘와 관점을 우선해서 리딩을 작성해 주세요.\n${lines.join('\n')}`
}
