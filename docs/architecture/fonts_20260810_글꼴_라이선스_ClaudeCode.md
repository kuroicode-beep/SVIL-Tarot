# SVIL-Tarot v2.0 글꼴 — 확보 상태와 라이선스 근거

- 작성일: 2026-08-10
- 작성자: Claude Code
- 대상: `app/assets/fonts/`, `app/pubspec.yaml`의 `fonts:` 선언

## 왜 이 문서가 필요한가

웹판은 `.woff`/`.woff2`를 **자기 페이지에서 서빙**했다. Flutter 데스크톱판은 `.ttf`를
**배포 실행 파일 안에 넣는다.** 이 둘은 라이선스상 다른 행위다 —
웹폰트 서빙만 허용하고 임베딩을 제한하는 글꼴이 실제로 존재한다.

그래서 글꼴마다 **재배포 근거를 확인하고 여기에 기록한 뒤에만** `pubspec.yaml`에 선언한다.
확인되지 않은 글꼴은 선언하지 않는다. 선언하면 빌드가 실패하므로 실수로 섞여 들어갈 수 없다.

## 현재 상태

| # | 글꼴 | 웹판 파일 | Flutter 확보 | 라이선스 확인 |
|---|---|---|---|---|
| 1 | **LINE Seed KR** (기본값) | `LINESeedKR-Rg.woff2` | ✅ `LINESeedKR-Rg.ttf` | ⚠ 확인 필요 |
| 2 | 교보손글씨2019 | `KyoboHandwriting2019.woff` | ✅ `KyoboHandwriting2019.ttf` | ⚠ 확인 필요 |
| 3 | 맑은 고딕 | (번들 안 함) | ✅ Windows 시스템 글꼴 | 해당 없음 — 번들하지 않음 |
| 4 | 나눔고딕 | `NanumGothic.woff` | ✅ Regular + **Bold** | ⚠ 확인 필요 |
| 5 | 고운돋움 | `GowunDodum-Regular.woff` | ❌ **미확보** | — |
| 6 | 카페24 동동 | `Cafe24Dongdong.woff` | ❌ **미확보** | — |
| 7 | 티머니 둥근바람 | `TmoneyRoundWindRegular.woff` | ❌ **미확보** | — |
| 8 | 레코 | `Recipekorea.woff` | ❌ **미확보** | — |

### 확보 경로 (이 PC에 이미 있던 것)

| 글꼴 | 출처 |
|---|---|
| LINE Seed KR | `C:\Projects\SingPromfterApp\assets\fonts\LINESeedKR-Rg.ttf` (SVIL 다른 프로젝트에서 이미 사용 중) |
| 나눔고딕 | `C:\WINDOWS\Fonts\NanumGothic.ttf` · `NanumGothicBold.ttf` |
| 교보손글씨2019 | `%LOCALAPPDATA%\Microsoft\Windows\Fonts\KyoboHandwriting2019.ttf` |

## 부수 이득 — 굵은 글씨가 진짜가 된다

웹판에는 **Bold 파일이 하나도 없었다.** `tokens.css:15-29`가 `LINESeedKR-Bd.woff2`를 선언해 뒀지만
그 파일은 디스크에 존재한 적이 없고, 웹 `@font-face`는 없는 파일을 조용히 무시한다.
결과적으로 `font-weight: 700`이 전부 **브라우저 합성 굵기**로 렌더되고 있었다.

나눔고딕은 진짜 Bold(`NanumGothicBold.ttf`)가 있어 Flutter판에서는 합성 없이 나온다.
LINE Seed Bold는 여전히 없으므로, 확보하면 같은 개선을 기본 글꼴에도 적용할 수 있다.

## 남은 작업

### 1) 미확보 4종 — 파일 확보

전부 무료 배포 한글 글꼴이라 각 배포처에서 TTF/OTF를 받을 수 있다.
**받는 것과 별개로 아래 2번(라이선스 확인)이 반드시 함께 이뤄져야 한다.**

확보하면 `app/assets/fonts/`에 넣고 `pubspec.yaml`의 `fonts:`에 추가한 뒤
`flutter test test/assets_test.dart`로 선언·파일 일치를 확인한다.

### 2) 확보한 4종 포함 전량 — 임베딩 허용 여부 확인

각 배포처의 라이선스 원문에서 다음을 확인하고 이 문서에 근거를 옮겨 적는다.

- 응용 프로그램 **임베딩(번들)** 허용 여부
- 재배포 시 고지 의무(라이선스 전문 동봉 등)
- 상업적 이용 조건

확인 결과가 "임베딩 불가"인 글꼴은 목록에서 **제외**하고 설정 화면 선택지에서도 뺀다.

### 3) 용량 재검토

TTF는 woff 압축이 풀린 상태라 2~3배가 된다. 현재 4파일 13.5MB
(LINE Seed 3.3 · 나눔 Regular 4.2 + Bold 4.1 · 교보 1.7).
8종을 전부 넣으면 설치본이 30MB를 넘길 수 있다. 데스크톱 단독이라 치명적이지는 않으나,
나중에 모바일을 고려하면 기본 2종만 번들하고 나머지는 선택 다운로드로 돌리는 설계가 필요하다.

## 폴백 규칙 (코드로 보장)

알 수 없는 `fontId`가 저장돼 있으면 **목록 첫 항목(LINE Seed)** 으로 되돌린다.
웹판 `AppContext.tsx:117`이 이미 하던 동작이고 Flutter판도 그대로 유지한다.
미확보 글꼴을 고른 상태의 설정이 남아 있어도 화면이 빈 글꼴로 깨지지 않는다.
