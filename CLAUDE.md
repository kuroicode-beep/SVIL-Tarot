# SVIL-Tarot

저시력 친화 타로 학습·실전·AI 리딩 웹앱 (Vite + React + TypeScript).

## 1. 개요

- 로컬 경로: `C:\Projects\SVIL-Tarot`
- GitHub: https://github.com/kuroicode-beep/SVIL-Tarot (public)
- Vault: `G:\내 드라이브\SVIL Vault\03_PRJ\SVIL-Tarot\`
- LLM: Ollama `gemma4:12b` · TTS: `127.0.0.1:8765`
- 덱: `public/deck/` (LoveType low_vision_deck)

## 2. 버전 규칙

루트 `VERSION` / `VERSIONING.md` 참고. 현재 **1.2.0**.

- 패치: 버그픽스·소기능 → `1.1.x`
- 마이너: 기능 추가·UI 개편 → `1.2.0` …
- 메이저: 호환 깨짐·데이터 구조 변경 → `2.0.0`

버전 문자열은 `src/version.ts`의 `APP_VERSION`이 앱 쪽 단일 소스다.
갱신 시 `VERSION` · `package.json` · `APP_VERSION` 세 곳을 함께 맞춘다.
`VERSION_HISTORY`(버전·날짜·요약)도 같은 파일에서 관리하며, 상단바 로고 옆에 `vX.Y.Z`를 상시 표시한다.

## 3. 히스토리 메뉴 (필수)

설정 화면에 **히스토리 / 업데이트 내역**을 두고, 버전별 변경 요약(최신순, 버전당 2~4줄)을 앱 안에서 보여준다. git CHANGELOG와 별개.

내용은 `src/version.ts`의 `VERSION_HISTORY`에서 오며, 항목마다 버전·날짜(`YYYY-MM-DD`)·요약을 채운다.

## 4. docs/ 구조

```
docs/
  prd/           # PRD, 스펙
  architecture/  # 아키텍처
  storyboard/    # 스토리보드
  handoff/       # 작업지시서·핸드오프
  reports/       # 완료보고서
```

파일명: `카테고리_YYYYMMDD_내용_작업자.md`, 공백 금지, UTF-8.

## 5. 문서 이중 저장

완료보고서·사용자요청문서 등은 아래 두 곳에 **동시 저장**:

1. 로컬 `C:\Projects\SVIL-Tarot\docs\…`
2. Vault `G:\내 드라이브\SVIL Vault\03_PRJ\SVIL-Tarot\`

## 6. UI / 접근성

SVIL 고대비 다크 토큰. Stitch 참고: `asset/stitch/`. CDN 폰트 금지. 터치 타겟 ≥50px, 색+텍스트 라벨.

글꼴은 **SVIL 표준 8종**을 설정에서 고르며 기본값은 라인시드다. 실제 파일은 `public/fonts/`에 로컬 번들하고
`src/styles/tokens.css`의 `@font-face`에 `url()`로 등록한다(맑은 고딕만 Windows 기본이라 번들 제외).
`local()`만 쓰면 미설치 PC에서 선택해도 아무 변화가 없는 "깨진 옵션"이 되므로 금지.
색상은 `tokens.css`의 CSS 변수만 쓰고 하드코딩하지 않는다.

자세한 범용 지침은 `AGENTS.md`도 참고.
