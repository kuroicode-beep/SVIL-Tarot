// lib/data/database.dart — SQLite 스키마와 접근 계층.
//
// IndexedDB 7 스토어를 테이블 7개로 옮겼다. 의미는 1:1이다.
//   스토어 → 테이블 / 인덱스 → CREATE INDEX / IDBKeyRange.upperBound → WHERE due_at <= ?
//   멀티스토어 원자 트랜잭션 → transaction { } (네이티브)
//
// 왜 레코드를 payload(JSON)로 통째로 두는가
//   이 앱은 SQL 수준에서 cards나 meta 안을 질의하지 않는다 — 통계도 전부 로드한 뒤
//   Dart에서 집계한다. 그리고 **백업 파일이 레코드 모양의 정본**이라, 원본 JSON을
//   그대로 보관하면 내보내기가 jsonDecode 한 줄이고 구조가 바이트 단위로 보존된다.
//   정규화하면 백업 모양이 '재조립 결과'라는 파생물이 되어, 컬럼이 늘거나 널 허용이
//   바뀔 때마다 조용히 달라진다.
//
//   대신 조회에 실제로 쓰는 스칼라만 컬럼으로 승격한다. payload와 승격 컬럼이 어긋나지
//   않도록 둘을 만드는 곳을 함수 하나(_rowFor…)로 고정한다.
//
// schemaVersion을 5로 시작하는 이유
//   v1~v4의 Flutter DB는 존재한 적이 없어 마이그레이션 이력을 재연할 필요가 없다.
//   그렇다고 1로 두면 IndexedDB v5·BackupFile.version·앱 SemVer MAJOR의 연결이 끊긴다.
//   숫자를 하나로 맞춰 두면 다음 구조 변경이 drift 6 + 백업 6 + 앱 MAJOR로 함께 움직인다.

import 'dart:convert';
import 'dart:io';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import 'models.dart';

part 'database.g.dart';

@DataClassName('HistoryRow')
class HistoryRows extends Table {
  TextColumn get id => text()();
  TextColumn get kind => text()();
  TextColumn get createdAt => text()();
  TextColumn get customerId => text().nullable()();
  TextColumn get outcome => text().nullable()();

  /// 레코드 원본 JSON. 백업 모양의 정본이다.
  TextColumn get payload => text()();

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('CustomerRow')
class CustomerRows extends Table {
  TextColumn get id => text()();
  TextColumn get name => text()();
  TextColumn get updatedAt => text()();
  TextColumn get payload => text()();

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('ConsultationRow')
class ConsultationRows extends Table {
  TextColumn get id => text()();
  TextColumn get customerId => text()();
  TextColumn get serviceType => text()();
  TextColumn get createdAt => text()();
  TextColumn get dueAt => text().nullable()();
  TextColumn get status => text().nullable()();
  TextColumn get payload => text()();

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('CardNoteRow')
class CardNoteRows extends Table {
  TextColumn get cardId => text()();
  TextColumn get payload => text()();

  @override
  Set<Column> get primaryKey => {cardId};
}

@DataClassName('DailyDrawRow')
class DailyDrawRows extends Table {
  TextColumn get date => text()();
  TextColumn get payload => text()();

  @override
  Set<Column> get primaryKey => {date};
}

@DataClassName('CustomSpreadRow')
class CustomSpreadRows extends Table {
  TextColumn get id => text()();
  TextColumn get updatedAt => text()();
  TextColumn get payload => text()();

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('SrsRow')
class SrsRows extends Table {
  TextColumn get cardId => text()();

  /// ISO 문자열. 사전순 = 시간순 성질에 조회가 의존한다.
  /// **COLLATE NOCASE를 절대 걸지 말 것** — 지금은 숫자뿐이라 통과하지만 함정이다.
  TextColumn get dueAt => text()();

  TextColumn get payload => text()();

  @override
  Set<Column> get primaryKey => {cardId};
}

@DriftDatabase(tables: [
  HistoryRows,
  CustomerRows,
  ConsultationRows,
  CardNoteRows,
  DailyDrawRows,
  CustomSpreadRows,
  SrsRows,
])
class AppDatabase extends _$AppDatabase {
  AppDatabase(super.e);

  /// 테스트용 인메모리 DB.
  AppDatabase.memory() : super(NativeDatabase.memory());

  @override
  int get schemaVersion => 5;

  @override
  MigrationStrategy get migration => MigrationStrategy(
        onCreate: (m) async {
          await m.createAll();
          // 인덱스는 IndexedDB에 있던 것과 1:1이다.
          await customStatement(
              'CREATE INDEX IF NOT EXISTS idx_history_created ON history_rows (created_at)');
          await customStatement(
              'CREATE INDEX IF NOT EXISTS idx_history_customer ON history_rows (customer_id)');
          await customStatement(
              'CREATE INDEX IF NOT EXISTS idx_customers_name ON customer_rows (name)');
          await customStatement(
              'CREATE INDEX IF NOT EXISTS idx_customers_updated ON customer_rows (updated_at)');
          await customStatement(
              'CREATE INDEX IF NOT EXISTS idx_consult_customer ON consultation_rows (customer_id)');
          await customStatement(
              'CREATE INDEX IF NOT EXISTS idx_consult_created ON consultation_rows (created_at)');
          await customStatement(
              'CREATE INDEX IF NOT EXISTS idx_consult_service ON consultation_rows (service_type)');
          await customStatement(
              'CREATE INDEX IF NOT EXISTS idx_srs_due ON srs_rows (due_at)');
          await customStatement(
              'CREATE INDEX IF NOT EXISTS idx_spreads_updated ON custom_spread_rows (updated_at)');
        },
        beforeOpen: (details) async {
          // 외래키를 켜지 않는다. 고객 삭제의 원자성은 트랜잭션으로 보장하고,
          // 옛 기록에 이미 사라진 고객 id가 남아 있을 수 있어 제약을 걸면 임포트가 막힌다.
          await customStatement('PRAGMA journal_mode = WAL');
        },
      );

  // ---------- 쓰기 ----------

  Future<void> putHistory(HistoryEntry e) => into(historyRows).insertOnConflictUpdate(
        HistoryRow(
          id: e.id,
          kind: e.kind,
          createdAt: e.createdAt,
          customerId: e.customerId,
          outcome: e.outcome,
          payload: jsonEncode(e.toJson()),
        ),
      );

  Future<void> putCustomer(Customer c) => into(customerRows).insertOnConflictUpdate(
        CustomerRow(
          id: c.id,
          name: c.name,
          updatedAt: c.updatedAt,
          payload: jsonEncode(c.toJson()),
        ),
      );

  Future<void> putConsultation(Consultation c) =>
      into(consultationRows).insertOnConflictUpdate(
        ConsultationRow(
          id: c.id,
          customerId: c.customerId,
          serviceType: c.serviceType,
          createdAt: c.createdAt,
          dueAt: c.dueAt,
          status: c.status,
          payload: jsonEncode(c.toJson()),
        ),
      );

  Future<void> putCardNote(CardNote n) => into(cardNoteRows).insertOnConflictUpdate(
        CardNoteRow(cardId: n.cardId, payload: jsonEncode(n.toJson())),
      );

  Future<void> putDailyDraw(DailyDraw d) => into(dailyDrawRows).insertOnConflictUpdate(
        DailyDrawRow(date: d.date, payload: jsonEncode(d.toJson())),
      );

  Future<void> putCustomSpread(CustomSpread s) =>
      into(customSpreadRows).insertOnConflictUpdate(
        CustomSpreadRow(id: s.id, updatedAt: s.updatedAt, payload: jsonEncode(s.toJson())),
      );

  Future<void> putSrs(SrsCard s) => into(srsRows).insertOnConflictUpdate(
        SrsRow(cardId: s.cardId, dueAt: s.dueAt, payload: jsonEncode(s.toJson())),
      );

  // ---------- 읽기 ----------

  static Map<String, Object?> _decode(String payload) =>
      (jsonDecode(payload) as Map).cast<String, Object?>();

  Future<List<HistoryEntry>> allHistory() async {
    // 최신순. IndexedDB에서 by-date를 긁고 reverse하던 것과 같다.
    // 동률 순서가 미정의가 되지 않게 id까지 붙인다.
    final rows = await (select(historyRows)
          ..orderBy([
            (t) => OrderingTerm(expression: t.createdAt, mode: OrderingMode.desc),
            (t) => OrderingTerm(expression: t.id, mode: OrderingMode.desc),
          ]))
        .get();
    return rows.map((r) => HistoryEntry.fromJson(_decode(r.payload))).toList();
  }

  Future<List<Customer>> allCustomers() async {
    // IndexedDB는 같은 updatedAt 안에서 삽입 역순이 됐지만 SQL 동률 순서는 미정의다.
    // id를 2차 정렬로 고정해 목록이 새로고침마다 흔들리지 않게 한다.
    final rows = await (select(customerRows)
          ..orderBy([
            (t) => OrderingTerm(expression: t.updatedAt, mode: OrderingMode.desc),
            (t) => OrderingTerm(expression: t.id, mode: OrderingMode.desc),
          ]))
        .get();
    return rows.map((r) => Customer.fromJson(_decode(r.payload))).toList();
  }

  Future<List<Consultation>> allConsultations() async {
    final rows = await select(consultationRows).get();
    return rows.map((r) => Consultation.fromJson(_decode(r.payload))).toList();
  }

  Future<List<CardNote>> allCardNotes() async {
    final rows = await select(cardNoteRows).get();
    return rows.map((r) => CardNote.fromJson(_decode(r.payload))).toList();
  }

  Future<List<DailyDraw>> allDailyDraws() async {
    final rows = await select(dailyDrawRows).get();
    return rows.map((r) => DailyDraw.fromJson(_decode(r.payload))).toList();
  }

  Future<List<CustomSpread>> allCustomSpreads() async {
    final rows = await (select(customSpreadRows)
          ..orderBy([
            (t) => OrderingTerm(expression: t.updatedAt, mode: OrderingMode.desc),
            (t) => OrderingTerm(expression: t.id, mode: OrderingMode.desc),
          ]))
        .get();
    return rows.map((r) => CustomSpread.fromJson(_decode(r.payload))).toList();
  }

  Future<List<SrsCard>> allSrs() async {
    final rows = await select(srsRows).get();
    return rows.map((r) => SrsCard.fromJson(_decode(r.payload))).toList();
  }

  /// 오늘 복습할 카드. IndexedDB의 `IDBKeyRange.upperBound(nowIso)`와 같다.
  ///
  /// ISO 문자열의 사전순 비교가 성립하려면 저장된 dueAt이 항상 UTC(`Z`) 표기여야 한다.
  /// 로컬 시각 문자열이 섞이면 길이·오프셋이 달라져 비교가 통째로 무너진다.
  Future<List<SrsCard>> dueSrs(String nowIso) async {
    final rows = await (select(srsRows)
          ..where((t) => t.dueAt.isSmallerOrEqualValue(nowIso))
          ..orderBy([
            (t) => OrderingTerm(expression: t.dueAt),
            (t) => OrderingTerm(expression: t.cardId),
          ]))
        .get();
    return rows.map((r) => SrsCard.fromJson(_decode(r.payload))).toList();
  }

  // ---------- 삭제 ----------

  /// 고객과 그에 딸린 상담·기록을 **한 트랜잭션으로** 지운다.
  ///
  /// 나눠 지우면 안 되는 이유가 웹판 주석에 있다: history에 aiText와 customerId가
  /// 그대로 들어 있어, 부분 삭제로 끝나면 지운 고객의 개인정보가 기록 화면에 계속 남는다.
  /// 이 한 줄 때문에 박스 간 트랜잭션이 없는 저장소(Hive 등)를 쓸 수 없었다.
  Future<void> deleteCustomerCascade(String customerId) {
    return transaction(() async {
      await (delete(historyRows)..where((t) => t.customerId.equals(customerId))).go();
      await (delete(consultationRows)..where((t) => t.customerId.equals(customerId))).go();
      await (delete(customerRows)..where((t) => t.id.equals(customerId))).go();
    });
  }

  /// 모든 테이블을 비운다. 임포트 전 '덮어쓰기'를 고른 경우에만 쓴다.
  Future<void> clearAll() => transaction(() async {
        await delete(historyRows).go();
        await delete(consultationRows).go();
        await delete(customerRows).go();
        await delete(cardNoteRows).go();
        await delete(dailyDrawRows).go();
        await delete(customSpreadRows).go();
        await delete(srsRows).go();
      });
}

/// 실제 파일 DB를 연다. 앱 지원 폴더에 둔다.
QueryExecutor openAppDatabase() {
  return LazyDatabase(() async {
    final dir = await getApplicationSupportDirectory();
    final file = File(p.join(dir.path, 'svil-tarot.sqlite'));
    // 백그라운드 아이솔레이트에서 돌려 큰 내보내기 중에도 UI가 멈추지 않게 한다.
    return NativeDatabase.createInBackground(file);
  });
}
