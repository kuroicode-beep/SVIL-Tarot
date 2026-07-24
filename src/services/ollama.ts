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
