// test/core/lunar_test.dart — 음력 변환을 TS가 만든 답과 대조한다.
//
// 표를 손으로 옮겼으므로 전사 오류가 가장 큰 위험이다. 408건 픽스처 + 윤달 201개 +
// 전 구간 왕복이 그것을 잡는다. 숫자 하나만 틀려도 그 해 전체가 어긋나기 때문에
// 오히려 잡기 쉽다 — 조용히 통과할 수 있는 오류가 아니다.

import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:svil_tarot/core/lunar.dart';

void main() {
  late Map<String, Object?> fixture;

  setUpAll(() {
    fixture =
        jsonDecode(File('test/fixtures/lunar.json').readAsStringSync()) as Map<String, Object?>;
  });

  test('윤달 배치가 TS와 같다 — 201년 전부', () {
    final leaps = (fixture['leapMonths']! as List).cast<Map<String, Object?>>();
    expect(leaps.length, 201);
    for (final e in leaps) {
      final year = e['year']! as int;
      expect(leapMonthOfYear(year), e['leapMonth'],
          reason: '$year년 윤달이 다르다 — 표 전사 오류일 가능성이 높다');
    }
  });

  test('변환 결과가 TS와 같다 — 408건', () {
    final cases = (fixture['cases']! as List).cast<Map<String, Object?>>();
    expect(cases.length, greaterThanOrEqualTo(400));

    for (final c in cases) {
      final kind = c['kind'] as String?;
      final input = (c['input']! as Map).cast<String, Object?>();
      final result = (c['result']! as Map).cast<String, Object?>();
      final expected = result['value'];
      final note = c['note'] as String? ?? '';

      if (kind == 'lunarToSolar') {
        final got = lunarToSolar(LunarDate(
          year: input['year']! as int,
          month: input['month']! as int,
          day: input['day']! as int,
          isLeapMonth: (input['isLeapMonth'] as bool?) ?? false,
        ));
        if (expected == null) {
          expect(got, isNull, reason: '$input ($note) 는 null이어야 한다');
        } else {
          final e = (expected as Map).cast<String, Object?>();
          expect(got, isNotNull, reason: '$input ($note) 가 null이 됐다');
          expect(got!.year, e['year'], reason: '$input ($note) 연도');
          expect(got.month, e['month'], reason: '$input ($note) 월');
          expect(got.day, e['day'], reason: '$input ($note) 일');
        }
      } else {
        final got = solarToLunar(
          input['year']! as int,
          input['month']! as int,
          input['day']! as int,
        );
        if (expected == null) {
          expect(got, isNull, reason: '$input 는 null이어야 한다');
        } else {
          final e = (expected as Map).cast<String, Object?>();
          expect(got, isNotNull, reason: '$input 가 null이 됐다');
          expect(got!.year, e['year'], reason: '$input 연도');
          expect(got.month, e['month'], reason: '$input 월');
          expect(got.day, e['day'], reason: '$input 일');
          expect(got.isLeapMonth, (e['isLeapMonth'] as bool?) ?? false,
              reason: '$input 윤달 여부');
        }
      }
    }
  });

  test('한국 기준임이 드러나는 날들 — 중국 농력과 갈린다', () {
    // 1997년 정월 삭 = 2월 8일 00:06 KST. 한국 설날 2/8, 중국 춘절 2/7.
    // 중국 테이블을 실수로 가져오면 여기서 하루가 어긋난다.
    final seol1997 = lunarToSolar(const LunarDate(year: 1997, month: 1, day: 1));
    expect(seol1997, isNotNull);
    expect('${seol1997!.month}/${seol1997.day}', '2/8',
        reason: '중국 농력 표를 쓰면 2/7이 나온다');

    // 2012년은 한국 윤3월(중국은 윤4월).
    expect(leapMonthOfYear(2012), 3, reason: '중국 표라면 4가 나온다');
    // 2017년은 한국 윤5월(중국은 윤6월).
    expect(leapMonthOfYear(2017), 5, reason: '중국 표라면 6이 나온다');
  });

  test('전 구간 왕복 — 73,384일 불일치 0', () {
    // 웹판이 통과한 검사와 같은 범위다. 표 전사 오류는 여기서 반드시 드러난다.
    var jdn = gregorianToJdn(1900, 1, 31);
    final last = gregorianToJdn(2100, 12, 31);
    var checked = 0;
    var mismatches = 0;

    while (jdn <= last) {
      final s = jdnToGregorian(jdn);
      final l = solarToLunar(s.year, s.month, s.day);
      if (l == null) {
        // 표 끝을 넘어선 날은 null이 정상이다.
        jdn++;
        continue;
      }
      final back = lunarToSolar(l);
      if (back == null || back != s) mismatches++;
      checked++;
      jdn++;
    }

    expect(checked, greaterThan(70000), reason: '검사 범위가 줄었다');
    expect(mismatches, 0, reason: '$checked일 중 $mismatches일이 왕복에서 어긋났다');
  });

  group('경계', () {
    test('표 밖 연도는 null', () {
      expect(lunarToSolar(const LunarDate(year: 1899, month: 1, day: 1)), isNull);
      expect(lunarToSolar(const LunarDate(year: 2101, month: 1, day: 1)), isNull);
      expect(leapMonthOfYear(1899), 0);
      expect(leapMonthOfYear(2101), 0);
    });

    test('없는 윤달을 달라고 하면 null', () {
      // 2024년에는 윤달이 없다.
      expect(leapMonthOfYear(2024), 0);
      expect(
        lunarToSolar(const LunarDate(year: 2024, month: 1, day: 1, isLeapMonth: true)),
        isNull,
      );
    });

    test('29일까지인 달의 30일은 조용히 밀지 않고 실패한다', () {
      for (var m = 1; m <= 12; m++) {
        final len = lunarMonthLength(2024, m);
        if (len == 29) {
          expect(lunarToSolar(LunarDate(year: 2024, month: m, day: 30)), isNull,
              reason: '2024년 $m월은 29일까지인데 30일이 통과했다');
        }
      }
    });

    test('양력 없는 날짜는 null', () {
      expect(solarToLunar(2023, 2, 29), isNull, reason: '2023은 평년이다');
      expect(solarToLunar(2024, 2, 30), isNull);
      expect(solarToLunar(2024, 13, 1), isNull);
    });
  });
}
