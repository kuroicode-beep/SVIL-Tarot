// lib/version.dart — 앱 버전 단일 소스.
//
// SVIL 앱 버전 규칙: APP_VERSION 상수 + VERSION_HISTORY(버전·날짜·요약) 리스트로 관리하고,
// 버전은 로고 옆에 상시 표시한다. 기능 추가 시마다 여기만 갱신한다.
// pubspec.yaml의 version과 항상 같은 값을 유지할 것.

const String appVersion = '2.0.0';

class VersionEntry {
  const VersionEntry({required this.version, required this.date, required this.lines});

  final String version;

  /// YYYY-MM-DD
  final String date;
  final List<String> lines;
}

/// 최신순. 설정 > 히스토리/업데이트 내역에 그대로 노출된다.
const List<VersionEntry> versionHistory = [
  VersionEntry(
    version: '2.0.0',
    date: '2026-08-10',
    lines: [
      'Flutter 데스크톱 앱으로 전면 전환 — 브라우저 없이 실행됩니다',
      '저장소가 SQLite로 바뀌었습니다. 웹판 데이터는 백업 파일로 가져옵니다',
      'Windows 고대비 모드를 켜면 앱이 자동으로 따라갑니다',
      '굵은 글씨가 합성이 아닌 진짜 굵은 글꼴로 나옵니다',
    ],
  ),
];
