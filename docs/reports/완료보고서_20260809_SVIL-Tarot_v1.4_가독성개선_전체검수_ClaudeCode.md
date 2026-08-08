# 완료보고서 — SVIL-Tarot v1.4.0 가독성 개선 · 전체 검수 · 기능 확장

- 일자: 2026-08-09
- 작업자: Claude Code
- 브랜치: `claude/design-readability-improvement-783e72`
- 이전 버전: 1.3.0 → **1.4.0**

## 1. 요청 사항

1. 밝은 바탕 버튼이 보기 어려움 → 어두운 바탕 + 흰/노랑 글자로 변경
2. 전체 기능 검수
3. 실제 활용 가능한 기능 업데이트 추천
4. 웹검색으로 유사 앱 기능 조사 및 추가

## 2. 디자인 — 밝은 바탕 버튼 전면 교체

### 문제의 실체

변경 전 조합(`#000` on `#b3ddff`)은 **WCAG 대비율 14.70:1로 이미 AAA를 통과**하고 있었다.
즉 대비율 지표로는 문제가 잡히지 않는 결함이었다.

실제 원인은 대비율이 아니라 **절대 휘도**다. 페이지 배경(`#0d0d12`, 상대휘도 0.0042) 위에
휘도 0.685짜리 밝은 타일이 화면 절반을 덮으면서 헤일레이션(번짐)과 눈부심을 일으켰다.
WCAG는 이 축을 측정하지 않는다.

| | 버튼 바탕 | 상대휘도 | 페이지 대비 밝기 점프 |
|---|---|---|---|
| 이전 | `#b3ddff` | 0.6852 | **13.6배** |
| 이전(배지) | `#ffd479` | 0.6973 | 13.8배 |
| **이후** | `#1c2431` | 0.0173 | **1.2배** |

### 새 토큰

```css
--primary-surface: #1c2431;        /* 강조 버튼 바탕 */
--primary-surface-hover: #26334a;
--yellow: #ffd94a;                 /* 테두리·글자 */
--on-primary: #000000 → #ffd94a;   /* 재정의 */
--focus-ring-inner: #ffffff;       /* 신설 */
```

강조 = `어두운 바탕 + 2px 노랑 테두리 + 노랑 글자`.
넓은 면적을 밝은 색으로 채우지 않고, 밝은 색은 글자와 테두리에만 쓴다.

### 대비율 실측 (상대휘도 직접 계산)

| 조합 | 대비 | 등급 |
|---|---|---|
| `#ffd94a` on `#1c2431` — 강조 글자 | 11.35:1 | AAA |
| `#d6ecff` on `#26334a` — hover | 10.46:1 | AAA |
| `#ffd94a` 테두리 vs `#0d0d12` | 14.10:1 | AAA |
| `#c9c9d4` on `#1c2431` — 힌트 | 9.50:1 | AAA |
| `#ff9b9b` on `#16161d` — 오류 | 8.93:1 | AAA |
| `#ffffff` on `#1c2431` — 포커스 링 | 15.60:1 | AAA |

### 적용 대상

`.home-cta` · `.btn--primary` · `.chip.is-on` · `.segment button.is-on` ·
`.learn-step.is-active` · `.lesson-badge` · `.skip-link` · 랜딩 `site/index.html`의 `.btn-primary`

`background: var(--accent-*)` / `var(--warning)` 사용처는 저장소 전체에서 0건이 되었다.

### 스티치 시안 반영

사용자가 전달한 `asset/ui.zip`(Stitch 산출물)의 `DESIGN.md`가 같은 방향을 확정했고,
세부 규격을 다음과 같이 맞췄다.

- 입력 활성 테두리: 파랑 → 노랑 2px
- 상태 배지: 중립 테두리 + 색 점 + 텍스트 라벨
- 퀴즈 정오답: 테두리 + 배경 틴트(12%) + `✓ 정답` / `✕ 오답` 라벨
- 조작 라벨 자간 0.04em, 카드 라운딩 16px
- 학습 현재 단계 번호는 노랑 원(40px 소면적이라 헤일레이션 위험 없음)

## 3. 전체 검수 — 확정 결함과 수정

40개 에이전트가 코드를 정독하고, 각 결함을 별도 에이전트가 적대적으로 반박 검증했다.
검증을 통과한 22건 + 종합 단계에서 재검산된 항목을 수정했다.

### 치명

| 파일 | 문제 | 수정 |
|---|---|---|
| `src/data/quizzes.json` | 6개 문항에 **정답과 글자가 똑같은 보기**가 두 번. 화면상 정답인 버튼을 눌러도 오답 처리 | 중복 오답 보기 6개 교체 + 판정을 인덱스 → 문자열 비교로 변경 |
| `src/lib/sajuName.ts:24` | `(month+1)%12`로 **월주 전 구간이 한 달 밀림**. 1990-03-15 → 경진(오답), 정답 기묘 | 인월 기준 재계산. 연간→월간 시작표는 검산 결과 정확해 그대로 유지 |
| `src/pages/CustomersPage.tsx` | `<button>` 안에 `<span role="presentation" onClick>` 중첩 — **'수정'에 키보드·스크린리더로 도달 불가** (WCAG 2.1.1/4.1.2) | 컨테이너를 `div`로, '상세'(Link)와 '수정'(button)을 형제 컨트롤로 분리 |
| `src/pages/AiTarotPage.tsx` | `aria-hidden={cards.length > 0}` — **조건이 정확히 반대**. 카드를 뽑으면 카드명·정역방향이 보조기술에서 사라짐 | 조건 반전 |

### 중대

- **`.error-text` CSS 정의 자체가 없었음** — 11개 화면의 오류 메시지가 일반 본문과 동일하게 보이던 상태. 정의 추가 + 전 지점 `role="alert"`
- **TTS 중단 불가** — `AbortController`·타임아웃 부재로 '중지'를 눌러도 요청이 살아 나중에 재생, 연속 호출 시 음성 겹침. generation 카운터 + abort + 15초 타임아웃 + `revokeObjectURL`
- **저장 실패가 조용히 묻힘** — `void runSave()`라 rejection 소실. try/catch + `saveFailed` 플래그 + 실패 배너(문구·role로 구분, 색 의존 없음)
- **저장 연타 시 기록·상담 중복 생성** — `savingRef` + `savedRef`로 차단, `recordServiceConsultation`에 id를 뚫어 재저장이 덮어쓰기가 되게 함
- **고객 수정 시 `createdAt`이 현재 시각으로 덮어써짐**(복구 불가) — 서비스 계층에서 이전 레코드의 값을 살림
- **고객 삭제가 `history`를 남김** — AI 리딩 전문(`aiText`)이 customerId와 함께 남아 기록 화면에 계속 노출. 스키마 v3에 `history.by-customer` 인덱스 추가 후 한 트랜잭션으로 확장
- **IndexedDB 실패 Promise 영구 캐시** — `blocked`/`blocking`/`terminated` 콜백 + 실패 시 캐시 무효화. 3개 목록 화면에 로딩/오류/비어있음 3분기 + 다시 시도
- **`/learn` stale state** — 단계를 옮겨도 `idx`가 남아 "16 / 2" 같은 진행 표시. `stageId` 기준 리셋
- **상단바 읽어주기가 이전 화면 문장을 낭독** — 정리 함수에서 `lastSpeakText` 비움 + 읽을 내용 없으면 `aria-disabled` + 전용 라벨
- **TTS 오류가 설정 화면에서만 표시** — 전역 배너로 승격
- **수리오행 `elems[total % 5]`** — 끝자리 기준으로 정정(11→목, 13→화, 15→토, 17→금, 19→수 검산)
- **연주가 입춘을 무시** — 1/1~2/3 출생자에게 다음 해 간지. 입춘 근사 테이블 적용 + 경계 경고
- **시주 미산출** — 일간 기준 시두법으로 실제 계산 추가(야자시 처리 포함)
- **`SERVICE_LABELS` 한국어 하드코딩** — `SERVICE_LABEL_KEYS`(키만 보유) + 호출부 `t()`
- **삭제 확인창 부재 3곳** — 상담·기록 삭제에 확인 추가
- **`tables[locale]` undefined 시 백지** — 사전 폴백 + `ErrorBoundary` 추가

### 접근성 일괄

- **'글자 크게'가 rem 텍스트에 안 먹힘** — `<html>`에 `font-size` 선언이 없어 rem이 16px 고정이었다. `:root { font-size: var(--font-size-base) }` + `body { font-size: 1rem }`
- **`--border`가 조작 경계에 사용** — 배경 대비 1.6:1로 WCAG 1.4.11(3:1) 미달. 조작 대상은 `--border-strong`(3.1~3.7:1)로 교체, `--border`는 비인터랙티브 전용
- **포커스 링이 홈에서 잘림** — `.home-page`의 무의미한 `overflow:hidden` 제거(`.home-silhouette`은 `position:fixed`라 애초에 클리핑 대상이 아님), `.segment`의 `overflow:hidden`도 제거
- **포커스 링과 상태 표시가 같은 노랑** — 흰색 안쪽 링 + 노랑 바깥 링 2중 링으로 분리
- **sticky 상단바가 포커스를 가림** — `scroll-margin-top` 추가 (WCAG 2.4.11)
- **Windows 고대비 모드 미대응** — `@media (forced-colors: active)` 블록 추가
- 색만으로 상태를 알리던 곳에 라벨 병행 — 퀴즈 정오답(5개 언어 i18n), 선택 칩·글꼴·세그먼트에 `✓` 글리프, `aria-pressed` 추가
- `opacity`로 흐리던 곳(비활성 버튼·홈 힌트) 제거 — 대비까지 같이 무너지므로 색상 토큰으로 대체
- 랜딩 언어 스위처 터치 타겟 40px → 50px

### 검증에서 "문제 없음"으로 기각된 것

연간→월간 시작표, 일주 기준일, `drawCards` Fisher-Yates 셔플, 5개 언어 사전 키 커버리지,
`SettingsPage`의 `aria-pressed`(이미 존재).

## 4. 신규 기능 (경쟁 앱 조사 반영)

한국(점신·포스텔러·헬로우봇·정통사주 등) / 글로벌(Labyrinthos·Golden Thread·Galaxy Tarot·Biddy Tarot 등)
및 저시력 접근성 모범사례를 웹으로 조사해, **로컬 오프라인·Ollama·IndexedDB만으로 성립하는 것**만 골라 구현했다.

| 기능 | 근거 | 파일 |
|---|---|---|
| **전체 백업/복원 (JSON)** | 앱이 IndexedDB에만 의존하는데 내보내기가 0건이었다. 저장소를 비우면 고객·상담·리딩이 전부 증발 | `src/services/backup.ts`, `SettingsPage` |
| **오늘의 한 장** | 점신·포스텔러의 '오늘의 운세', Golden Thread의 자정 리셋 데일리 카드. 날짜 시드로 결정적 추첨이라 서버 없이 재현 가능 + 연속일수 | `src/lib/daily.ts`, `src/pages/DailyPage.tsx` |
| **리딩 결과 추적** | 조사한 앱 어디에도 없는 빈틈. 대부분 저널·통계에서 멈추고 '예측 vs 실제' 루프가 없다 | `src/services/history.ts`, `HistoryPage` |
| **스프레드 자동 진단** | Galaxy Tarot Pro의 Spread Analyzer. 규칙 연산 결과를 AI 프롬프트 앞단에 붙여 리딩 품질도 같이 향상 | `src/lib/analyze.ts`, `PracticePage`, `ollama.ts` |

DB 스키마 v3으로 한 번에 마이그레이션(`history.by-customer` 인덱스 + `outcome` 필드 + `cardNotes`·`dailyDraws` 스토어).

### 안 하기로 한 것

| 기능 | 이유 |
|---|---|
| 전문가 1:1 상담 매칭 | 실시간 매칭·통화 라우팅·상담사 검증에 서버와 운영 인력 필요. 이 앱은 "상담사가 쓰는 도구" 포지션 유지가 정합적 |
| 코인/재화 인앱 결제 | 결제 게이트웨이·영수증 검증에 서버 필수, 비수익 방향과 배치 |
| 후기·평점 커뮤니티 | UGC는 저장소·인증·모더레이션 전부 서버 기능 |
| 커뮤니티 통계 비교 | 서버 집계 필요. 대신 "78장 균등 분포 대비 내 편향"이라는 이론 기준선으로 대체 |
| 관상·손금 사진 분석 | 비전 모델 필요 + **저시력 사용자가 자기 얼굴을 정확히 프레이밍하는 것 자체가 접근성에 부적합** |
| OS 홈 화면 위젯 | 웹앱에서 불가. 네이티브 래핑 전제 |

## 5. 검증

- `tsc -b && vite build` 통과
- `oxlint` — 신규 경고 없음
- i18n 키 정합성: 코드에서 쓰는 179개 키가 사전에 전부 존재 (스크립트 전수 확인)
- 대비율·휘도: sRGB 상대휘도 공식으로 직접 계산해 표에 수치 기재

**미검증**: 실제 브라우저 렌더 확인을 못 했다. 내부 브라우저는 앱 크래시 이슈로 사용 금지 상태이고,
외부 크롬 확장은 이 세션에 연결된 인스턴스가 없었다(`list_connected_browsers` 빈 배열).
시각 확인은 사용자 환경에서 `npm run dev`로 필요하다.

## 6. 남은 일 (v1.4.x)

- 잔여 하드코딩 한국어 i18n 추출 — `CompatPage`·`SajuPage`·`NamingPage`·`NameologyPage`·`CustomerPicker` 등 약 100줄.
  주의: `SajuPage`의 `focus`, `CompatPage`의 `relation`은 화면 표시 문자열이자 **LLM 프롬프트 인자·`meta` 저장값**이므로
  배열을 그대로 `t()`로 감싸면 로케일에 따라 저장 데이터가 달라진다. `{ id: '종합', key: 'cat_all' }` 형태로 값과 라벨을 분리해야 한다.
- `tsconfig.app.json`에 `"strict": true` (별도 커밋 권장)
- 음력 환산 미구현 — 현재는 경고만 표기
- PWA 서비스워커·manifest 부재 (오프라인 캐시)
- 리딩 통계 대시보드, 카드별 개인 메모, SM-2 간격반복 학습 (v1.5 후보)
