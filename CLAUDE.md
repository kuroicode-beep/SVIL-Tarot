# SVIL-Tarot

저시력 친화 타로 학습·실전·AI 리딩 웹앱 (Vite + React + TypeScript).

## 1. 개요

- 로컬 경로: `C:\Projects\SVIL-Tarot`
- GitHub: https://github.com/kuroicode-beep/SVIL-Tarot (public)
- Vault: `G:\내 드라이브\SVIL Vault\03_PRJ\SVIL-Tarot\`
- LLM: Ollama `gemma4:12b` · TTS: `127.0.0.1:8765`
- 덱: `public/deck/` (LoveType low_vision_deck)

## 2. 버전 규칙

루트 `VERSION` / `VERSIONING.md` 참고. 현재 **0.1.0**.

- 패치: 버그픽스·소기능 → `0.1.x`
- 마이너: 기능/UI 마일스톤 → `0.2.0` …
- 안정판: `1.0.0`

## 3. 히스토리 메뉴 (필수)

설정 화면에 **히스토리 / 업데이트 내역**을 두고, 버전별 변경 요약(최신순, 버전당 2~4줄)을 앱 안에서 보여준다. git CHANGELOG와 별개.

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

자세한 범용 지침은 `AGENTS.md`도 참고.
