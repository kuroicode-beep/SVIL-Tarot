# 완료보고서 — 오류 수정·기능 개선 (배포 경로 / 접근성)

- 작업자: Claude Code
- 일자: 2026-07-26
- 브랜치/워크트리: full-review-94436a
- 목표: 오류 수정 기능 개선

## 배경

전체 검수 중, "서브패스 배포 지원"과 "저시력 skip-link 접근성" 두 기능이
코드상 **의도됐으나 실제로는 깨져 있는** 상태를 확인. 세 지점을 수정.

## 수정 내역

### 1. AI 타로 이미지 경로 하드코딩 (서브패스 배포 깨짐)
- 파일: `src/pages/AiTarotPage.tsx`
- 문제: `src="/deck/17_The_Star_00001_.webp"` 하드코딩. 나머지 코드는
  `deckUrl()`(`import.meta.env.BASE_URL`)을 쓰는데 이 한 곳만 예외 →
  GitHub Pages 등 서브패스 배포 시 이 이미지만 404.
- 조치: `deckUrl('17_The_Star_00001_.webp')`로 교체.

### 2. skip-link(#main) 대상 누락 (접근성)
- 파일: `src/components/AppShell.tsx`, `src/styles/tokens.css`,
  각 페이지(Ai/Learn/Home)
- 문제: 상단 "본문으로 건너뛰기" 링크는 `#main`을 가리키지만,
  `id="main"`이 9개 중 3개 페이지에만, 그것도 `<main>`·`<div>`에 제각각 존재.
  나머지 6개(실전·소울·히스토리·퀴즈·설정·스프레드)에선 링크가 무동작.
- 조치: `AppShell`에서 `<Outlet>`을 `<div id="main" tabIndex={-1}>`로 감싸
  **모든 페이지 공통 단일 타깃**으로 통일. 페이지에 흩어진 `id="main"` 제거
  (중복 id 방지). `.main-region`에 `flex:1; display:flex; flex-direction:column`
  부여해 기존 `.page{flex:1}` 높이·홈 중앙정렬 유지.

### 3. BrowserRouter basename 누락 (서브패스 라우팅 깨짐)
- 파일: `src/App.tsx`
- 문제: 서브패스 배포 시 라우터가 base 경로를 모름.
- 조치: `<BrowserRouter basename={import.meta.env.BASE_URL}>`.

## 검증

- `tsc -b` 통과, `vite build` 성공(48 modules), oxlint 신규 경고 없음(기존 무해 경고만).
- 브라우저 확인:
  - `#main` 래퍼: `display:flex, flex-grow:1`, 높이 743px로 뷰포트 채움, 홈 중앙정렬 유지.
  - `/practice`(기존 무동작 페이지)에서 skip-link 활성화 시 포커스가 `#main`으로 이동,
    문서 내 `<main>` 정확히 1개.
  - `/ai` 별 이미지 `deckUrl` 경유 정상 로드(naturalWidth 768).

## 변경 파일

- `src/pages/AiTarotPage.tsx`
- `src/pages/HomePage.tsx`
- `src/pages/LearnPage.tsx`
- `src/App.tsx`
- `src/components/AppShell.tsx`
- `src/styles/tokens.css`
- `.claude/launch.json` (신규, 프리뷰 서버 구성)
