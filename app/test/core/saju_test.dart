// test/core/saju_test.dart — 사주를 TS가 만든 답과 대조한다.
//
// 1,116건 중 절기 경계(각 달 3·5·7·8일)를 집중적으로 넣었다.
// 웹판이 실제로 틀렸던 자리이고, "기본 2/4 + 몇 해만 2/3" 식 근사는
// 1902~1984의 38개 해에서 연주를 한 해 앞당긴다.

import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:svil_tarot/core/saju.dart';

void main() {
  late List<Map<String, Object?>> cases;

  setUpAll(() {
    final fixture =
        jsonDecode(File('test/fixtures/saju.json').readAsStringSync()) as Map<String, Object?>;
    cases = (fixture['cases']! as List).cast<Map<String, Object?>>();
  });

  test('TS와 답이 같다 — 1,116건', () {
    expect(cases.length, greaterThanOrEqualTo(1000), reason: '픽스처가 줄었다');

    for (final c in cases) {
      final input = (c['input']! as Map).cast<String, Object?>();
      final result = (c['result']! as Map).cast<String, Object?>();
      expect(result['ok'], isTrue, reason: 'TS가 던진 케이스는 아직 없다');

      final expected = (result['value']! as Map).cast<String, Object?>();
      final note = c['note'] as String? ?? '';

      // 픽스처는 두 모양을 섞어 담았다: {date, time} 또는 {y, m, d, hour}.
      final date = (input['date'] as String?) ??
          '${input['y']}-${input['m'].toString().padLeft(2, '0')}-${input['d'].toString().padLeft(2, '0')}';
      final time = (input['time'] as String?) ?? '12:00';

      final got = buildSajuSummary(birthDate: date, birthTime: time);
      final label = '$date $time ${note.isEmpty ? '' : '($note)'}';

      final ey = (expected['year']! as Map).cast<String, Object?>();
      final em = (expected['month']! as Map).cast<String, Object?>();
      final ed = (expected['day']! as Map).cast<String, Object?>();

      expect(got.year.ganji, ey['ganji'], reason: '$label 연주');
      expect(got.year.element, ey['element'], reason: '$label 연주 오행');
      expect(got.year.boundary, ey['boundary'], reason: '$label 연주 경계');
      expect(got.month.ganji, em['ganji'], reason: '$label 월주');
      expect(got.month.boundary, em['boundary'], reason: '$label 월주 경계');
      expect(got.day.ganji, ed['ganji'], reason: '$label 일주');

      final eh = expected['hour'];
      if (eh == null) {
        expect(got.hour, isNull, reason: '$label 시주가 없어야 한다');
      } else {
        final ehm = (eh as Map).cast<String, Object?>();
        expect(got.hour, isNotNull, reason: '$label 시주가 null이 됐다');
        expect(got.hour!.ganji, ehm['ganji'], reason: '$label 시주');
        expect(got.hour!.element, ehm['element'], reason: '$label 시주 오행');
      }

      final ew = (expected['warnings'] as List?)?.cast<String>() ?? const <String>[];
      expect(got.warnings, ew, reason: '$label 경고 목록');

      // 프롬프트로 나가는 평문까지 같아야 한다 — LLM 입력이 흔들리면 리딩 품질이 흔들린다.
      expect(got.textBlock, expected['textBlock'], reason: '$label textBlock');
    }
  });

  group('회귀 케이스 — 웹판이 실제로 틀렸던 자리', () {
    test('1984-02-04는 계해년이다 (입춘 2/5)', () {
      // "기본 2/4" 근사면 갑자년이 나온다.
      expect(lichunDay(1984), 5);
      final s = buildSajuSummary(birthDate: '1984-02-04', birthTime: '12:00');
      expect(s.year.ganji, '계해');
    });

    test('2021 입춘 경계 — 2/2는 경자, 2/3은 신축', () {
      expect(lichunDay(2021), 3);
      expect(buildSajuSummary(birthDate: '2021-02-02', birthTime: '12:00').year.ganji, '경자');
      expect(buildSajuSummary(birthDate: '2021-02-03', birthTime: '12:00').year.ganji, '신축');
    });

    test('1990-03-15 월주는 기묘다', () {
      expect(buildSajuSummary(birthDate: '1990-03-15', birthTime: '12:00').month.ganji, '기묘');
    });

    test('2000-01-01 일주는 무오다 — 일주 기준점 검산', () {
      expect(dayPillarApprox('2000-01-01').ganji, '무오');
    });
  });

  group('야자시', () {
    test('23시 이후는 일주만 다음 날로 넘어간다', () {
      final normal = buildSajuSummary(birthDate: '2026-08-10', birthTime: '22:00');
      final lateZi = buildSajuSummary(birthDate: '2026-08-10', birthTime: '23:00');

      // 연·월주는 그대로.
      expect(lateZi.year.ganji, normal.year.ganji);
      expect(lateZi.month.ganji, normal.month.ganji);
      // 일주만 다음 날.
      expect(lateZi.day.ganji, dayPillarApprox('2026-08-11').ganji);
      expect(lateZi.warnings, contains('saju_warn_late_zi_hour'));
    });
  });

  group('음력 입력', () {
    test('환산에 성공하면 양력으로 간지를 세운다', () {
      final s = buildSajuSummary(
        birthDate: '2024-01-01',
        birthTime: '12:00',
        calendarType: 'lunar',
      );
      expect(s.lunarConverted, isTrue);
      expect(s.solarDate, '2024-02-10');
      expect(s.warnings, contains('saju_warn_lunar_converted'));
      // 양력 2024-02-10로 계산한 것과 같아야 한다.
      final direct = buildSajuSummary(birthDate: '2024-02-10', birthTime: '12:00');
      expect(s.year.ganji, direct.year.ganji);
      expect(s.day.ganji, direct.day.ganji);
    });

    test('환산에 실패하면 간지를 아예 세우지 않는다', () {
      // 2024년에는 윤달이 없다.
      final s = buildSajuSummary(
        birthDate: '2024-01-01',
        birthTime: '12:00',
        calendarType: 'lunar',
        isLeapMonth: true,
      );
      expect(s.lunarConverted, isFalse);
      expect(s.solarDate, isNull);
      expect(s.year.ganji, '—', reason: '틀린 값을 보여 주느니 세우지 않는다');
      expect(s.month.ganji, '—');
      expect(s.day.ganji, '—');
      expect(s.hour, isNull);
      expect(s.warnings, ['saju_warn_lunar_convert_failed'],
          reason: '세우지도 않은 간지에 대한 잡음 경고를 띄우면 안 된다');
    });
  });

  group('깨진 입력', () {
    test('연도가 비면 모든 주가 —다', () {
      // 웹판에서 Number('')가 0이 되어 연주만 찍히던 반쪽 결과를 막는다.
      final s = buildSajuSummary(birthDate: '-03-15', birthTime: '12:00');
      expect(s.year.ganji, '—');
      expect(s.month.ganji, '—');
      expect(s.day.ganji, '—');
    });

    test('시각 형식이 틀리면 시주를 세우지 않는다', () {
      for (final bad in ['', '25:00', '12:70', '12', 'abc']) {
        final s = buildSajuSummary(birthDate: '2026-08-10', birthTime: bad);
        expect(s.hour, isNull, reason: '"$bad" 로 시주가 세워졌다');
        expect(s.warnings, contains('saju_warn_hour_missing'));
      }
    });
  });
}
