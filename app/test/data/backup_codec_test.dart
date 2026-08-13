// test/data/backup_codec_test.dart — 백업 포맷 호환 게이트.
//
// 웹판 데이터가 Flutter로 넘어오는 통로는 이 파일 하나다. 필드 이름을 하나라도 바꾸면
// 사용자 데이터가 조용히 안 넘어온다. 그래서 골든 파일과의 왕복을 테스트로 못 박는다.
//
// 골든은 웹판 exportBackup()이 실제로 뽑는 모양 그대로다 —
// 스토어 7종, 부재 필드는 키 자체가 없음, srs.ease가 정수로 저장된 경우 포함.

import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:svil_tarot/data/backup_codec.dart';
import 'package:svil_tarot/data/models.dart';

/// 웹판이 뽑는 백업 파일의 축소판. 각 스토어에 최소 1건씩 + 까다로운 경우를 섞었다.
const String goldenBackup = '''
{
  "format": "svil-tarot-backup",
  "version": 5,
  "exportedAt": "2026-08-10T03:21:00.000Z",
  "counts": {
    "history": 2,
    "customers": 1,
    "consultations": 1,
    "cardNotes": 1,
    "dailyDraws": 1,
    "customSpreads": 1,
    "srs": 2
  },
  "data": {
    "history": [
      {
        "id": "h1",
        "kind": "practice",
        "title": "실전 · 3카드 스프레드",
        "createdAt": "2026-08-09T01:00:00.000Z",
        "cards": [
          {"id": "major_00", "nameKo": "바보", "nameEn": "The Fool", "isReversed": false, "positionKey": "past", "positionLabel": "과거"}
        ],
        "userNote": "메모",
        "customerId": "c1",
        "outcome": "hit",
        "meta": {"spreadId": "three"}
      },
      {
        "id": "h2",
        "kind": "saju",
        "title": "사주풀이",
        "createdAt": "2026-08-09T02:00:00.000Z"
      }
    ],
    "customers": [
      {
        "id": "c1",
        "name": "홍길동",
        "phone": "010-0000-0000",
        "calendarType": "lunar",
        "createdAt": "2026-08-01T00:00:00.000Z",
        "updatedAt": "2026-08-09T00:00:00.000Z"
      }
    ],
    "consultations": [
      {
        "id": "s1",
        "customerId": "c1",
        "serviceType": "practice",
        "title": "실전 타로 · 3카드",
        "summary": "요약",
        "createdAt": "2026-08-09T01:00:00.000Z",
        "status": "done",
        "historyId": "h1"
      }
    ],
    "cardNotes": [
      {"cardId": "major_00", "keywords": "시작", "meaning": "내 해석", "updatedAt": "2026-08-05T00:00:00.000Z"}
    ],
    "dailyDraws": [
      {
        "date": "2026-08-09",
        "card": {"id": "major_17", "nameKo": "별", "nameEn": "The Star", "isReversed": true},
        "createdAt": "2026-08-09T00:00:00.000Z"
      }
    ],
    "customSpreads": [
      {
        "id": "custom_abc",
        "nameKo": "나의 4카드 점검",
        "cardCount": 4,
        "positions": [
          {"key": "p1", "labelKo": "지금 상황"},
          {"key": "p2", "labelKo": "걸림돌"}
        ],
        "createdAt": "2026-08-08T00:00:00.000Z",
        "updatedAt": "2026-08-08T00:00:00.000Z"
      }
    ],
    "srs": [
      {"cardId": "major_00", "ease": 2.18, "interval": 1, "reps": 0, "lapses": 1, "dueAt": "2026-08-11T00:00:00.000Z", "updatedAt": "2026-08-10T00:00:00.000Z"},
      {"cardId": "major_01", "ease": 2, "interval": 6, "reps": 2, "lapses": 0, "dueAt": "2026-08-16T00:00:00.000Z", "updatedAt": "2026-08-10T00:00:00.000Z"}
    ]
  }
}
''';

void main() {
  group('decode', () {
    test('골든 백업을 읽어 스토어별 건수가 counts와 일치한다', () {
      final p = decodeBackup(goldenBackup);
      expect(p.version, 5);
      expect(p.skipped, 0);
      expect(p.counts['history'], 2);
      expect(p.counts['customers'], 1);
      expect(p.counts['consultations'], 1);
      expect(p.counts['cardNotes'], 1);
      expect(p.counts['dailyDraws'], 1);
      expect(p.counts['customSpreads'], 1);
      expect(p.counts['srs'], 2);
      expect(p.total, 9);
    });

    test('정수로 저장된 ease를 읽어도 죽지 않는다', () {
      // jsonDecode는 2를 int로, 2.5를 double로 준다.
      // `as double` 캐스팅이면 여기서 크래시한다 — JS→Dart 포팅의 대표적 함정이다.
      final p = decodeBackup(goldenBackup);
      final cards = p.rows['srs']!.map(SrsCard.fromJson).toList();
      expect(cards[0].ease, 2.18);
      expect(cards[1].ease, 2.0);
    });

    test('백업 파일이 아니면 거부한다', () {
      expect(() => decodeBackup('{"format":"남의 파일","data":{}}'),
          throwsA(isA<BackupException>()));
      expect(() => decodeBackup('깨진 JSON'), throwsA(isA<BackupException>()));
    });

    test('앱보다 새로운 버전은 부분 임포트하지 않고 거부한다', () {
      // 웹판은 version을 아예 보지 않았다 — v6 파일의 새 필드가 조용히 버려지고
      // v5로 재출력되는 잠재적 데이터 손실 경로였다.
      final v6 = goldenBackup.replaceFirst('"version": 5', '"version": 6');
      expect(
        () => decodeBackup(v6),
        throwsA(isA<BackupException>()
            .having((e) => e.error, 'error', BackupError.tooNew)
            .having((e) => e.fileVersion, 'fileVersion', 6)),
      );
    });

    test('구버전 백업에 없는 스토어는 조용히 건너뛴다', () {
      const old = '{"format":"svil-tarot-backup","version":1,"data":{"history":[]}}';
      final p = decodeBackup(old);
      expect(p.counts['srs'], 0);
      expect(p.skipped, 0);
    });
  });

  group('손상 레코드 — 걸러내되 나머지는 살린다', () {
    Map<String, Object?> withBadSrs(Object? badRow) {
      final root = jsonDecode(goldenBackup) as Map<String, Object?>;
      final data = (root['data']! as Map).cast<String, Object?>();
      data['srs'] = [badRow, ...(data['srs']! as List)];
      return root;
    }

    test('키가 없으면 건너뛴다', () {
      final p = decodeBackup(jsonEncode(withBadSrs({
        'ease': 2.5, 'interval': 1, 'reps': 0, 'lapses': 0,
        'dueAt': 'x', 'updatedAt': 'y',
      })));
      expect(p.counts['srs'], 2, reason: '멀쩡한 2건은 살아야 한다');
      expect(p.skipped, 1);
    });

    test('숫자 자리에 문자열이 오면 건너뛴다', () {
      final p = decodeBackup(jsonEncode(withBadSrs({
        'cardId': 'bad', 'ease': '2.5', 'interval': 1, 'reps': 0, 'lapses': 0,
        'dueAt': 'x', 'updatedAt': 'y',
      })));
      expect(p.counts['srs'], 2);
      expect(p.skipped, 1);
    });

    test('필수 문자열이 없으면 건너뛴다', () {
      final p = decodeBackup(jsonEncode(withBadSrs({
        'cardId': 'bad', 'ease': 2.5, 'interval': 1, 'reps': 0, 'lapses': 0,
        'updatedAt': 'y',
      })));
      expect(p.counts['srs'], 2);
      expect(p.skipped, 1);
    });

    test('객체가 아니면 건너뛴다', () {
      final p = decodeBackup(jsonEncode(withBadSrs('문자열')));
      expect(p.counts['srs'], 2);
      expect(p.skipped, 1);
    });
  });

  group('왕복 — 이관의 핵심 계약', () {
    test('decode → 모델 → encode가 원본과 같다', () {
      final p = decodeBackup(goldenBackup);

      // 실제 임포트 경로와 같이 모델을 거친다. 모델이 필드를 흘리면 여기서 드러난다.
      final rows = rowsFromModels(
        history: p.rows['history']!.map(HistoryEntry.fromJson).toList(),
        customers: p.rows['customers']!.map(Customer.fromJson).toList(),
        consultations: p.rows['consultations']!.map(Consultation.fromJson).toList(),
        cardNotes: p.rows['cardNotes']!.map(CardNote.fromJson).toList(),
        dailyDraws: p.rows['dailyDraws']!.map(DailyDraw.fromJson).toList(),
        customSpreads: p.rows['customSpreads']!.map(CustomSpread.fromJson).toList(),
        srs: p.rows['srs']!.map(SrsCard.fromJson).toList(),
      );

      final out = encodeBackup(rows: rows, exportedAt: p.exportedAt!);
      final reparsed = jsonDecode(out) as Map<String, Object?>;
      final original = jsonDecode(goldenBackup) as Map<String, Object?>;

      expect(reparsed['format'], original['format']);
      expect(reparsed['version'], original['version']);
      expect(reparsed['exportedAt'], original['exportedAt']);
      expect(reparsed['counts'], original['counts']);
      expect(reparsed['data'], original['data'],
          reason: '한 필드라도 흘리면 여기서 잡힌다 — 이관이 조용히 실패하는 경로다');
    });

    test('cards 부재와 빈 배열이 구분된다', () {
      // 부재는 키 자체가 없어야 하고, 빈 배열은 "cards": []여야 한다.
      // 이 구분이 무너지면 왕복 비교가 깨지고, 무엇보다 원본과 다른 파일이 나간다.
      final absent = HistoryEntry.fromJson({
        'id': 'a', 'kind': 'saju', 'title': 't', 'createdAt': 'c',
      });
      expect(absent.cards, isNull);
      expect(absent.toJson().containsKey('cards'), isFalse);

      final empty = HistoryEntry.fromJson({
        'id': 'b', 'kind': 'practice', 'title': 't', 'createdAt': 'c', 'cards': <Object?>[],
      });
      expect(empty.cards, isEmpty);
      expect(empty.toJson()['cards'], isEmpty);
    });
  });

  group('파일명', () {
    test('SVIL 규칙을 따른다 — 공백 없음, 정렬 가능', () {
      final name = backupFilename(DateTime(2026, 8, 10, 9, 5));
      expect(name, 'svil-tarot-backup_20260810_0905.json');
      expect(name.contains(' '), isFalse);
    });
  });
}
