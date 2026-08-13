// lib/data/backup_codec.dart — 백업 파일의 읽기·쓰기. **drift를 import하지 않는다.**
//
// 이 파일이 웹판 데이터의 유일한 이관 통로다. DB 계층이 여기를 건드리지 못하게 분리해 두면,
// 나중에 테이블·컬럼을 바꿔도 백업 포맷이 조용히 따라 변하지 않는다.
//
// 웹판 src/services/backup.ts의 STORE_SPECS·isValidRecord·2단 복원 의미론을 1:1로 옮겼다.

import 'dart:convert';

import 'models.dart';

/// 파일 서명. 확장자만으로는 남의 JSON과 구분되지 않아 복원 전 이 값으로 거른다.
const String backupFormat = 'svil-tarot-backup';

/// 이 앱이 읽을 수 있는 백업 버전. IndexedDB DB_VERSION·drift schemaVersion과 같은 숫자다.
const int backupVersion = 5;

/// 복원 순서와 검증 규칙. 웹판 STORE_SPECS와 같은 순서를 유지한다.
class StoreSpec {
  const StoreSpec({
    required this.name,
    required this.keyPath,
    required this.requiredStrings,
    this.requiredObjects = const [],
    this.requiredNumbers = const [],
  });

  final String name;

  /// 키 필드. 비어 있으면 저장 자체가 안 되므로 비어 있지 않은 문자열을 요구한다.
  final String keyPath;

  /// 없으면 화면이 깨지는 필드. 빈 문자열은 허용하고 타입만 본다.
  final List<String> requiredStrings;
  final List<String> requiredObjects;

  /// 숫자여야 하는 필드. srs의 ease/interval에 문자열이 섞이면 스케줄러가 NaN을 뱉는다.
  final List<String> requiredNumbers;
}

const List<StoreSpec> storeSpecs = [
  StoreSpec(name: 'history', keyPath: 'id', requiredStrings: ['kind', 'title', 'createdAt']),
  StoreSpec(name: 'customers', keyPath: 'id', requiredStrings: ['name', 'createdAt', 'updatedAt']),
  StoreSpec(
    name: 'consultations',
    keyPath: 'id',
    requiredStrings: ['customerId', 'serviceType', 'title', 'createdAt'],
  ),
  StoreSpec(name: 'cardNotes', keyPath: 'cardId', requiredStrings: ['updatedAt']),
  StoreSpec(
    name: 'dailyDraws',
    keyPath: 'date',
    requiredStrings: ['createdAt'],
    requiredObjects: ['card'],
  ),
  StoreSpec(
    name: 'customSpreads',
    keyPath: 'id',
    requiredStrings: ['nameKo', 'createdAt', 'updatedAt'],
  ),
  // 학습 진도는 몇 달치 누적이라 백업에서 빠지면 사용자가 처음부터 다시 외워야 한다.
  StoreSpec(
    name: 'srs',
    keyPath: 'cardId',
    requiredStrings: ['dueAt', 'updatedAt'],
    requiredNumbers: ['ease', 'interval', 'reps', 'lapses'],
  ),
];

/// 백업을 못 읽는 이유. 사용자 문구가 아니라 i18n 키 신호값이다.
enum BackupError {
  /// JSON이 아니거나 서명이 다르다.
  badFile,

  /// 이 앱보다 새로운 버전의 파일. **부분 임포트하지 않고 명시적으로 거부한다.**
  ///
  /// 웹판은 version을 아예 보지 않았다 — v6 파일의 새 필드가 조용히 버려지고
  /// v5로 재출력되는 잠재적 데이터 손실 경로였다. 여기서 막는다.
  tooNew,
}

class BackupException implements Exception {
  const BackupException(this.error, {this.fileVersion});
  final BackupError error;
  final int? fileVersion;

  @override
  String toString() => 'BackupException($error, fileVersion: $fileVersion)';
}

/// 검증을 통과한 백업. 스토어별 원본 JSON 맵을 그대로 들고 있는다.
class BackupPayload {
  const BackupPayload({
    required this.version,
    required this.exportedAt,
    required this.rows,
    required this.skipped,
  });

  final int version;
  final String? exportedAt;

  /// 스토어명 → 검증 통과한 레코드들.
  final Map<String, List<Map<String, Object?>>> rows;

  /// 검증에서 걸러진 레코드 수. **화면에 반드시 노출한다** —
  /// 웹판은 이 값을 반환만 하고 UI에 안 띄워서 사용자가 알 수 없었다.
  final int skipped;

  /// 스토어별 건수. 커밋 전 미리보기가 이걸 보여 준다.
  Map<String, int> get counts =>
      {for (final e in rows.entries) e.key: e.value.length};

  int get total => rows.values.fold(0, (a, b) => a + b.length);
}

/// 레코드 하나가 스토어 전체를 abort시키는 걸 막으려면 넣기 전에 걸러야 한다.
bool isValidRecord(StoreSpec spec, Object? value) {
  if (value is! Map) return false;
  final obj = value.cast<String, Object?>();

  final key = obj[spec.keyPath];
  if (key is! String || key.isEmpty) return false;

  for (final field in spec.requiredStrings) {
    if (obj[field] is! String) return false;
  }
  for (final field in spec.requiredObjects) {
    if (obj[field] is! Map) return false;
  }
  for (final field in spec.requiredNumbers) {
    final v = obj[field];
    // JS의 Number.isFinite에 해당한다. Infinity·NaN은 num이라 타입만 봐서는 통과한다.
    if (v is! num || !v.isFinite) return false;
  }
  return true;
}

/// 백업 JSON 문자열을 읽어 검증한다. DB에는 손대지 않는다.
///
/// 실패하면 [BackupException]을 던지고 **DB는 무변경**이다.
BackupPayload decodeBackup(String jsonText) {
  Object? parsed;
  try {
    parsed = jsonDecode(jsonText);
  } catch (_) {
    throw const BackupException(BackupError.badFile);
  }

  if (parsed is! Map) throw const BackupException(BackupError.badFile);
  final root = parsed.cast<String, Object?>();
  if (root['format'] != backupFormat) throw const BackupException(BackupError.badFile);

  final data = root['data'];
  if (data is! Map) throw const BackupException(BackupError.badFile);
  final dataMap = data.cast<String, Object?>();

  // 버전이 없으면 구버전 파일로 본다(웹판 초기 백업에는 없을 수 있다).
  final version = (root['version'] as num?)?.toInt() ?? 1;
  if (version > backupVersion) {
    throw BackupException(BackupError.tooNew, fileVersion: version);
  }

  final rows = <String, List<Map<String, Object?>>>{};
  var skipped = 0;

  for (final spec in storeSpecs) {
    // 구버전 백업에는 없는 스토어다. 없는 건 조용히 건너뛰고 있는 것만 복원한다.
    final raw = dataMap[spec.name];
    if (raw is! List) {
      rows[spec.name] = const [];
      continue;
    }
    final valid = <Map<String, Object?>>[];
    for (final row in raw) {
      if (isValidRecord(spec, row)) {
        valid.add((row as Map).cast<String, Object?>());
      } else {
        skipped++;
      }
    }
    rows[spec.name] = valid;
  }

  return BackupPayload(
    version: version,
    exportedAt: root['exportedAt'] as String?,
    rows: rows,
    skipped: skipped,
  );
}

/// 스토어별 레코드를 백업 파일 JSON으로 만든다.
///
/// [exportedAt]을 인자로 받는 이유: 테스트가 골든 파일과 정확히 비교할 수 있어야 한다.
/// 함수 안에서 현재 시각을 읽으면 왕복 비교가 매번 달라진다.
String encodeBackup({
  required Map<String, List<Map<String, Object?>>> rows,
  required String exportedAt,
}) {
  final counts = <String, int>{};
  final data = <String, Object?>{};
  for (final spec in storeSpecs) {
    final list = rows[spec.name] ?? const <Map<String, Object?>>[];
    counts[spec.name] = list.length;
    data[spec.name] = list;
  }

  final file = <String, Object?>{
    'format': backupFormat,
    'version': backupVersion,
    'exportedAt': exportedAt,
    'counts': counts,
    'data': data,
  };

  // 사람이 열어 볼 수도 있는 파일이라 들여쓰기를 남긴다(웹판과 같다).
  return const JsonEncoder.withIndent('  ').convert(file);
}

/// 파일명. SVIL 규칙(공백 금지·언더스코어)을 따르고 정렬되도록 YYYYMMDD_HHmm을 쓴다.
String backupFilename(DateTime now) {
  String two(int n) => n.toString().padLeft(2, '0');
  final date = '${now.year}${two(now.month)}${two(now.day)}';
  return '${backupFormat}_${date}_${two(now.hour)}${two(now.minute)}.json';
}

/// 모델 목록을 백업용 JSON 맵 목록으로. 각 모델의 toJson이 웹판 레코드 모양을 지킨다.
Map<String, List<Map<String, Object?>>> rowsFromModels({
  required List<HistoryEntry> history,
  required List<Customer> customers,
  required List<Consultation> consultations,
  required List<CardNote> cardNotes,
  required List<DailyDraw> dailyDraws,
  required List<CustomSpread> customSpreads,
  required List<SrsCard> srs,
}) =>
    {
      'history': history.map((e) => e.toJson()).toList(),
      'customers': customers.map((e) => e.toJson()).toList(),
      'consultations': consultations.map((e) => e.toJson()).toList(),
      'cardNotes': cardNotes.map((e) => e.toJson()).toList(),
      'dailyDraws': dailyDraws.map((e) => e.toJson()).toList(),
      'customSpreads': customSpreads.map((e) => e.toJson()).toList(),
      'srs': srs.map((e) => e.toJson()).toList(),
    };
