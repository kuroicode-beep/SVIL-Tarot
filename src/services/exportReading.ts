// src/services/exportReading.ts — 리딩 1건을 고객에게 건넬 Markdown 문서/인쇄물로 내보낸다.
import { getLocalizedCard, type DrawnCard } from '../lib/cards'
import { APP_VERSION } from '../version'
import type { HistoryEntry, ReadingOutcome } from './db'

/**
 * 문서 본문에 찍히는 라벨 모음.
 * 이 계층은 로케일을 모른다 — services가 i18n을 import하면 순환 의존이 생기고
 * 5개 언어 중 한국어만 문서로 새어 나간다. 정상 경로는 호출부가 t('export_*')로
 * 만든 값을 labels로 통째로 넘기는 것이다.
 */
export type ExportLabels = {
  /** '일시' */
  date: string
  /** '고객' */
  customer: string
  /** '유형' */
  kind: string
  /** '뽑힌 카드' */
  cards: string
  /** '의미' */
  meaning: string
  /** '정방향' */
  upright: string
  /** '역방향' */
  reversed: string
  /** '내 메모' */
  note: string
  /** 'AI 리딩' */
  aiReading: string
  /** '사후 결과' */
  outcome: string
  /** '결과 메모' */
  outcomeNote: string
  /** 결과 값 표기 — 색이 아니라 글자로 남겨야 인쇄물에서도 구분된다. */
  outcomeValues: Record<ReadingOutcome, string>
}

/**
 * labels를 안 넘겼을 때 문서가 통째로 라벨 없이 나오는 걸 막는 최소 폴백.
 * 화면 UI에는 절대 쓰지 않는다 — 화면 문자열은 t()만 쓴다.
 */
export const FALLBACK_EXPORT_LABELS: ExportLabels = {
  date: 'Date',
  customer: 'Client',
  kind: 'Type',
  cards: 'Cards drawn',
  meaning: 'Meaning',
  upright: 'Upright',
  reversed: 'Reversed',
  note: 'Notes',
  aiReading: 'AI reading',
  outcome: 'Outcome',
  outcomeNote: 'Outcome note',
  outcomeValues: { hit: 'Accurate', partial: 'Partly right', miss: 'Off the mark' },
}

export type ExportOptions = {
  /** 고객명. 비어 있으면 문서에서 아예 생략한다(빈 줄로 남기지 않는다). */
  customerName?: string
  /** 'AI 타로'처럼 호출부가 이미 번역해 둔 유형 '값'. 라벨이 아니다. */
  kindLabel?: string
  /** 카드 이름·의미를 어느 언어로 쓸지. 안 넘기면 한국어 원본. */
  locale?: string
  labels?: Partial<ExportLabels>
}

export type PrintOptions = ExportOptions & {
  /** 인쇄 창의 document.title. 브라우저 PDF 저장 기본 파일명이 되므로 비워 두면 리딩 제목을 쓴다. */
  title?: string
  /** 인쇄 문서의 html lang. 안 넘기면 현재 문서의 lang을 그대로 물려받는다(스크린리더 발음이 달라진다). */
  lang?: string
}

/** 팝업 차단 sentinel. 사용자 문구가 아니라 신호값 — 호출부가 t('export_popup_blocked')로 옮긴다. */
export const POPUP_BLOCKED = 'POPUP_BLOCKED'

const pad = (n: number) => String(n).padStart(2, '0')

/** 옛 기록의 createdAt이 깨져 있으면 파일명에 NaN이 새어 나온다. 못 읽으면 현재 시각으로 대체한다. */
function toDate(iso?: string): Date {
  const d = iso ? new Date(iso) : new Date()
  return Number.isNaN(d.getTime()) ? new Date() : d
}

/** 사람이 읽는 표기: YYYY-MM-DD HH:mm (로컬 시각). */
function formatDateTime(iso?: string): string {
  const d = toDate(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 파일명용 타임스탬프: SVIL 규칙(공백 금지·언더스코어)에 맞춘 YYYYMMDD_HHmm. */
function stamp(iso?: string): string {
  const d = toDate(iso)
  const date = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
  return `${date}_${pad(d.getHours())}${pad(d.getMinutes())}`
}

/** 저장 경로마다 줄바꿈이 CRLF로 섞여 들어온다. 문서에서는 LF로 통일하고 양끝 공백을 턴다. */
function clean(text?: string): string {
  return (text ?? '').replace(/\r\n?/g, '\n').trim()
}

function mergeLabels(partial?: Partial<ExportLabels>): ExportLabels {
  return {
    ...FALLBACK_EXPORT_LABELS,
    ...partial,
    // outcomeValues는 중첩 객체라 얕은 전개로 덮으면 안 넘긴 값이 통째로 사라진다.
    outcomeValues: { ...FALLBACK_EXPORT_LABELS.outcomeValues, ...partial?.outcomeValues },
  }
}

type ExportCard = {
  position?: string
  name: string
  nameEn?: string
  direction: string
  meaning?: string
}

/**
 * Markdown과 인쇄 HTML이 같은 데이터를 두 번 조립하면 한쪽만 고쳐져 내용이 갈라진다.
 * 중간 모델을 하나 만들어 두 렌더러가 공유한다.
 */
type ExportModel = {
  title: string
  meta: { label: string; value: string }[]
  cards: ExportCard[]
  sections: { heading: string; text: string }[]
  footer: string
}

function toExportCard(card: DrawnCard, labels: ExportLabels, locale: string): ExportCard {
  let meaning = ''
  // 기록에 저장된 nameKo는 '뽑을 당시의 한국어'다. 문서 언어를 따라가도록 덱에서 다시 읽고,
  // 지금 덱에 없는 옛 카드 id일 때만 저장된 이름으로 되돌아간다.
  let name = card.nameKo || card.nameEn || card.id
  // 괄호 부제는 기록에 저장된 nameEn이 아니라 '덱의 영어 이름'을 쓴다.
  // 소울카드는 저장할 때 nameEn 자리에도 한국어를 넣기 때문에(SoulCardPage), 저장값을 쓰면
  // 영어 문서에 "The Magician (마법사)"처럼 한국어가 새어 나온다.
  let nameEn = card.nameEn
  try {
    const meta = getLocalizedCard(card.id, locale)
    meaning = card.isReversed ? meta.reversed : meta.upright
    name = meta.nameKo || name
    nameEn = meta.nameEn || nameEn
  } catch {
    // 옛 기록에는 지금 덱에 없는 카드 id가 남아 있을 수 있다.
    // getLocalizedCard는 그럴 때 throw하므로, 이름·의미 때문에 문서 전체를 못 만드는 일을 막는다.
  }
  return {
    position: card.positionLabel?.trim() || undefined,
    name,
    // 표시 이름과 같으면(영어 로케일) 부제를 빼서 같은 글자가 두 번 나오지 않게 한다.
    nameEn: nameEn && nameEn !== name ? nameEn : undefined,
    direction: card.isReversed ? labels.reversed : labels.upright,
    meaning: meaning || undefined,
  }
}

function buildModel(entry: HistoryEntry, opts: ExportOptions, labels: ExportLabels): ExportModel {
  const meta: ExportModel['meta'] = [{ label: labels.date, value: formatDateTime(entry.createdAt) }]
  const customer = clean(opts.customerName)
  if (customer) meta.push({ label: labels.customer, value: customer })
  const kind = clean(opts.kindLabel)
  if (kind) meta.push({ label: labels.kind, value: kind })

  const cards = (entry.cards ?? []).map((c) => toExportCard(c, labels, opts.locale ?? 'ko'))

  const sections: ExportModel['sections'] = []
  const userNote = clean(entry.userNote)
  if (userNote) sections.push({ heading: labels.note, text: userNote })
  const aiText = clean(entry.aiText)
  if (aiText) sections.push({ heading: labels.aiReading, text: aiText })

  if (entry.outcome) {
    const at = entry.outcomeAt ? ` (${formatDateTime(entry.outcomeAt)})` : ''
    const lines = [`${labels.outcomeValues[entry.outcome] ?? entry.outcome}${at}`]
    const outcomeNote = clean(entry.outcomeNote)
    if (outcomeNote) lines.push(`${labels.outcomeNote}: ${outcomeNote}`)
    sections.push({ heading: labels.outcome, text: lines.join('\n') })
  }

  return {
    // 제목이 비어 있어도 문서 첫 줄이 '# '로 남지 않게 브랜드명으로 채운다(브랜드는 번역 대상이 아니다).
    title: clean(entry.title) || 'SVIL Tarot',
    meta,
    cards,
    sections,
    footer: `SVIL Tarot v${APP_VERSION} · ${formatDateTime()}`,
  }
}

/** 리딩 하나를 Markdown 문자열로. 프롬프트가 아니라 사람이 읽는 문서다. */
export function readingToMarkdown(entry: HistoryEntry, opts: ExportOptions = {}): string {
  const labels = mergeLabels(opts.labels)
  const model = buildModel(entry, opts, labels)

  const out: string[] = [`# ${model.title}`, '']
  for (const m of model.meta) out.push(`- **${m.label}**: ${m.value}`)
  out.push('')

  if (model.cards.length > 0) {
    out.push(`## ${labels.cards}`, '')
    model.cards.forEach((c, i) => {
      const position = c.position ? `[${c.position}] ` : ''
      const nameEn = c.nameEn ? ` (${c.nameEn})` : ''
      out.push(`${i + 1}. ${position}**${c.name}**${nameEn} — ${c.direction}`)
      if (c.meaning) out.push(`   - ${labels.meaning}: ${c.meaning}`)
    })
    out.push('')
  }

  for (const s of model.sections) out.push(`## ${s.heading}`, '', s.text, '')

  out.push('---', '', model.footer, '')
  return out.join('\n')
}

/** 파일명은 SVIL 규칙: 공백 금지·언더스코어, 리딩 시각 기준이라 목록이 시간순으로 정렬된다. */
export function readingFilename(entry: HistoryEntry, ext = 'md'): string {
  return `svil-tarot-reading_${stamp(entry.createdAt)}.${ext}`
}

/** Markdown을 .md 파일로 내려받는다. */
export function downloadMarkdown(md: string, filename: string): void {
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.rel = 'noopener'
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    a.remove()
  } finally {
    // 클릭 직후 바로 해제하면 브라우저가 저장을 시작하기 전에 URL을 잃는다.
    // 안 풀면 Blob이 탭 종료까지 메모리에 남으므로 한 박자 뒤 반드시 해제한다.
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  return text.replace(/[&<>"']/g, (ch) => map[ch])
}

/**
 * 종이와 화면을 미디어로 갈라 놓는다.
 * 접근성 규칙(어두운 배경·고대비)은 발광 화면에서 눈부심을 줄이려는 것이고,
 * 종이는 반사 매체라 흰 바탕이 기본이다. 다크 배경을 인쇄하면 잉크로 뒤덮인 면 위에
 * 흰 글자를 얹는 꼴이라 번지고 오히려 읽기 어렵다 — 그래서 인쇄는 검정 글자 + 흰 배경이다.
 * 다만 이 HTML은 인쇄 대화상자가 뜨기 전 새 창에 그대로 화면 표시되고, 인쇄를 취소해도 창이 남는다.
 * 전면 흰 화면은 저시력 사용자에게 헤일레이션을 만들므로 @media screen에서만 다크로 뒤집는다.
 * 외부 CSS 참조 없이 이 문자열 하나로 자체 완결한다(오프라인·팝업 창에서도 그대로 나와야 한다).
 */
const PRINT_CSS = `
  /* 기본값 = 종이. screen을 못 잡는 환경도 안전한 쪽(흰 바탕)으로 떨어진다. */
  :root { --doc-bg: #ffffff; --doc-ink: #000000; }
  @media screen { :root { --doc-bg: #0d0d12; --doc-ink: #f5f5f7; } }
  @page { margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 24px;
    background: var(--doc-bg);
    color: var(--doc-ink);
    font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
    /* 종이는 12pt 고정. 화면(취소하고 남는 창)에서는 앱에서 고른 글자 크기를 따른다 —
       '큼 24px'을 쓰던 사람이 인쇄 버튼 하나로 16px 상당 화면을 만나면 읽을 수 없다. */
    font-size: 12pt;
    line-height: 1.7;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  h1 {
    margin: 0 0 12px;
    padding-bottom: 8px;
    border-bottom: 3px solid var(--doc-ink);
    font-size: 20pt;
    line-height: 1.35;
  }
  h2 {
    margin: 24px 0 10px;
    padding-left: 10px;
    border-left: 6px solid var(--doc-ink);
    font-size: 14pt;
    line-height: 1.4;
    page-break-after: avoid;
  }
  .meta { margin: 0 0 4px; }
  .meta .row { display: flex; gap: 10px; padding: 3px 0; }
  .meta .k { min-width: 90px; font-weight: 700; }
  .meta .v { flex: 1; }
  ol.cards { margin: 0; padding: 0; list-style: none; counter-reset: card; }
  ol.cards li {
    counter-increment: card;
    margin: 0 0 10px;
    padding: 10px 12px;
    border: 1.5px solid var(--doc-ink);
    page-break-inside: avoid;
  }
  ol.cards li .head { font-size: 13pt; font-weight: 700; }
  ol.cards li .head::before { content: counter(card) '. '; }
  ol.cards li .pos { font-weight: 400; }
  ol.cards li .en { font-weight: 400; }
  /* 정/역은 색이 아니라 글자와 기호로 구분한다 — 흑백 인쇄에서도 남아야 한다. */
  ol.cards li .dir { font-weight: 700; white-space: nowrap; }
  ol.cards li .meaning { margin-top: 4px; }
  .text { margin: 0; white-space: pre-wrap; word-break: break-word; }
  .foot {
    margin-top: 28px;
    padding-top: 8px;
    border-top: 1.5px solid var(--doc-ink);
    font-size: 10pt;
  }
`

function renderPrintHtml(
  model: ExportModel,
  labels: ExportLabels,
  docTitle: string,
  lang: string,
  screenFontPx: number,
): string {
  const meta = model.meta
    .map(
      (m) =>
        `<div class="row"><span class="k">${escapeHtml(m.label)}</span><span class="v">${escapeHtml(m.value)}</span></div>`,
    )
    .join('')

  const cards =
    model.cards.length > 0
      ? `<h2>${escapeHtml(labels.cards)}</h2><ol class="cards">${model.cards
          .map((c) => {
            const position = c.position ? `<span class="pos">[${escapeHtml(c.position)}] </span>` : ''
            const nameEn = c.nameEn ? `<span class="en"> (${escapeHtml(c.nameEn)})</span>` : ''
            const meaning = c.meaning
              ? `<div class="meaning">${escapeHtml(labels.meaning)}: ${escapeHtml(c.meaning)}</div>`
              : ''
            return `<li><div class="head">${position}${escapeHtml(c.name)}${nameEn} <span class="dir">— ${escapeHtml(c.direction)}</span></div>${meaning}</li>`
          })
          .join('')}</ol>`
      : ''

  const sections = model.sections
    .map((s) => `<h2>${escapeHtml(s.heading)}</h2><p class="text">${escapeHtml(s.text)}</p>`)
    .join('')

  // 화면에서만 앱의 글자 크기를 따른다. 인쇄(@page)는 12pt 종이 기준을 유지한다.
  const screenCss = `@media screen { body { font-size: ${screenFontPx}px; } }`

  return `<!doctype html><html lang="${escapeHtml(lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(docTitle)}</title><style>${PRINT_CSS}${screenCss}</style></head><body><h1>${escapeHtml(model.title)}</h1><div class="meta">${meta}</div>${cards}${sections}<p class="foot">${escapeHtml(model.footer)}</p></body></html>`
}

/** 인쇄용 HTML을 새 창에 열어 브라우저 print-to-PDF로 넘긴다. 팝업이 막히면 POPUP_BLOCKED를 던진다. */
export function printReading(entry: HistoryEntry, opts: PrintOptions = {}): void {
  const labels = mergeLabels(opts.labels)
  const model = buildModel(entry, opts, labels)
  // 화면 문서의 lang은 AppContext가 설정 언어로 계속 갱신한다(ErrorBoundary도 같은 값을 읽는다).
  // 이 계층은 로케일을 모르니 그 값을 그대로 물려받는 게 가장 정확하다.
  const lang = clean(opts.lang) || document.documentElement.lang || 'ko'
  // 이 창은 인쇄를 취소해도 화면에 남는다. 앱에서 고른 글자 크기를 그대로 물려받지 않으면
  // '큼 24px'을 쓰던 사람이 16px 상당 화면을 만나 그 자리에서 못 읽는다.
  // 루트 font-size는 AppContext가 설정에 맞춰 갱신하므로 그 값을 읽어 쓴다.
  const rootPx = Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
  const screenFontPx = Number.isFinite(rootPx) && rootPx > 0 ? rootPx : 16
  const html = renderPrintHtml(model, labels, clean(opts.title) || model.title, lang, screenFontPx)

  // 팝업이 막히면 window.open은 예외 대신 null을 준다. 확인하지 않으면 버튼이 먹통처럼 보인다.
  // features에 noopener를 넣으면 차단이 아닐 때도 null이 오므로(핸들을 안 준다) 넣지 않는다 —
  // 여기서는 창 핸들로 document.write와 print를 해야 한다.
  const win = window.open('', '_blank')
  if (!win) throw new Error(POPUP_BLOCKED)

  win.document.open()
  win.document.write(html)
  win.document.close()

  // document.write 직후 곧바로 print()하면 레이아웃 전에 인쇄가 걸려 빈 장이 나오는 브라우저가 있다.
  // 창은 닫지 않는다 — 인쇄를 취소해도 사용자가 Ctrl+P로 다시 시도할 수 있어야 한다.
  setTimeout(() => {
    try {
      win.focus()
      win.print()
    } catch {
      // 사용자가 인쇄 대화상자 전에 창을 닫으면 접근이 실패한다. 취소와 같은 상황이라 조용히 넘긴다.
    }
  }, 250)
}
