// test/core/js_compat_test.dart — JS와 Dart의 차이를 감시한다.
//
// Phase 2 착수 전에 먼저 돌리는 탐침이다. 여기 적힌 값은 Node 24와 Dart 3.12에서
// 실제로 측정한 것이고, 이 차이를 모르고 로직을 옮기면 예외 없이 답만 틀린다.

import 'package:flutter_test/flutter_test.dart';
import 'package:svil_tarot/core/js_compat.dart';

void main() {
  group('나머지 연산 — 부호가 다르다', () {
    test('Dart의 %는 항상 0 이상이다 (JS는 아니다)', () {
      // JS: -1 % 5 === -1  (Node 24에서 실측)
      // Dart: (-1) % 5 == 4
      expect(-1 % 5, 4, reason: 'Dart 동작이 바뀌었다면 포팅 전제를 다시 봐야 한다');
      expect(jsRemainder(-1, 5), -1, reason: 'JS 의미론을 재현하지 못한다');
    });

    test('양수에서는 둘이 같다', () {
      for (var a = 0; a < 20; a++) {
        expect(jsRemainder(a, 7), a % 7);
      }
    });

    test('순환 인덱스는 항상 0 이상이다', () {
      // 간지 60갑자처럼 '순환'이 의도인 곳은 부호 보정이 필요하다.
      expect(cyclicIndex(-1, 60), 59);
      expect(cyclicIndex(-61, 60), 59);
      expect(cyclicIndex(0, 60), 0);
      expect(cyclicIndex(61, 60), 1);
    });
  });

  group('반올림 — 음수 반값에서 갈린다', () {
    test('Dart round()는 0에서 멀어진다', () {
      // JS: Math.round(-0.5) === -0
      // Dart: (-0.5).round() == -1
      expect((-0.5).round(), -1);
      expect(jsRound(-0.5), 0, reason: 'JS는 양의 무한대 방향으로 올린다');
    });

    test('양수 반값은 둘이 같다', () {
      expect(jsRound(0.5), 1);
      expect(jsRound(1.5), 2);
      expect(jsRound(2.5), 3);
    });

    test('반값이 아닌 값은 평범하게 반올림된다', () {
      expect(jsRound(1.4), 1);
      expect(jsRound(1.6), 2);
      expect(jsRound(-1.4), -1);
      expect(jsRound(-1.6), -2);
    });
  });

  group('ISO 문자열 — Z가 없으면 시각 비교가 무너진다', () {
    test('로컬 DateTime의 toIso8601String()에는 Z가 없다', () {
      final local = DateTime(2026, 8, 10, 12, 0);
      expect(local.toIso8601String().endsWith('Z'), isFalse,
          reason: '이 사실이 SRS 조회를 조용히 깨뜨린다');
    });

    test('isoOf()는 항상 Z로 끝난다', () {
      expect(isoOf(DateTime(2026, 8, 10, 12, 0)).endsWith('Z'), isTrue);
      expect(isoOf(DateTime.utc(2026, 8, 10, 12, 0)).endsWith('Z'), isTrue);
    });

    test('사전순 비교가 시간순과 일치한다', () {
      // SRS의 `dueAt <= now`가 의존하는 성질이다. 1000쌍으로 확인한다.
      var seed = 12345;
      int next() {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed;
      }

      final base = DateTime.utc(2000);
      for (var i = 0; i < 1000; i++) {
        final a = base.add(Duration(minutes: next() % 5000000));
        final b = base.add(Duration(minutes: next() % 5000000));
        final byTime = a.isBefore(b);
        final byString = isoOf(a).compareTo(isoOf(b)) < 0;
        expect(byString, byTime, reason: '$a vs $b 에서 사전순과 시간순이 갈렸다');
      }
    });

    test('로컬 문자열을 섞으면 비교가 깨진다 — 왜 isoOf를 강제하는지', () {
      // 같은 순간을 로컬과 UTC로 각각 문자열화하면 값이 다르다.
      final t = DateTime.utc(2026, 8, 10, 0, 0);
      final localString = t.toLocal().toIso8601String();
      final utcString = isoOf(t);
      // KST(+9)에서는 로컬 문자열이 사전순으로 더 커진다 — 같은 순간인데도.
      expect(localString == utcString, isFalse);
    });
  });

  group('날짜 키', () {
    test('YYYY-MM-DD로 0을 채운다', () {
      expect(dateKeyOf(DateTime(2026, 8, 5)), '2026-08-05');
      expect(dateKeyOf(DateTime(2026, 12, 31)), '2026-12-31');
    });

    test('로컬 기준이다 — 사용자의 하루를 따른다', () {
      // '오늘의 한 장'은 UTC 자정이 아니라 사용자의 자정에 바뀌어야 한다.
      final localMidnight = DateTime(2026, 8, 10, 0, 30);
      expect(dateKeyOf(localMidnight), '2026-08-10');
    });
  });
}
