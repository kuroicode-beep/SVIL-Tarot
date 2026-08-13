// test/core/soul_card_test.dart — TypeScript가 만든 답과 대조한다.
//
// 기댓값을 손으로 쓰지 않는다. 손으로 쓴 기댓값은 "포팅한 사람이 믿었던 것"을
// 재인코딩할 뿐이고, 원본 로직의 미묘한 동작(예외를 던지는 입력 등)은 그렇게 놓친다.
//
// 픽스처는 scripts/dump_logic_fixtures.mjs가 실행 중인 TS에서 뽑는다.

import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:svil_tarot/core/soul_card.dart';

void main() {
  late Map<String, Object?> fixture;

  setUpAll(() {
    fixture = jsonDecode(File('test/fixtures/soul_card.json').readAsStringSync())
        as Map<String, Object?>;
  });

  test('TS와 답이 같다 — 313건', () {
    final cases = (fixture['cases']! as List).cast<Map<String, Object?>>();
    expect(cases.length, greaterThanOrEqualTo(300), reason: '픽스처가 줄었다');

    var checked = 0;
    var threw = 0;
    for (final c in cases) {
      final input = c['input']! as String;
      final result = (c['result']! as Map).cast<String, Object?>();
      final ok = result['ok']! as bool;

      if (ok) {
        expect(
          calcSoulCard(input),
          result['value'],
          reason: '입력 "$input" 에서 답이 다르다',
        );
        checked++;
      } else {
        // 예외를 던지는 것도 계약이다. Dart가 조용히 값을 돌려주면 화면 동작이 갈린다.
        expect(
          () => calcSoulCard(input),
          throwsA(anything),
          reason: '입력 "$input" 에서 TS는 던지는데 Dart는 던지지 않는다',
        );
        threw++;
      }
    }

    expect(checked, greaterThan(300));
    expect(threw, greaterThan(0), reason: '예외 케이스가 픽스처에서 사라졌다');
  });

  test('이름·카드 id 표가 TS와 같다', () {
    final names = (fixture['names']! as Map).cast<String, Object?>();
    final ids = (fixture['majorIds']! as Map).cast<String, Object?>();

    for (var n = 1; n <= 9; n++) {
      expect(soulCardNames[n], names['$n'], reason: '$n번 이름이 다르다');
      expect(soulCardMajorIds[n], ids['$n'], reason: '$n번 카드 id가 다르다');
      expect(soulCardDescriptions[n], isNotNull);
    }
  });

  group('isValidBirth', () {
    test('실제로 존재하는 날짜만 통과한다', () {
      expect(isValidBirth('2024', '2', '29'), isTrue, reason: '2024는 윤년이다');
      expect(isValidBirth('2023', '2', '29'), isFalse, reason: '2023은 평년이다');
      expect(isValidBirth('2026', '4', '31'), isFalse);
      expect(isValidBirth('2026', '12', '31'), isTrue);
    });

    test('비거나 범위를 벗어나면 거부한다', () {
      expect(isValidBirth('', '1', '1'), isFalse);
      expect(isValidBirth('2026', '13', '1'), isFalse);
      expect(isValidBirth('2026', '0', '1'), isFalse);
      expect(isValidBirth('0', '1', '1'), isFalse);
      expect(isValidBirth('2026', '1', '0'), isFalse);
    });
  });
}
