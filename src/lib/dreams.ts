// src/lib/dreams.ts — 꿈 표제어 사전 검색·자유 서술에서의 표제어 추출·로컬 LLM 해몽 생성
import dreamsJson from '../data/dreams.json'
import { ollamaChat } from '../services/ollama'

export type DreamEntry = {
  id: string
  /** 표제어(대표 이름) */
  ko: string
  /** 검색·추출용 동의어 */
  aliases: string[]
  /** 한 줄 상징 요약 */
  symbol: string
  /** 2~3문장 설명 */
  detail: string
}

export const allDreams = dreamsJson as DreamEntry[]

const byId = new Map(allDreams.map((e) => [e.id, e]))

export function getDream(id: string): DreamEntry | undefined {
  return byId.get(id)
}

/**
 * 한국어는 띄어쓰기가 사람마다 달라서("이빨 빠지다" / "이빨빠지다")
 * 공백을 남겨 두면 같은 표현을 놓친다. 표제어와 본문을 같은 규칙으로 눌러 둔다.
 */
function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '')
}

/**
 * 공백을 지운 문자열과 함께 "지운 뒤 위치 → 원문 위치" 지도를 만든다.
 * 공백만 지우고 끝내면 "검은 뱀"이 "검은뱀"이 되어 한 글자 표제어 '뱀'의 앞 글자가
 * 한글('은')로 보이고, 낱말 경계 검사에서 통째로 버려진다. 경계는 항상 원문에서 본다.
 */
function stripWithMap(s: string): { src: string; text: string; map: number[] } {
  // toLowerCase()로 길이가 달라지는 문자가 있어(예: 터키어 İ) 원문 대신 소문자본을 기준 좌표로 삼는다.
  const src = s.toLowerCase()
  let text = ''
  const map: number[] = []
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i]
    if (/\s/.test(ch)) continue
    text += ch
    map.push(i)
  }
  return { src, text, map }
}

type Term = { term: string; entry: DreamEntry }

const TERMS: Term[] = (() => {
  const list: Term[] = []
  for (const entry of allDreams) {
    for (const raw of [entry.ko, ...entry.aliases]) {
      const term = normalize(raw)
      if (term) list.push({ term, entry })
    }
  }
  // 긴 표제어를 먼저 잡아야 "이빨이빠지다"가 "이"·"빨" 같은 짧은 조각에 먹히지 않는다.
  list.sort((a, b) => b.term.length - a.term.length)
  return list
})()

const HANGUL = /[가-힣]/

// 한 글자 표제어(뱀·물·불·말…)는 아무 데나 걸린다. "정말"의 '말', "계산"의 '산'처럼.
// 앞뒤가 한글로 이어지면 다른 낱말의 일부로 보고 버리되, 뒤가 조사면 살린다("말이", "물을").
// '로/으/보/나/한'은 일부러 뺐다 — "새로운"의 새, "해보다"의 해, "말한다"의 말이 통째로 오탐이 된다.
// 재현율을 조금 잃더라도 엉뚱한 표제어가 칩으로 뜨는 쪽이 사용자에게 훨씬 나쁘다.
const PARTICLE_HEADS = new Set([
  '이', '가', '은', '는', '을', '를', '에', '의', '와', '과', '도', '만', '랑',
  '께', '부', '까', '처', '뿐', '밖',
])

function hasWordBoundary(src: string, map: number[], at: number, term: string): boolean {
  if (term.length > 1) return true
  const start = map[at]
  const end = map[at + term.length - 1]
  const prev = start > 0 ? src[start - 1] : ''
  const next = end + 1 < src.length ? src[end + 1] : ''
  if (prev && HANGUL.test(prev)) return false
  if (next && HANGUL.test(next) && !PARTICLE_HEADS.has(next)) return false
  return true
}

/** 표제어·동의어·상징·설명 순으로 훑어 검색 결과를 만든다. 앞쪽에서 맞을수록 위로 올린다. */
export function searchDreams(query: string, limit = 40): DreamEntry[] {
  const q = normalize(query)
  if (!q) return []
  const scored: { entry: DreamEntry; score: number }[] = []
  for (const entry of allDreams) {
    const ko = normalize(entry.ko)
    let score = 0
    if (ko === q) score = 100
    else if (ko.startsWith(q)) score = 80
    else if (ko.includes(q)) score = 70
    else if (entry.aliases.some((a) => normalize(a) === q)) score = 60
    else if (entry.aliases.some((a) => normalize(a).includes(q))) score = 50
    else if (normalize(entry.symbol).includes(q)) score = 30
    else if (normalize(entry.detail).includes(q)) score = 10
    if (score > 0) scored.push({ entry, score })
  }
  scored.sort((a, b) => b.score - a.score || a.entry.ko.localeCompare(b.entry.ko, 'ko'))
  return scored.slice(0, limit).map((s) => s.entry)
}

/**
 * 자유 서술에서 표제어를 규칙으로 먼저 뽑는다. LLM이 죽어도 이 단계는 항상 동작해야 한다.
 * 긴 표제어부터 자리를 차지하게 해(consumed 표시) 같은 구간이 두 번 잡히지 않게 한다.
 */
export function extractKeywords(text: string, limit = 12): DreamEntry[] {
  const { src, text: norm, map } = stripWithMap(text)
  if (!norm) return []

  const taken = new Array<boolean>(norm.length).fill(false)
  const hits: { at: number; entry: DreamEntry }[] = []
  const seen = new Set<string>()

  for (const { term, entry } of TERMS) {
    if (seen.has(entry.id)) continue
    let from = 0
    while (from <= norm.length - term.length) {
      const at = norm.indexOf(term, from)
      if (at < 0) break
      from = at + 1
      if (!hasWordBoundary(src, map, at, term)) continue
      let overlap = false
      for (let i = at; i < at + term.length; i += 1) {
        if (taken[i]) {
          overlap = true
          break
        }
      }
      if (overlap) continue
      for (let i = at; i < at + term.length; i += 1) taken[i] = true
      hits.push({ at, entry })
      seen.add(entry.id)
      break
    }
  }

  // 사용자가 쓴 순서대로 보여야 자기 꿈 이야기와 칩이 눈으로 맞춰진다.
  hits.sort((a, b) => a.at - b.at)
  return hits.slice(0, limit).map((h) => h.entry)
}

/** 표제어를 「이름」 상징 + 설명 형태로 이어 붙인다. 프롬프트 근거이자 폴백 본문으로 함께 쓴다. */
export function summarizeEntries(entries: DreamEntry[]): string {
  return entries.map((e) => `「${e.ko}」 ${e.symbol}\n${e.detail}`).join('\n\n')
}

const SYSTEM_DREAM =
  '당신은 한국 전통 꿈해몽을 참고해 이야기하는 한국어 상담자입니다. 저시력 사용자를 위해 짧은 문단과 또렷한 문장으로 쓰세요. ' +
  '단정적 예언, 공포 조장, 의료·건강 진단, 재난·사고 예고는 절대 하지 마세요. ' +
  '주어진 표제어 근거 안에서만 상징을 설명하고, 근거에 없는 전승이나 통계를 지어내지 마세요. ' +
  '해몽은 참고용이며 결정은 본인의 몫이라는 태도를 유지하세요.'

/**
 * 뽑힌 표제어의 symbol·detail을 근거로 넣어 로컬 LLM이 해몽을 쓴다.
 * 사전 근거를 함께 주는 이유는 12B 모델이 없는 전승을 만들어 내는 걸 줄이기 위해서다.
 * Ollama가 꺼져 있어도 화면이 비면 안 되므로 실패 시 사전 요약으로 폴백한다(throw 금지).
 */
export async function interpretDream(
  text: string,
  entries: DreamEntry[],
  opts?: { fallbackNote?: string; onFallback?: (reason: string) => void },
): Promise<string> {
  const dream = text.trim()
  const evidence = entries.length > 0 ? summarizeEntries(entries) : '(사전에서 찾은 표제어 없음)'

  try {
    return await ollamaChat([
      { role: 'system', content: SYSTEM_DREAM },
      {
        role: 'user',
        content:
          `꿈 내용:\n${dream || '(내용 없음)'}\n\n` +
          `사전에서 찾은 표제어 근거:\n${evidence}\n\n` +
          '아래 순서로 한국어로 정리해 주세요.\n' +
          '1) 꿈의 전체 인상 (2문장)\n' +
          '2) 표제어별 의미 — 위 근거에 있는 내용만 풀어서\n' +
          '3) 지금 생활에 비춰 볼 점 (2~3문장)\n' +
          '4) 오늘 해 볼 만한 작은 실천 한 가지\n\n' +
          '표제어를 찾지 못했다면 꿈에서 느낀 감정 중심으로만 짧게 정리하세요.',
      },
    ])
  } catch (e) {
    opts?.onFallback?.(e instanceof Error ? e.message : String(e))
    // 폴백 본문은 사전 내용 그대로다. 안내 문구는 호출한 화면이 번역해서 넘긴다.
    const body =
      entries.length > 0 ? summarizeEntries(entries) : ''
    return [opts?.fallbackNote, body].filter((s) => s && s.trim()).join('\n\n')
  }
}
