# 완료보고서 — SVIL 디자인 적용 점검 · 기능 점검 · 기능 개선 (v1.1.0)

- 작업자: Claude Code
- 일자: 2026-07-26
- 브랜치/워크트리: full-review-94436a
- 목표: 전체적으로 SVIL 디자인 적용 체크 · 기능 체크 · 기능 개선
- 기준 문서: `svil-frontend-design` 스킬(고대비 다크 + 라인시드 표준), 전역 앱 버전 규칙

## 1. 점검 결과 요약

기존 준수 항목(수정 불요): 색상 토큰 13종 전부 일치, 버튼 대비 규격(주 버튼 accent-strong+
on-primary / 일반 버튼 border-strong), 패널·배지·터치타겟 50px, 다국어 5종 순서, 글자 크기 3단계,
`prefers-reduced-motion`, 배지 색+텍스트 라벨 병행, `.progress` 모노체.

아래 6건은 기준 미달이라 수정했다.

## 2. 수정 내역

### 2-1. 글꼴 8종이 대부분 무동작 (최대 이슈)
- 문제: `@font-face`가 2개뿐이고 그마저 `local()`만 사용 → 시스템에 설치된 폰트에만 의존.
  이 PC 실측 결과 **8종 중 5종(LINE Seed·고운돋움·카페24동동·티머니둥근바람·레코)이 무동작**.
  선택해도 아무 변화가 없는 "깨진 옵션"(가이드 명시 금지).
  특히 SVIL 표준 폰트인 LINE Seed가 없어 **앱 전체가 교보손글씨(손글씨체)로 렌더링** 중이었고,
  이는 "숫자 손글씨 ✗" 안티패턴에도 해당.
- 조치: 레퍼런스 구현(TXTAIMemory)의 폰트 7종을 `public/fonts/`에 로컬 번들하고
  `@font-face`를 `url()` 방식으로 재작성(CDN 미사용). 맑은 고딕은 Windows 기본이라 번들 제외.
- 부수 수정: `레코`의 CSS 패밀리명이 `"Reco"`로 잘못 지정돼 있었음 → 실제 번들명 `Recipekorea`로 정정.

### 2-2. 기본 글꼴이 표준과 불일치
- 문제: 기본값 `fontId: 'kyobo'`, 폴백도 `fontOptions[1]`. 가이드는 **라인시드 기본**.
- 조치: 기본값·폴백 모두 `lineseed`(목록 첫 항목)로 변경. `--font-ui` 스택도 번들 기준으로 정리.

### 2-3. 저장 알림이 화면을 옮겨도 사라지지 않음 (기능 버그)
- 문제: `saveMessage`를 해제하는 코드가 없어, 실전에서 저장 후 설정으로 이동해도
  "저장됨" 배너가 계속 노출. `role="status"`라 스크린리더가 낡은 정보를 반복 안내 —
  저시력 사용자에게 특히 유해.
- 조치: `AppShell`에서 경로 변경 시 `setSaveMessage(null)`.

### 2-4. TTS 미리듣기 부재 (기능 개선)
- 문제: 설정에서 보이스·속도를 바꿔도 그 자리에서 확인할 수단이 없어 화면을 떠나야 했음.
  TTS가 주 인터랙션인 앱에서 큰 불편.
- 조치: TTS 패널에 미리듣기/중지 토글 버튼 추가(기존 `speak`/`stopSpeak` 재사용).
  TTS 연결이 끊긴 경우 비활성화. 문구는 5개 언어 사전 키로 추가.

### 2-5. 버전 규칙 미준수
- 문제: (a) 전역 규칙 "버전은 로고 옆에 상시 표시"인데 설정 화면에만 존재,
  (b) 업데이트 내역에 **날짜 없음**(규칙: 버전·날짜·요약),
  (c) 버전 문자열이 SettingsPage에 하드코딩돼 VERSION 파일과 이중 관리.
- 조치: `src/version.ts` 단일 소스 신설(`APP_VERSION` + `VERSION_HISTORY`).
  상단바 로고 옆에 `v1.1.0` 배지 상시 표시(12px 모노, 최소 폰트 규칙 준수).
  날짜는 git 로그에서 실제 릴리스일을 확인해 기입.
- 버전: 기능 추가(미리듣기)+UI 개편(글꼴 체계)이므로 SemVer MINOR → **1.1.0**
  (VERSION·package.json·앱 표시 3곳 동기화).

### 2-6. 색상 하드코딩 (안티패턴)
- 문제: CSS에 `#1a1a2e`, `#0e0e13`, `#000`(3곳), `#000`(이미지 배경) 하드코딩.
- 조치: 토큰 2종(`--bg-glow`, `--img-backdrop`) 추가, accent 배경 위 텍스트는 `--on-primary`,
  사이드바 배경은 `--bg`로 대체. TSX 인라인 색상은 원래부터 위반 없음.
  `mask-image`의 `#000`은 색이 아닌 알파 마스크라 유지.

## 3. 검증 (브라우저 실측)

- **글꼴**: 8종 전부 `document.fonts.check` LOADED, 8종 모두 클릭 시 실제 전환 확인
  (수정 전 5종 무동작 → 수정 후 0종 무동작). 네트워크 200 OK, 콘솔 에러 없음.
- **성능**: 실제 페이지 로드 시 사용 중인 1종만 다운로드(나머지 6종은 선택 시에만) — 회귀 없음.
- **대비비 실측**: 본문 17.8:1, 보조 11.0–11.8:1, 주 버튼 14.7:1, 링크 10.7:1,
  버튼 테두리 3.15:1 — 본문 4.5:1 / UI 3:1 기준 전부 충족.
- **터치 타겟**: 설정 화면 상호작용 요소 중 50px 미만 0건. 미리듣기 버튼 60px.
- **저장 배너**: 저장 직후 노출 → 화면 이동 시 `null`(해제) 확인.
- **버전 배지**: `v1.1.0`, 12px, Consolas 모노 확인.
- `tsc -b` 통과 · `vite build` 성공(49 modules) · 폰트 7종 `dist/fonts/` 포함 ·
  oxlint 신규 경고 없음(기존 무해 경고 4건 유지).

## 4. 변경 파일

- `public/fonts/` (신규, 7종 번들)
- `src/version.ts` (신규)
- `src/styles/tokens.css`
- `src/i18n/index.ts`
- `src/context/AppContext.tsx`
- `src/components/AppShell.tsx`
- `src/pages/SettingsPage.tsx`
- `VERSION`, `package.json` (1.0.0 → 1.1.0)

## 5. 문서 갱신 (후속 처리 완료)

`CLAUDE.md` §2가 1.0 이전 기준("현재 0.1.0", "안정판 1.0.0이 최종")이라 함께 정리했다.

- `CLAUDE.md`: 현재 버전 1.1.0, 패치/마이너/메이저 SemVer 기준으로 교체,
  `src/version.ts`가 앱 쪽 단일 소스임을 명시(VERSION·package.json·APP_VERSION 3곳 동기화).
  §6에 글꼴 규칙 추가 — `local()`만 쓰면 미설치 PC에서 "깨진 옵션"이 되므로
  `public/fonts/` 로컬 번들 필수(이번 이슈 재발 방지), 색상 하드코딩 금지 명시.
- `VERSIONING.md`: 1.0 이전 표를 SemVer 기준·단일 소스·히스토리 작성법으로 재작성.

## 6. 원본 저장소 이관 (중요)

이 작업은 워크트리 `full-review-94436a`에서 진행했으나, 해당 워크트리의 **git 메타데이터가
손상**돼 있었다(`.git/worktrees/full-review-94436a/`에 `HEAD`·`commondir`·`refs` 소실).
`git worktree repair`로도 복구 불가하고 기반 커밋 기록조차 남아 있지 않아, 커밋·병합이 불가능했다.

따라서 변경분을 `C:\Projects\SVIL-Tarot`(main, 클린 상태)에 직접 복사했다.

- **전체 복사는 하지 않았다.** 워크트리는 CRLF, 원본은 LF라 통째로 복사하면 미수정 파일
  (README·asset/stitch·scripts 등) 전부가 변경으로 잡혀 저장소가 오염된다.
  원본에만 있는 `docs/storyboard`도 존재.
- 실제 내용이 바뀐 파일만 선별해 **LF로 정규화**해 복사(폰트는 바이너리 그대로).
- 결과: 수정 13개 + 신규 5개, **209줄 추가 / 83줄 삭제** (줄바꿈 노이즈 없음).
- 검증: 원본에서 `tsc -b`·`vite build` 통과, 빌드 에셋 해시가 워크트리와 **완전 동일**
  (`index-Dnp8TbKH.css` / `index-CFLJZXIN.js`) → 바이트 단위 일치.
  텍스트 14종 + 폰트 7종 복사 정합성 전수 확인.

**현재 상태: main 워킹트리에 미커밋 변경으로 존재.** `git diff` 검토 후 커밋 필요.

## 7. 남은 제안

- oxlint `exhaustive-deps` 경고 3건은 각 페이지가 `stateRef`로 stale closure를
  의도적으로 방어하는 패턴이라 실제 버그 아님. 유지 권장.
- 손상된 워크트리 폴더 `.claude/worktrees/full-review-94436a`는 삭제 후
  `git worktree prune` 실행 필요(폴더가 남아 있으면 prune이 등록을 지우지 않음).
