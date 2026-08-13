// src/i18n/index.ts의 5개 사전을 Dart로 변환한다.
//
// 손으로 옮기지 않는 이유: 3,287개 문자열이라 반드시 흘린다.
// 정규식으로 값을 긁지도 않는다 — 이스케이프·따옴표·줄바꿈을 잘못 해석한다.
// TS 소스를 JS로 최소 변형해 **실제로 평가**하고, 얻은 객체를 Dart 리터럴로 다시 찍는다.

import fs from 'node:fs'
import vm from 'node:vm'

const SRC = process.argv[2]
const OUT = process.argv[3]

const source = fs.readFileSync(SRC, 'utf8')
const LOCALES = ['ko', 'en', 'ja', 'zh', 'vi']

/**
 * `const <name>: Dict = {` 부터 열 0의 `}` 까지 잘라낸다.
 *
 * 괄호 균형을 세는 방식은 쓰지 않는다 — 한국어 주석에 작은따옴표가 하나만 들어 있으면
 * 스캐너가 "문자열이 열렸다"고 오판해 그 뒤 전부를 문자열로 먹는다(실제로 그렇게 실패했다).
 * 사전은 전부 최상위 선언이라 닫는 괄호가 항상 열 0에 있고, 그 사실이 더 튼튼하다.
 */
function extractObject(name) {
  const marker = `const ${name}: Dict = {`
  const start = source.indexOf(marker)
  if (start < 0) throw new Error(`사전을 찾지 못했습니다: ${name}`)
  const open = source.indexOf('{', start)
  const end = source.indexOf('\n}', open)
  if (end < 0) throw new Error(`닫는 괄호를 찾지 못했습니다: ${name}`)
  return source.slice(open, end + 2)
}

// 실제 평가 — 이스케이프 해석을 JS 엔진에 맡긴다.
//
// ko를 뺀 4개 사전은 `{ ...ko, ...번역 }` 형태다. 스프레드를 그대로 펼치면 5개 사전이
// 각각 659키가 되어 파일이 3,295줄 커지고, 무엇이 실제로 번역됐는지도 안 보인다.
// 대신 ko를 빈 객체로 묶어 평가해 **선언된 항목만** 얻고, 한국어 폴백은 translate()가 맡는다.
// 런타임 결과는 완전히 같다 — 웹판 translate()도 `table[key] ?? ko[key] ?? key`였다.
const tables = {}
tables.ko = vm.runInNewContext(`(${extractObject('ko')})`)
for (const loc of LOCALES.filter((l) => l !== 'ko')) {
  tables[loc] = vm.runInNewContext(`(${extractObject(loc)})`, { ko: {} })
}

// fontOptions도 같은 방식으로.
const foStart = source.indexOf('export const fontOptions = [')
const foOpen = source.indexOf('[', foStart)
const foEnd = source.indexOf('] as const', foOpen)
const fontOptions = vm.runInNewContext(`(${source.slice(foOpen, foEnd + 1)})`)

// ---------- Dart 출력 ----------

/**
 * Dart 작은따옴표 문자열 리터럴로 감싼다.
 * `$`를 반드시 이스케이프해야 한다 — Dart는 문자열 보간 문자라, 안 하면 컴파일이 깨지거나
 * 조용히 다른 값이 된다. 웹판 문구에 `$`가 있는지 없는지에 기대지 않는다.
 */
function dq(s) {
  return "'" + String(s)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\$/g, '\\$')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n') + "'"
}

const keyCount = Object.keys(tables.ko).length
const lines = []

lines.push(`// lib/i18n/strings.dart — 5개 언어 문자열 테이블.`)
lines.push(`//`)
lines.push(`// 이 파일은 웹판 src/i18n/index.ts에서 기계 변환됐다(scratchpad/gen_i18n.mjs).`)
lines.push(`// 손으로 고치지 말 것 — 문구를 바꾸려면 웹판을 고치고 다시 생성하거나,`)
lines.push(`// 웹판 폐기 후에는 이 파일이 정본이 되므로 그때 이 주석을 지운다.`)
lines.push(`//`)
lines.push(`// ko가 ${keyCount}개로 전량을 갖고, 나머지 언어는 **번역된 항목만** 담는다.`)
lines.push(`// 웹판에서 en/ja/zh/vi가 \`{ ...ko, ...번역 }\` 형태였던 것과 결과가 같다 —`)
lines.push(`// 없는 키는 translate()가 ko로 폴백한다. 그래야 무엇이 실제로 번역됐는지 보인다.`)
lines.push(`// brand·settings_tts는 고유명사·약어라 의도적으로 번역하지 않는다.`)
lines.push('')

for (const loc of LOCALES) {
  const entries = Object.entries(tables[loc])
  lines.push(`const Map<String, String> ${loc}Strings = {`)
  for (const [k, v] of entries) {
    lines.push(`  ${dq(k)}: ${dq(v)},`)
  }
  lines.push('};')
  lines.push('')
}

lines.push(`/// 로케일 코드 → 문자열 테이블.`)
lines.push(`const Map<String, Map<String, String>> stringTables = {`)
for (const loc of LOCALES) lines.push(`  '${loc}': ${loc}Strings,`)
lines.push('};')
lines.push('')

lines.push(`/// SVIL 표준 글꼴 8종. 목록 첫 항목이 기본값이자 알 수 없는 id의 폴백이다.`)
lines.push(`/// family가 null이면 시스템 글꼴(맑은 고딕)이거나 아직 확보하지 못한 글꼴이다.`)
lines.push(`class FontOption {`)
lines.push(`  const FontOption({required this.id, required this.label, this.family, this.bundled = true});`)
lines.push(`  final String id;`)
lines.push(`  final String label;`)
lines.push(`  /// Flutter fontFamily 이름. null이면 기본 글꼴을 쓴다.`)
lines.push(`  final String? family;`)
lines.push(`  /// 앱에 번들된 글꼴인가. false면 시스템 글꼴이거나 미확보다.`)
lines.push(`  final bool bundled;`)
lines.push(`}`)
lines.push('')

// 확보 상태. 미확보는 pubspec에 없으므로 family를 주면 안 된다(조용히 기본 글꼴로 렌더된다).
const BUNDLED = { lineseed: 'LINESeedKR', nanum: 'NanumGothic', kyobo: 'KyoboHandwriting2019' }
const SYSTEM = { malgun: 'Malgun Gothic' }

lines.push(`const List<FontOption> fontOptions = [`)
for (const f of fontOptions) {
  if (BUNDLED[f.id]) {
    lines.push(`  FontOption(id: '${f.id}', label: ${dq(f.label)}, family: '${BUNDLED[f.id]}'),`)
  } else if (SYSTEM[f.id]) {
    lines.push(`  // Windows 시스템 글꼴이라 번들하지 않는다.`)
    lines.push(`  FontOption(id: '${f.id}', label: ${dq(f.label)}, family: '${SYSTEM[f.id]}', bundled: false),`)
  } else {
    lines.push(`  // 미확보 — TTF 원본과 임베딩 라이선스 확인 전이라 family를 주지 않는다.`)
    lines.push(`  FontOption(id: '${f.id}', label: ${dq(f.label)}, bundled: false),`)
  }
}
lines.push(`];`)
lines.push('')

fs.writeFileSync(OUT, lines.join('\n'), 'utf8')

const counts = LOCALES.map((l) => `${l} ${Object.keys(tables[l]).length}`).join(' / ')
console.log(`생성 완료: ${OUT}`)
console.log(`키 수 — ${counts}`)
console.log(`글꼴 옵션 ${fontOptions.length}개`)
