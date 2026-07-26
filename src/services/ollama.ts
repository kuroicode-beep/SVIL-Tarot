const OLLAMA_BASE = import.meta.env.DEV ? '/ollama' : 'http://127.0.0.1:11434'
export const OLLAMA_MODEL = 'gemma4:12b'

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export async function checkOllama(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(3000) })
    return res.ok
  } catch {
    return false
  }
}

export async function ollamaChat(
  messages: ChatMessage[],
  opts?: { temperature?: number; timeoutMs?: number },
): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), opts?.timeoutMs ?? 120_000)
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false,
        options: { temperature: opts?.temperature ?? 0.7 },
      }),
      signal: controller.signal,
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Ollama 오류 (${res.status}): ${text.slice(0, 200)}`)
    }
    const data = (await res.json()) as { message?: { content?: string } }
    const content = data.message?.content?.trim()
    if (!content) throw new Error('Ollama 응답이 비어 있습니다.')
    return content
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error('Ollama 응답 시간 초과. 모델이 로드됐는지 확인하세요.')
    }
    throw e
  } finally {
    clearTimeout(timeout)
  }
}

const SYSTEM_TAROT =
  '당신은 저시력 사용자를 배려하는 한국어 타로 조언자입니다. 명확하고 따뜻한 문장으로 쓰되, 단정·공포·의료·법률 확정은 피하고, 정방향/역방향 의미를 구분해서 설명하세요.'

export function adviceFromPractice(cardsText: string, userNote: string): Promise<string> {
  return ollamaChat([
    { role: 'system', content: SYSTEM_TAROT },
    {
      role: 'user',
      content: `실전 타로입니다. 뽑힌 카드:\n${cardsText}\n\n사용자의 해설:\n${userNote || '(없음)'}\n\n사용자의 해설을 존중하면서, 보완·조언·주의점을 한국어로 짧게 작성해 주세요.`,
    },
  ])
}

export function fullAiReading(opts: {
  mode: 'question' | 'category'
  question?: string
  category?: string
  cardsText: string
}): Promise<string> {
  const focus =
    opts.mode === 'question'
      ? `질문: ${opts.question || '(없음)'}`
      : `카테고리: ${opts.category || '종합'}`
  return ollamaChat([
    { role: 'system', content: SYSTEM_TAROT },
    {
      role: 'user',
      content: `AI 타로 리딩을 해주세요.\n${focus}\n\n카드:\n${opts.cardsText}\n\n포지션별로 해석한 뒤, 전체 메시지를 정리해 주세요.`,
    },
  ])
}

export function soulCardAiExplain(number: number, name: string, base: string): Promise<string> {
  return ollamaChat([
    { role: 'system', content: SYSTEM_TAROT },
    {
      role: 'user',
      content: `소울카드 번호 ${number}번 「${name}」입니다. 기본 설명: ${base}\n\n성격·강점·조심할 점을 한국어로 친절히 확장 설명해 주세요.`,
    },
  ])
}

const SYSTEM_MYSTIC =
  '당신은 한국어로 상담하는 명리·성명 조언자입니다. 저시력 사용자를 위해 짧고 명확한 문단으로 쓰세요. 의료·법률·확정적 예언은 피하고, 참고용·자기성찰용임을 밝히세요. 전문 만세력과 다를 수 있는 간이 계산임을 인정하세요.'

export function sajuReading(summaryText: string, focus: string): Promise<string> {
  return ollamaChat([
    { role: 'system', content: SYSTEM_MYSTIC },
    {
      role: 'user',
      content: `사주 풀이를 해주세요.\n\n원국 요약:\n${summaryText}\n\n상담 초점: ${focus || '종합'}\n\n성격 경향, 강점, 주의점, 올해 조언(참고)을 한국어로 정리해 주세요.`,
    },
  ])
}

export function compatReading(aText: string, bText: string, relation: string): Promise<string> {
  return ollamaChat([
    { role: 'system', content: SYSTEM_MYSTIC },
    {
      role: 'user',
      content: `두 사람의 궁합을 봐 주세요. 관계: ${relation}\n\n[A]\n${aText}\n\n[B]\n${bText}\n\n잘 맞는 점, 갈등 포인트, 관계 조언을 점수(100점 만점 참고)와 함께 한국어로 작성해 주세요.`,
    },
  ])
}

export function nameologyReading(name: string, strokeText: string, birthHint: string): Promise<string> {
  return ollamaChat([
    { role: 'system', content: SYSTEM_MYSTIC },
    {
      role: 'user',
      content: `성명학 풀이입니다.\n이름: ${name}\n획수·오행 힌트:\n${strokeText}\n생년월일 참고: ${birthHint || '(없음)'}\n\n발음·이미지·기운 균형·일상 조언을 한국어로 설명해 주세요.`,
    },
  ])
}

export function namingSuggest(opts: {
  surname: string
  gender: string
  sajuText: string
  style: string
  count?: number
}): Promise<string> {
  const n = opts.count ?? 5
  return ollamaChat([
    { role: 'system', content: SYSTEM_MYSTIC },
    {
      role: 'user',
      content: `아기/개명 작명 후보를 ${n}개 제안해 주세요.\n성: ${opts.surname}\n성별: ${opts.gender}\n사주 참고:\n${opts.sajuText}\n원하는 분위기: ${opts.style || '밝고 바르며 부르기 쉬운 이름'}\n\n각 후보마다 이름(한글), 추천 한자(가능하면), 의미, 추천 이유를 번호 목록으로 써 주세요. 법적 효력은 없음을 고지하세요.`,
    },
  ])
}
