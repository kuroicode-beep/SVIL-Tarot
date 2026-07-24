// 년/월/일이 모두 채워졌고 실제 존재하는 날짜인지 검증한다.
export function isValidBirth(y: string, m: string, d: string): boolean {
  if (!y || !m || !d) return false
  const yy = Number(y)
  const mm = Number(m)
  const dd = Number(d)
  if (!Number.isInteger(yy) || yy < 1 || yy > 9999) return false
  if (!Number.isInteger(mm) || mm < 1 || mm > 12) return false
  const daysInMonth = new Date(yy, mm, 0).getDate()
  return Number.isInteger(dd) && dd >= 1 && dd <= daysInMonth
}

export function calcSoulCard(birthdate: string): number {
  const digits = birthdate.replace(/\D/g, '')
  if (!digits) throw new Error('생년월일 형식 오류')

  let sum = 0
  for (const ch of digits) {
    sum += ch.charCodeAt(0) - 48
  }
  while (sum >= 10) {
    sum = String(sum)
      .split('')
      .reduce((acc, d) => acc + (d.charCodeAt(0) - 48), 0)
  }
  return sum === 0 ? 9 : sum
}

export const soulCardNames: Record<number, string> = {
  1: '마법사',
  2: '여사제',
  3: '여황제',
  4: '황제',
  5: '교황',
  6: '연인',
  7: '전차',
  8: '힘',
  9: '은둔자',
}

export const soulCardMajorIds: Record<number, string> = {
  1: 'major_01',
  2: 'major_02',
  3: 'major_03',
  4: 'major_04',
  5: 'major_05',
  6: 'major_06',
  7: 'major_07',
  8: 'major_08',
  9: 'major_09',
}

export const soulCardDescriptions: Record<number, string> = {
  1: '목표를 향한 의지가 강하고, 어떤 상황도 자신의 것으로 만드는 힘이 있어요.',
  2: '직관이 예리하고, 말하지 않아도 많은 것을 느끼는 깊은 내면을 가졌어요.',
  3: '따뜻하고 풍요로운 에너지로 주변을 편안하게 만드는 존재예요.',
  4: '안정감과 신뢰를 주는 단단한 기반을 가진 사람이에요.',
  5: '지혜롭고 진실을 중요하게 여기며, 관계에서 신뢰를 쌓아가는 타입이에요.',
  6: '감수성이 풍부하고 관계에서 진심을 다하는 로맨틱한 영혼이에요.',
  7: '추진력이 강하고 한번 마음먹으면 끝까지 밀고 나가는 에너지가 있어요.',
  8: '겉으로는 부드럽지만 내면에 단단한 힘을 가진, 진정한 강인함의 소유자예요.',
  9: '깊은 사색과 통찰력으로 남들이 보지 못하는 것을 꿰뚫어 보는 지혜가 있어요.',
}
