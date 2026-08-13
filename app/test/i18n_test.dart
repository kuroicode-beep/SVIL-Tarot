// test/i18n_test.dart — 번역 테이블 정합성 게이트.
//
// 웹판 scripts/check-i18n.mjs를 옮긴 것이다. 그 게이트는 신설 즉시 실제 누락 2건을 잡았고,
// 그 전에는 ai_start_hint가 화면에 원시 키로 그대로 노출된 적이 있다.
// 659키 × 5언어를 육안으로 지킬 수 있다고 믿으면 안 된다.
//
// 코드가 부르는 키가 사전에 있는지 확인하는 검사는 화면이 생긴 뒤에 추가한다
// (지금은 lib/screens가 없어 스캔할 대상이 없다).

import 'package:flutter_test/flutter_test.dart';
import 'package:svil_tarot/i18n/i18n.dart';
import 'package:svil_tarot/i18n/strings.dart';

void main() {
  // 정확한 수를 단언한다. 대량 붙여넣기가 몇십 개를 조용히 흘려도 여기서 터지게 하려는 것이라,
  // 키를 의도적으로 추가할 때만 이 두 숫자를 함께 올린다.
  //
  // 웹판 이관분 659(ko) / 657(나머지)
  // + v2 신규 4: selected, settings_system_scale, settings_scale_clamped,
  //              settings_system_high_contrast (Windows 배율·고대비 안내)
  const koKeyCount = 663;
  const translatedKeyCount = 661;

  group('사전 구조', () {
    test('ko가 전량을 갖는다', () {
      expect(koStrings.length, koKeyCount);
    });

    test('나머지 4개 언어가 각각 같은 수를 번역했다', () {
      // brand·settings_tts는 고유명사·약어라 의도적으로 번역하지 않는다.
      for (final loc in ['en', 'ja', 'zh', 'vi']) {
        expect(stringTables[loc]!.length, translatedKeyCount, reason: '$loc 번역 수가 달라졌다');
      }
    });

    test('번역 테이블의 모든 키가 ko에도 있다', () {
      // ko에 없는 키가 다른 언어에만 있으면 그 문구는 한국어 화면에서 원시 키로 나온다.
      for (final loc in ['en', 'ja', 'zh', 'vi']) {
        for (final key in stringTables[loc]!.keys) {
          expect(koStrings.containsKey(key), isTrue, reason: '$loc의 $key 가 ko에 없다');
        }
      }
    });

    test('ko에만 있는 키는 brand·settings_tts 둘뿐이다', () {
      for (final loc in ['en', 'ja', 'zh', 'vi']) {
        final missing = koStrings.keys.where((k) => !stringTables[loc]!.containsKey(k)).toSet();
        expect(missing, {'brand', 'settings_tts'}, reason: '$loc 미번역 키가 달라졌다');
      }
    });

    test('빈 문자열 값이 없다', () {
      // 기계 변환이 값을 흘리면 빈 칸으로 나타난다. 화면에서는 "그냥 안 보이는" 상태라 못 알아챈다.
      for (final loc in supportedLocales) {
        for (final entry in stringTables[loc]!.entries) {
          expect(entry.value.isNotEmpty, isTrue, reason: '$loc의 ${entry.key} 가 비었다');
        }
      }
    });
  });

  group('translate()', () {
    test('그 언어의 번역을 돌려준다', () {
      expect(translate('ko', 'nav_save'), '저장');
      expect(translate('en', 'nav_save'), 'Save');
    });

    test('번역이 없으면 한국어로 폴백한다', () {
      // 웹판이 `{ ...ko, ...번역 }` 스프레드로 하던 일을 여기서는 폴백이 한다. 결과가 같아야 한다.
      expect(translate('en', 'brand'), koStrings['brand']);
      expect(translate('vi', 'settings_tts'), koStrings['settings_tts']);
    });

    test('없는 키는 키를 그대로 돌려준다', () {
      // 화면에 원시 키가 보이면 그건 배선 누락이라는 신호다. 조용히 빈 문자열이 되면 안 된다.
      expect(translate('ko', 'no_such_key_12345'), 'no_such_key_12345');
    });

    test('알 수 없는 로케일은 한국어로 떨어진다', () {
      expect(translate('de', 'nav_save'), '저장');
      expect(translate('', 'nav_save'), '저장');
    });

    test('지역 접미사가 붙어도 언어를 찾는다', () {
      expect(translate('en-US', 'nav_save'), 'Save');
      expect(translate('zh_CN', 'nav_save'), stringTables['zh']!['nav_save']);
    });

    test('{name} 자리를 채운다', () {
      final s = translate('ko', 'card_count', {'n': 3});
      expect(s.contains('3'), isTrue);
      expect(s.contains('{n}'), isFalse);
    });

    test('값이 없는 자리는 그대로 남긴다', () {
      // 조용히 빈 문자열로 만들면 "{n}장"이 "장"이 되어 문장이 무너진 걸 못 알아챈다.
      final s = translate('ko', 'card_count');
      expect(s.contains('{n}'), isTrue);
    });
  });

  group('글꼴 옵션', () {
    test('SVIL 표준 8종이 순서대로 있다', () {
      expect(fontOptions.length, 8);
      expect(fontOptions.first.id, 'lineseed', reason: '기본값이자 폴백은 라인시드다');
    });

    test('알 수 없는 id는 첫 항목으로 폴백한다', () {
      // 미확보 글꼴을 고른 설정이 남아 있어도 화면이 깨지지 않아야 한다.
      expect(fontOptionById('없는글꼴').id, 'lineseed');
      expect(fontOptionById(null).id, 'lineseed');
    });

    test('번들 글꼴만 family를 갖는다', () {
      // pubspec에 없는 패밀리명을 넘기면 Flutter가 조용히 기본 글꼴을 쓴다.
      // 그 조용함이 "글꼴을 바꿨는데 아무 일도 없다"로 보이므로 여기서 명시적으로 가른다.
      for (final option in fontOptions) {
        if (option.bundled) {
          expect(option.family, isNotNull, reason: '${option.id} 는 번들인데 family가 없다');
        }
      }
      expect(resolvedFontFamily('godeum'), isNull, reason: '미확보 글꼴은 null이어야 한다');
      expect(resolvedFontFamily('lineseed'), 'LINESeedKR');
      // 맑은 고딕은 시스템 글꼴이라 번들은 아니지만 패밀리명으로 참조된다.
      expect(resolvedFontFamily('malgun'), 'Malgun Gothic');
    });
  });
}
