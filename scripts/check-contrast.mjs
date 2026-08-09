// scripts/check-contrast.mjs — tokens.css의 색 토큰을 실제로 계산해 접근성 회귀를 막는다.
//
// 왜 stylelint가 아니라 자체 스크립트인가:
// 이번에 문제가 됐던 건 "대비율 미달"이 아니라 "절대 휘도가 너무 높아 눈부심"이었다.
// 구판 팔레트는 WCAG 대비 14.70:1로 AAA를 통과하면서도 저시력 사용자에게 읽히지 않았다.
// 기성 린터는 이 축을 보지 않으므로 밝기 점프(luminance jump)를 직접 잰다.

import fs from 'node:fs'

const CSS = 'src/styles/tokens.css'

const lin = (c) => {
  c /= 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

const luminance = (hex) => {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

const contrast = (a, b) => {
  const x = luminance(a)
  const y = luminance(b)
  const [hi, lo] = x > y ? [x, y] : [y, x]
  return (hi + 0.05) / (lo + 0.05)
}

/** 페이지 배경 대비 밝기 점프. 2배를 넘으면 넓은 면적에서 눈부심이 생긴다. */
const jump = (surface, bg) => (luminance(surface) + 0.05) / (luminance(bg) + 0.05)

// 프리셋별로 :root / [data-contrast=...] 블록에서 토큰을 긁어온다.
function readTokens(css, selector) {
  const start = css.indexOf(selector)
  if (start < 0) return null
  const open = css.indexOf('{', start)
  const close = css.indexOf('\n}', open)
  const body = css.slice(open, close)
  const out = {}
  for (const m of body.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)) out[m[1]] = m[2]
  return out
}

const css = fs.readFileSync(CSS, 'utf8')
const base = readTokens(css, ':root {')
if (!base) {
  console.error('FAIL: :root 블록을 찾지 못했다')
  process.exit(1)
}

const presets = [
  ['표준', base],
  ['초고대비', { ...base, ...readTokens(css, "[data-contrast='max']") }],
  ['소프트', { ...base, ...readTokens(css, "[data-contrast='soft']") }],
]

const AAA = 7
const NON_TEXT = 3
const MAX_JUMP = 2

let failed = 0
const fail = (msg) => {
  console.error('  FAIL ' + msg)
  failed++
}

for (const [name, t] of presets) {
  console.log(`\n[${name}]`)
  const checks = [
    ['본문', t.text, t.bg, AAA],
    ['보조 텍스트', t['text-sub'], t.bg, AAA],
    ['강조 버튼 글자', t['on-primary'], t['primary-surface'], AAA],
    ['버튼 테두리 vs 배경', t['primary-border'], t.bg, NON_TEXT],
    ['조작 경계선 vs 패널', t['border-strong'], t.surface, NON_TEXT],
    ['오류 텍스트', t.negative, t.surface, AAA],
    ['긍정 텍스트', t.positive, t.surface, AAA],
    ['포커스 링 vs 배경', t.focus, t.bg, NON_TEXT],
  ]
  for (const [label, fg, bg, min] of checks) {
    if (!fg || !bg) {
      fail(`${label}: 토큰 누락 (${fg} / ${bg})`)
      continue
    }
    const r = contrast(fg, bg)
    const ok = r >= min
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label.padEnd(22)} ${r.toFixed(2)}:1 (최소 ${min})`)
    if (!ok) failed++
  }

  // 이번 사건의 핵심 지표.
  const j = jump(t['primary-surface'], t.bg)
  const jOk = j <= MAX_JUMP
  console.log(`  ${jOk ? 'ok  ' : 'FAIL'} ${'강조 버튼 밝기 점프'.padEnd(22)} ${j.toFixed(2)}배 (최대 ${MAX_JUMP}배)`)
  if (!jOk) failed++

  // 포커스 링과 버튼 테두리가 맞붙으면 구분이 안 된다. outline-offset으로 간격을 두는지 확인한다.
  const adj = contrast(t.focus, t['primary-border'])
  if (adj < NON_TEXT && !/outline-offset:\s*[1-9]/.test(css)) {
    fail(`포커스 링과 버튼 테두리가 ${adj.toFixed(2)}:1인데 outline-offset 간격이 없다`)
  }
}

console.log('')
if (failed) {
  console.error(`접근성 회귀 ${failed}건 — 커밋 전에 고칠 것`)
  process.exit(1)
}
console.log('접근성 토큰 검사 통과')
