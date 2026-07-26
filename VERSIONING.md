# 버전 규칙

Semantic Versioning (MAJOR.MINOR.PATCH). 현재 **1.1.0**.

| 단계 | 규칙 | 예 |
|------|------|-----|
| 버그픽스/소기능 | 패치 +1 | v1.1.1 |
| 기능 추가·UI 개편 | 마이너 +1, 패치 0 | v1.2.0 |
| 호환 깨짐·데이터 구조 변경 | 메이저 +1, 나머지 0 | v2.0.0 |

## 단일 소스

앱 쪽 단일 소스는 `src/version.ts`의 `APP_VERSION`이다.
버전을 올릴 때 아래 세 곳을 항상 같은 값으로 맞춘다.

1. 루트 `VERSION`
2. `package.json` 의 `version`
3. `src/version.ts` 의 `APP_VERSION`

## 표시 위치

- 상단바 로고 옆에 `vX.Y.Z` 상시 표시 (12px 모노체)
- 설정 > 히스토리 / 업데이트 내역 — `VERSION_HISTORY`(버전·날짜·요약)를 최신순으로 노출

## 히스토리 작성

`src/version.ts` 의 `VERSION_HISTORY` 맨 앞에 항목을 추가한다.
날짜는 `YYYY-MM-DD`, 요약은 버전당 2~4줄.

```ts
{
  version: '1.2.0',
  date: '2026-08-01',
  lines: ['한 줄 요약', '한 줄 요약'],
}
```
