// src/version.ts — 앱 버전 단일 소스.
// SVIL 앱 버전 규칙: APP_VERSION 상수 + VERSION_HISTORY(버전, 날짜, 요약) 리스트로 관리하고,
// 버전은 로고 옆에 상시 표시한다. 기능 추가 시마다 여기만 갱신한다.
// 루트 VERSION 파일 / package.json의 version과 항상 같은 값을 유지할 것.

export const APP_VERSION = '1.3.0'

export type VersionEntry = {
  version: string
  /** YYYY-MM-DD */
  date: string
  lines: string[]
}

/** 최신순 정렬. 설정 > 히스토리/업데이트 내역에 그대로 노출된다. */
export const VERSION_HISTORY: VersionEntry[] = [
  {
    version: '1.3.0',
    date: '2026-07-27',
    lines: [
      'CRM 완성 — AI·소울 포함 전 서비스 고객 연동·상담 자동 기록',
      '전체 상담 목록·고객 바로가기(?customer=)·기록에 고객명 표시',
      '설정 초기화 시 상담 이력도 삭제, 랜딩 기능 문구 갱신',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-07-27',
    lines: [
      '고객 관리 CRM — 프로필·상담 이력(서비스·내용) 자동 기록',
      '사주풀이·궁합·성명학·작명 추가 (유사 앱 주요 기능 반영 + 로컬 AI)',
      '홈 메뉴·기록 kind·IndexedDB v2 확장',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-07-26',
    lines: [
      'SVIL 표준 글꼴 8종 로컬 번들 — 라인시드 기본, 깨진 옵션 제거',
      'TTS 미리듣기 추가(설정에서 보이스·속도 바로 확인)',
      '저장 알림이 화면 이동 후에도 남던 문제 수정',
      '서브패스 배포 경로·본문 건너뛰기(skip-link) 전 화면 적용',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-07-25',
    lines: [
      '안정판: Stitch형 배우기/AI 레이아웃, 메이저 전체 퀴즈',
      '런북·GitHub Pages 랜딩·접근성 skip-link',
      '로드맵 Phase2–3 완료',
    ],
  },
  {
    version: '0.3.0',
    date: '2026-07-25',
    lines: ['콘텐츠·퀴즈 확장, CORS/preview 런북', 'AI 2열·배우기 사이드바 Stitch 정렬'],
  },
  {
    version: '0.2.0',
    date: '2026-07-24',
    lines: [
      '글꼴·언어(5종) 설정, 상단 저장 버튼, 기록 초기화',
      '홈 Star 실루엣 배경, 바탕화면 바로가기 스크립트',
      '로드맵 v0.2 작업지시 확정',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-07-24',
    lines: [
      '타로 배우기·스프레드·실전·AI 타로·소울카드 첫 공개',
      'Ollama gemma4:12b · TTS · 저장/히스토리',
      '저시력 고대비 덱 · 전체화면 · SVIL 디자인',
    ],
  },
]
