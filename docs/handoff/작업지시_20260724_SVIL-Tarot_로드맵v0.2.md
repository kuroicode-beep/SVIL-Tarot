# 작업지시 · SVIL-Tarot 로드맵 v0.2

- 프로젝트: SVIL-Tarot
- 작업 폴더: `C:\Projects\SVIL-Tarot`
- 확정 시각: 2026-07-24 23:12 (KST)
- 기준 커밋: `a7ff2d0` (v0.1.0 public)
- 저장소: https://github.com/kuroicode-beep/SVIL-Tarot

## 목표

v0.1 MVP(배우기·스프레드·실전·AI·소울·TTS·히스토리)를 유지한 채, SVIL 표준 설정·접근성·Stitch 정렬·배포 편의까지 올려 **v0.2.0**으로 마일스톤한다.

## 완료된 전제 (v0.1)

- 5대 메뉴 + Ollama `gemma4:12b` + TTS + IndexedDB
- 저시력 덱 78장, Stitch zip `asset/stitch/`
- public GitHub, Vault `03_PRJ\SVIL-Tarot`, Outline 위키

## 로드맵 (확정)

### Phase 1 — v0.2.0 (이번 작업지시, 즉시 실행)

1. **설정 표준 보강**: 글꼴 선택(로컬 `local()` 8종 후보, 미리보기), 기존 글자 크기 S/M/L 유지
2. **i18n 5종**: ko(기본)·en·ja·zh·vi — UI 문자열 사전, `<html lang>` 동기화
3. **상단 바**: Stitch와 같이 저장 버튼 복구 + 현재 화면 저장 핸들러 연결
4. **설정**: 기록 초기화, Ollama/TTS 상태 라벨 강화
5. **홈**: 덱 `17_The_Star` 실루엣 배경(저시력 덱)으로 분위기 앵커
6. **바로가기**: `scripts/create-desktop-shortcut.ps1` (dev 서버 또는 preview)
7. VERSION → `0.2.0`, 설정 히스토리 메뉴 갱신, 빌드·커밋·푸시

### Phase 2 — v0.3.0 (다음)

1. Stitch `code.html` 화면별 레이아웃 1:1 근접(배우기·AI·소울)
2. 메이저 22장 레슨 문장·퀴즈 세트 확장, 마이너 슈트별 퀴즈
3. 프로덕션 CORS 안내(Ollama `OLLAMA_ORIGINS`) + `npm run preview` 런북
4. 데스크톱 셸(Tauri/Electron) 검토 — 결정 후 별도 작업지시

### Phase 3 — v1.0.0 (안정판)

1. 콘텐츠 QA, 저시력 사용성 점검(포커스·TTS·대비)
2. 랜딩/배포 페이지(필요 시 gh-pages)
3. 완료보고서·핸드오프 정식 마감

## 수용 기준 (Phase 1)

- [x] 설정에서 글꼴·언어 변경이 즉시 반영
- [x] 실전/AI/소울에서 상단 저장으로 IndexedDB 기록 가능
- [x] 기록 초기화 후 히스토리 비움
- [x] `npm run build` 성공
- [x] origin main 푸시, VERSION=0.2.0

## 비범위

- Flutter 이식, LoveType 결제, 클라우드 DeepSeek, 다중 덱 전환
