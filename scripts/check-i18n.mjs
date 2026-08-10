// scripts/check-i18n.mjs — i18n 사전 정합성 게이트
//
// 두 가지를 막는다.
//  1) 코드가 t('key')로 부르는데 사전에 없는 키 — 화면에 원시 키가 그대로 노출된다.
//     (실제로 v1.7에서 ai_start_hint가 이렇게 새어 나왔다.)
//  2) 언어마다 키 집합이 다른 경우 — 한국어만 고치고 넘어가면 다른 언어에서 조용히 폴백된다.
//
// 육안 검수로는 600키 × 5언어를 못 지킨다. 실패 시 종료 코드 1로 CI·npm run check를 세운다.
import fs from 'node:fs'
import path from 'node:path'

const I18N = 'src/i18n/index.ts'
const LOCALES = ['ko', 'en', 'ja', 'zh', 'vi']
const SRC_DIR = 'src'

/**
 * 일부러 ko에만 두는 키. 번역 대상이 아니라 같은 문자열을 네 벌 복제할 이유가 없고,
 * translate()가 ko로 폴백하므로 화면에는 정상 표시된다.
 *   brand        — 고유명사. SVIL 저작권 규칙상 브랜드명은 번역하지 않는다.
 *   settings_tts — 두문자어(TTS). 5개 언어에서 같은 표기다.
 * 여기에 키를 추가할 때는 반드시 '번역이 필요 없는 이유'를 함께 적는다.
 */
const SHARED_KEYS = new Set(['brand', 'settings_tts'])

const source = fs.readFileSync(I18N, 'utf8')

/** 사전 하나의 최상위 키 집합. 값 안의 콜론에 걸리지 않도록 2칸 들여쓰기 줄만 본다. */
function dictKeys(name) {
  const marker = `const ${name}: Dict = {`
  const start = source.indexOf(marker)
  if (start < 0) throw new Error(`사전을 찾지 못했습니다: ${name}`)
  const end = source.indexOf('\n}', start)
  const body = source.slice(start, end)
  return new Set([...body.matchAll(/^ {2}([a-zA-Z_][a-zA-Z0-9_]*):/gm)].map((m) => m[1]))
}

const keysByLocale = new Map(LOCALES.map((l) => [l, dictKeys(l)]))
const base = keysByLocale.get('ko')

/** 코드에서 실제로 쓰는 키 → 처음 발견한 파일. 사전 파일 자신은 제외한다. */
const used = new Map()
function walk(dir) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (fs.statSync(full).isDirectory()) {
      walk(full)
      continue
    }
    if (!/\.tsx?$/.test(entry)) continue
    if (full.replace(/\\/g, '/').includes('src/i18n/')) continue
    const text = fs.readFileSync(full, 'utf8')
    for (const m of text.matchAll(/\bt\(\s*'([a-zA-Z_][a-zA-Z0-9_]*)'/g)) {
      if (!used.has(m[1])) used.set(m[1], full)
    }
  }
}
walk(SRC_DIR)

const problems = []

for (const [key, file] of used) {
  if (!base.has(key)) problems.push(`없는 키: ${key}  (${file})`)
}

for (const loc of LOCALES) {
  if (loc === 'ko') continue
  const set = keysByLocale.get(loc)
  for (const key of base) {
    if (SHARED_KEYS.has(key)) continue
    if (!set.has(key)) problems.push(`${loc} 누락: ${key}`)
  }
  for (const key of set) if (!base.has(key)) problems.push(`${loc} 잉여(ko에 없음): ${key}`)
}

const counts = LOCALES.map((l) => `${l} ${keysByLocale.get(l).size}`).join(' · ')
console.log(`사전 ${counts} / 코드에서 쓰는 키 ${used.size}`)

if (problems.length > 0) {
  console.error(`\nFAIL — ${problems.length}건`)
  for (const p of problems) console.error(`  ${p}`)
  process.exit(1)
}
console.log('PASS — 코드가 쓰는 키가 모두 있고, 5개 언어 키 집합이 동일합니다.')
