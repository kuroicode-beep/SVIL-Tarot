# 완료보고서_20260725_SVIL-Tarot_v1.0_Cursor

## 요약

SVIL-Tarot를 v0.1 MVP → v0.2 설정/i18n → v0.3 Stitch·콘텐츠·런북 → **v1.0.0 안정판**까지 로드맵 전 구간을 한 세션에서 마감했다.

## 산출물

| 항목 | 좌표 |
|------|------|
| 앱 | `C:\Projects\SVIL-Tarot` Vite/React |
| GitHub | https://github.com/kuroicode-beep/SVIL-Tarot (public) |
| 버전 | `VERSION` = **1.0.0** |
| 랜딩 | `site/` → gh-pages |
| Vault | `G:\내 드라이브\SVIL Vault\03_PRJ\SVIL-Tarot\` |
| Outline | 프로젝트 위키 + 작업지시/런북 |

## 기능 범위 (v1.0)

1. 타로 배우기 (사이드바 단계 + 메이저 전체 퀴즈 포함)
2. 스프레드 1/3/5 + 퀴즈
3. 실전 (나의 해설 + Ollama 조언) · 상단 저장
4. AI 타로 (질문/카테고리, 2열 Stitch형 레이아웃)
5. 소울카드
6. TTS · IndexedDB 히스토리 · 기록 초기화
7. 글꼴·언어(5)·글자크기 · 전체화면 · 저시력 덱
8. 런북(CORS/preview) · 배포 랜딩 · 후원 QR

## 검증

- `npm run build` 성공 (최종 마감 시 재실행)
- 수용 기준: 로드맵 Phase1–3 문서 체크리스트 완료

## 비범위 (유지)

Flutter 이식, LoveType 결제, 클라우드 DeepSeek 직호출, Tauri 셸(별도 작업지시)
