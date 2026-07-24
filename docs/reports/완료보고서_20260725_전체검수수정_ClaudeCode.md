# 완료보고서 — SVIL Tarot 전체 검수 및 수정

- 일시: 2026-07-25 08:00 KST
- 작업자: Claude Code (Opus 4.8)
- 브랜치: `claude/full-review-94436a` (워크트리)
- 커밋: `85880a6`
- PR: https://github.com/kuroicode-beep/SVIL-Tarot/pull/1 (main 병합 대기)

## 1. 배경

v1.0.0 상태의 SVIL Tarot 전체 검수 요청. 코드·데이터·접근성·배포 설정을 훑고, 발견한 문제를 수정.

## 2. 검수 결과 (양호)

- 타입(`tsc -b`) 통과, 린트 경고 4건은 모두 무해(저장 핸들러 `stateRef` 패턴, fast-refresh 1건).
- 데이터 정합성 완벽: 카드 78장, 덱 이미지 누락 0, 퀴즈 정답 인덱스 OOB 0, 스프레드 포지션 수 일치, 전 학습 단계에 퀴즈 존재, 소울카드 `major_01~09` 유효.
- 접근성 토큰 견고: `--touch-min: 50px`, 본문 16/18/20px, 고대비 다크.
- gh-pages 랜딩은 별도 정적 `site/`라 서브패스 문제 없음.

## 3. 수정 항목 (5건)

1. **i18n 본문 전면 번역** — 페이지 UI 텍스트 ~70개 키를 5개 언어(ko/en/ja/zh/vi)로 확장. `translate()`에 `{n}` 파라미터 보간 추가, 컨텍스트 `t(key, params?)` 시그니처 확장. 영어에 누락됐던 `보이스/속도`도 보완. 이제 언어 전환 시 학습·스프레드·실전·AI·소울카드·히스토리의 라벨·버튼·플레이스홀더·제목·aria가 모두 전환됨.
2. **소울카드 입력 검증** — `isValidBirth(y,m,d)` 추가. 빈값·존재하지 않는 날짜(월 13, 2월 30일 등)면 계산 차단 후 안내. 기존엔 빈칸으로 눌러도 9번(은둔자)이 나오던 버그 제거.
3. **홈 자동 전체화면** — 사용자 제스처 없이 호출돼 브라우저가 차단하던 무효 코드 제거. 상단바 버튼으로만 진입(정상 동작).
4. **TTS 연속 재생 레이스** — 재생 중단 시 이전 Promise를 오류가 아닌 정상 중단으로 resolve + 오브젝트 URL 누수 방지. 재생 전환 시 오류 깜빡임 제거.
5. **에셋 base 경로** — `deckUrl()`이 `import.meta.env.BASE_URL` 사용(홈 히어로 이미지 포함). vite `base`만 바꾸면 서브패스 배포에서 이미지가 안 깨짐. `vite.config.ts`에 가이드 주석 추가.

## 4. 검증

- `tsc -b` 통과, `oxlint` 신규 경고 없음, `vite build` 성공(48 모듈, 341KB / gzip 101KB).

## 5. 남은 과제

- **카드 콘텐츠 번역**: `cards.json`(78장 이름·정/역방향 의미·레슨), `quizzes.json` 문항이 한국어 전용. UI는 5개국어지만 콘텐츠 본문은 한국어. 번역 데이터 세트 필요(코드가 아닌 콘텐츠 작업).
- **의도적 한국어 잔존**: AI 카테고리 값(LLM 프롬프트/저장 메타), 저장된 기록 제목·설정 변경이력(데이터), TTS 낭독문(덱 콘텐츠), 에러 폴백(한국어 서비스 파이프라인) — 설계상 유지.
- **main 병합**: PR #1 병합은 자동 승인 정책에 막혀 사용자 조작 필요.

## 6. 변경 파일 (15개, +555 / −108)

`src/i18n/index.ts`, `src/context/AppContext.tsx`, `src/components/AppShell.tsx`, `src/lib/cards.ts`, `src/lib/soulCard.ts`, `src/services/tts.ts`, `src/pages/{Home,Learn,LearnQuiz,Spreads,Practice,AiTarot,SoulCard,History}Page.tsx`, `vite.config.ts`
