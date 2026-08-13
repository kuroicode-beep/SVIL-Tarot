// test/data/database_test.dart — 저장소 계약.
//
// 여기서 지키는 것은 셋이다.
//   1) 고객 삭제가 3개 테이블에 걸쳐 원자적이다 (부분 삭제 = 개인정보 잔존)
//   2) dueAt <= now 범위 조회가 IndexedDB의 upperBound와 같은 결과를 낸다
//   3) 레코드가 payload를 거쳐 왕복해도 필드를 흘리지 않는다

import 'package:flutter_test/flutter_test.dart';
import 'package:svil_tarot/data/database.dart';
import 'package:svil_tarot/data/models.dart';

/// 고객 id는 'c' + 번호. 기록·상담이 참조하는 값과 같아야 한다.
Customer _customer(String n, {String? updatedAt}) => Customer(
      id: 'c$n',
      name: '고객$n',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: updatedAt ?? '2026-08-09T00:00:00.000Z',
    );

HistoryEntry _history(String id, {String? customerId}) => HistoryEntry(
      id: id,
      kind: 'practice',
      title: '실전 $id',
      createdAt: '2026-08-09T0$id:00:00.000Z',
      customerId: customerId,
      // 지운 고객의 개인정보가 기록에 남는 경로가 바로 이 필드다.
      aiText: '상담 내용 $id',
      cards: [
        const DrawnCard(id: 'major_00', nameKo: '바보', nameEn: 'The Fool', isReversed: false),
      ],
    );

SrsCard _srs(String cardId, String dueAt) => SrsCard(
      cardId: cardId,
      ease: 2.5,
      interval: 1,
      reps: 0,
      lapses: 0,
      dueAt: dueAt,
      updatedAt: '2026-08-10T00:00:00.000Z',
    );

void main() {
  late AppDatabase db;

  setUp(() => db = AppDatabase.memory());
  tearDown(() => db.close());

  group('고객 삭제 — 원자성', () {
    test('상담 3 + 기록 5를 가진 고객을 지우면 고아가 0이다', () async {
      await db.putCustomer(_customer('1'));
      await db.putCustomer(_customer('2'));

      for (var i = 1; i <= 5; i++) {
        await db.putHistory(_history('$i', customerId: 'c1'));
      }
      for (var i = 1; i <= 3; i++) {
        await db.putConsultation(Consultation(
          id: 's$i',
          customerId: 'c1',
          serviceType: 'practice',
          title: '상담 $i',
          summary: '요약',
          createdAt: '2026-08-09T00:00:00.000Z',
        ));
      }
      // 다른 고객 것은 남아야 한다.
      await db.putHistory(_history('9', customerId: 'c2'));

      await db.deleteCustomerCascade('c1');

      final history = await db.allHistory();
      final consults = await db.allConsultations();
      final customers = await db.allCustomers();

      expect(history.where((h) => h.customerId == 'c1'), isEmpty,
          reason: '기록이 남으면 지운 고객의 aiText가 기록 화면에 계속 보인다');
      expect(consults.where((c) => c.customerId == 'c1'), isEmpty);
      expect(customers.where((c) => c.id == 'c1'), isEmpty);

      expect(history.where((h) => h.customerId == 'c2'), hasLength(1),
          reason: '다른 고객 데이터까지 지우면 안 된다');
      expect(customers, hasLength(1));
    });

    test('트랜잭션 중간에 예외가 나면 아무것도 지워지지 않는다', () async {
      await db.putCustomer(_customer('1'));
      for (var i = 1; i <= 5; i++) {
        await db.putHistory(_history('$i', customerId: 'c1'));
      }
      for (var i = 1; i <= 3; i++) {
        await db.putConsultation(Consultation(
          id: 's$i',
          customerId: 'c1',
          serviceType: 'practice',
          title: '상담 $i',
          summary: '요약',
          createdAt: '2026-08-09T00:00:00.000Z',
        ));
      }

      // 삭제 도중 실패를 흉내낸다. 부분 커밋이 되면 9행 중 일부만 남는다.
      await expectLater(
        db.transaction(() async {
          await (db.delete(db.historyRows)..where((t) => t.customerId.equals('c1'))).go();
          await (db.delete(db.consultationRows)..where((t) => t.customerId.equals('c1'))).go();
          throw Exception('중간 실패');
        }),
        throwsA(isA<Exception>()),
      );

      expect(await db.allHistory(), hasLength(5), reason: '롤백되지 않았다');
      expect(await db.allConsultations(), hasLength(3), reason: '롤백되지 않았다');
      expect(await db.allCustomers(), hasLength(1));
    });
  });

  group('SRS 범위 조회 — IDBKeyRange.upperBound 대체', () {
    test('dueAt <= now 인 것만, 밀린 순으로 나온다', () async {
      await db.putSrs(_srs('a', '2026-08-08T00:00:00.000Z')); // 지남
      await db.putSrs(_srs('b', '2026-08-09T00:00:00.000Z')); // 지남
      await db.putSrs(_srs('c', '2026-08-20T00:00:00.000Z')); // 아직

      final due = await db.dueSrs('2026-08-10T00:00:00.000Z');

      expect(due.map((s) => s.cardId), ['a', 'b'], reason: '가장 오래 밀린 순이어야 한다');
    });

    test('경계값이 포함된다 (upperBound는 이하다)', () async {
      const now = '2026-08-10T00:00:00.000Z';
      await db.putSrs(_srs('exact', now));

      final due = await db.dueSrs(now);
      expect(due.map((s) => s.cardId), ['exact']);
    });

    test('ISO 문자열 사전순이 시간순과 일치한다', () async {
      // 이 성질이 깨지면(로컬 시각 문자열이 섞이는 등) 조회가 통째로 무너진다.
      await db.putSrs(_srs('late', '2026-12-01T00:00:00.000Z'));
      await db.putSrs(_srs('early', '2026-02-01T00:00:00.000Z'));

      final due = await db.dueSrs('2027-01-01T00:00:00.000Z');
      expect(due.map((s) => s.cardId), ['early', 'late']);
    });
  });

  group('payload 왕복', () {
    test('중첩 필드가 보존된다', () async {
      const entry = HistoryEntry(
        id: 'h1',
        kind: 'practice',
        title: '실전',
        createdAt: '2026-08-09T00:00:00.000Z',
        cards: [
          DrawnCard(
            id: 'major_00',
            nameKo: '바보',
            nameEn: 'The Fool',
            isReversed: true,
            positionKey: 'past',
            positionLabel: '과거',
          ),
        ],
        meta: {'spreadId': 'three', 'n': 3},
      );
      await db.putHistory(entry);

      final back = (await db.allHistory()).single;
      expect(back.cards, hasLength(1));
      expect(back.cards!.first.positionLabel, '과거');
      expect(back.cards!.first.isReversed, isTrue);
      expect(back.meta!['spreadId'], 'three');
      expect(back.meta!['n'], 3);
    });

    test('cards 부재가 부재로 남는다', () async {
      await db.putHistory(const HistoryEntry(
        id: 'h2', kind: 'saju', title: '사주', createdAt: '2026-08-09T00:00:00.000Z',
      ));
      final back = (await db.allHistory()).single;
      expect(back.cards, isNull);
      expect(back.toJson().containsKey('cards'), isFalse);
    });

    test('정수 ease가 double로 읽힌다', () async {
      // JSON 왕복에서 2.0이 2로 줄어들어도 죽지 않아야 한다.
      await db.putSrs(const SrsCard(
        cardId: 'x', ease: 2.0, interval: 6, reps: 2, lapses: 0,
        dueAt: '2026-08-16T00:00:00.000Z', updatedAt: '2026-08-10T00:00:00.000Z',
      ));
      final back = (await db.allSrs()).single;
      expect(back.ease, 2.0);
    });
  });

  group('정렬 안정성', () {
    test('updatedAt이 같은 고객도 순서가 흔들리지 않는다', () async {
      // IndexedDB는 같은 키 안에서 삽입 역순이었지만 SQL 동률 순서는 미정의다.
      await db.putCustomer(_customer('1', updatedAt: '2026-08-09T00:00:00.000Z'));
      await db.putCustomer(_customer('2', updatedAt: '2026-08-09T00:00:00.000Z'));

      final first = (await db.allCustomers()).map((c) => c.id).toList();
      final second = (await db.allCustomers()).map((c) => c.id).toList();

      expect(first, second, reason: '같은 질의가 매번 다른 순서를 내면 목록이 새로고침마다 튄다');
      expect(first, ['c2', 'c1'], reason: 'id 내림차순으로 고정했다');
    });
  });
}
