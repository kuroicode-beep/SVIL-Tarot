# SVIL-Tarot 디자인 가독성 개선 — 스티치 프롬프트

- 작성일: 2026-08-09
- 작성자: Claude Code
- 목적: Google Stitch에 넣어 v1.4 화면 시안을 뽑기 위한 디자인 브리프
- 배경: 저시력 사용자 기준으로 밝은 바탕 버튼(#b3ddff, #ffd479)이 눈부심을 유발. 어두운 바탕 + 노랑 테두리·글자로 전환.

## 핵심 규칙

밝은 바탕 채움 전면 금지. 강조는 `어두운 바탕(#1C2431) + 2px 노랑 테두리(#FFD94A) + 노랑 글자`로 준다.
보조는 `어두운 슬레이트(#1F1F2A) + 회색 테두리(#6B6B82) + 흰 글자(#F5F5F7)`.
선택·정답·오답 등 모든 상태는 색과 함께 텍스트 라벨 또는 ✓ / ✕ 글리프를 병행한다.

## 대비 검증 (WCAG 상대휘도 직접 계산)

| 항목 | 조합 | 대비 | 등급 |
| --- | --- | --- | --- |
| 강조 버튼 글자 | `#ffd94a` on `#1c2431` | 11.35:1 | AAA |
| 강조 버튼 hover | `#d6ecff` on `#26334a` | 10.46:1 | AAA |
| 노랑 테두리 vs 페이지 | `#ffd94a` on `#0d0d12` | 14.10:1 | AAA |
| 오류 텍스트 | `#ff9b9b` on `#16161d` | 8.93:1 | AAA |
| 포커스 흰 링 vs 타일 | `#ffffff` on `#1c2431` | 15.60:1 | AAA |

눈부심(글레어) 지표 — 페이지 배경(#0d0d12) 대비 버튼 바탕의 밝기 점프:

| | 바탕 | 밝기 점프 |
| --- | --- | --- |
| 이전 | `#b3ddff` | 13.6배 |
| 이전(배지) | `#ffd479` | 13.8배 |
| 이후 | `#1c2431` | 1.2배 |

변경 전 조합도 WCAG 대비율 자체는 AAA였다. 문제는 대비율이 아니라
어두운 화면 속 넓은 밝은 면적이 만드는 절대 휘도 차이(헤일레이션)였고, 그 지표를 13.6배에서 1.2배로 낮췄다.

## 스티치 프롬프트 전문

아래를 그대로 Stitch에 붙여넣는다.

```text
Design a low-vision-first dark-theme web app called "SVIL Tarot" — a Korean tarot learning, practice, AI-reading and client-management app. Desktop-first responsive (1280x800 primary, also 390x844 mobile).

## CRITICAL DESIGN RULE — NO BRIGHT-FILLED BUTTONS
This is an accessibility app for low-vision users. Bright/light-filled buttons on a dark UI cause halation and glare and are the #1 problem to fix.
- NEVER use a light or pastel background fill on any button, chip, badge, tab, or CTA.
- ALL buttons use a DARK fill + a thick 2px bright BORDER + bright TEXT.
- Primary emphasis = warm YELLOW text (#FFD94A) + yellow 2px border on a dark navy fill (#1C2431).
- Secondary = WHITE text (#F5F5F7) + grey 2px border (#6B6B82) on dark slate fill (#1F1F2A).
- Never rely on color alone for state: every selected / correct / wrong / active state also shows a text label or a "✓ / ✕" glyph.

## COLOR TOKENS (use these exact hex values)
- Page background: #0D0D12, with a very subtle radial glow to #1A1A2E at 50% 30%
- Surface (cards/panels): #16161D
- Surface raised (inputs, secondary buttons): #1F1F2A
- Primary button fill: #1C2431 (hover #263346)
- Border: #3A3A48 / Border strong: #6B6B82
- Body text: #F5F5F7 / Muted text: #C9C9D4 (never below this lightness)
- Yellow accent (primary action text, focus ring, active state): #FFD94A
- Blue accent (headings, links, informational only — never as a fill): #7EC8FF / #B3DDFF
- Positive: #7EE2A8 / Negative: #FF9B9B / Warning: #FFD479
All text/background pairs must reach WCAG AAA (7:1) contrast.

## TYPOGRAPHY & SIZING
- Korean sans-serif, geometric and round (LINE Seed KR style). Bundled locally, no web fonts.
- Base body 18px, line-height 1.8, letter-spacing 0.02em, generous paragraph spacing.
- Never below 12px anywhere, including badges and helper text.
- Buttons and labels are bold (700).
- Every interactive target is at least 50x50px with 12px gaps between targets.
- Corner radius 12px (16px for cards).
- Focus indicator: 3px solid #FFD94A outline with 2px offset, always visible, never removed.

## COMPONENTS TO SHOW
1. Sticky top bar: brand wordmark "SVIL 타로" in light blue + a small pill showing "v1.4.0" + an icon-button row (읽어주기 🔊, 저장 💾, 고객 👥, 상담 🗂️, 기록 📋, 설정 ⚙, 전체화면 ⛶). Each icon button is icon-above-label, transparent fill, grey text, and on hover gains a yellow border + yellow label. Bottom border 2px.
2. Home screen: large centered title, a faint tarot "The Star" card silhouette watermark at 12% opacity behind everything, then a 2-column grid of large 140px-tall menu tiles. Tiles are DARK navy (#1C2431) with a 2px yellow border, a big emoji icon, and bold yellow label text. Some tiles span the full width. Labels: 고객 관리, 상담 기록, 타로 배우기, 스프레드, 실전 리딩, AI 타로, 소울카드, 사주풀이, 궁합, 성명학, 작명.
3. Button set: primary (dark navy + yellow border + yellow text), secondary (dark slate + grey border + white text), disabled (50% opacity), and a destructive variant (dark + red border + #FF9B9B text). Show hover and focus states side by side.
4. Chip row and segmented control: unselected = dark slate + grey border + white text; selected = dark navy + 2px yellow border + yellow text WITH a leading "✓" glyph so the state is readable without color.
5. Learning screen: left sidebar of numbered steps (40px circular number badge, dark fill + yellow border + yellow number when active, plus a yellow left edge marker); right side a lesson panel with a small "레슨" badge that is dark-filled with a yellow border and yellow text (NOT a solid yellow badge).
6. Quiz option list: full-width tall option buttons, dark fill, and after answering the correct one gains a green border plus a "정답 ✓" text label and the wrong one a red border plus "오답 ✕" — color plus text, always.
7. AI reading screen: two columns — left shows three face-down tarot card backs (dark card with a subtle dotted pattern and grey border) inside a bordered panel; right shows a question textarea and a long readable AI answer with 1.8 line-height.
8. Client (CRM) list and detail: a searchable list of client cards showing name, birth date, tags, and last consultation date; the detail panel shows a consultation timeline with service-type chips.
9. Settings screen: font-family picker, font-size segmented control (작게 / 보통 / 크게), language picker (한국어/English/日本語/中文/Tiếng Việt), TTS voice + speed with a preview button, and a "히스토리 / 업데이트 내역" list showing version, date, and 2-4 summary lines per release.
10. Status badges: connection state pills that always pair a colored dot with a text label (연결됨 / 끊김 / 확인 중).

## MOOD
Calm, quiet, mystical but clinical-clear. Deep near-black backgrounds, restrained glow, no gradients on text, no glassmorphism blur on content, no thin light-weight type, no low-contrast grey-on-grey. Readability outranks decoration everywhere.
```

## 코드에 반영된 곳

`src/styles/tokens.css` — `--primary-surface`, `--primary-surface-hover`, `--yellow` 추가, `--on-primary`를 `#000000` → `#ffd94a`로 재정의.
적용 대상: `.home-cta`, `.btn--primary`, `.chip.is-on`, `.segment button.is-on`, `.learn-step.is-active`, `.lesson-badge`, `.skip-link`.
`site/index.html` — 랜딩 `.btn-primary` 동일 규칙 적용.
