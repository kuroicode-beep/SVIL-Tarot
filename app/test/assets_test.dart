// test/assets_test.dart — pubspec이 선언한 에셋이 실제로 디스크에 있는지 대조한다.
//
// 왜 필요한가
//   웹의 @font-face는 없는 파일을 조용히 무시한다. 실제로 웹판 tokens.css는
//   존재하지 않는 LINESeedKR-Bd/Th.woff2를 몇 달째 선언하고 있었고 아무도 몰랐다
//   — 굵은 글씨가 전부 브라우저 합성으로 나오고 있었다.
//   pubspec은 반대로 빌드를 실패시키지만, 그건 '선언했는데 파일이 없을 때'만이다.
//   여기서는 반대 방향(파일은 있는데 선언에서 빠짐, 개수가 조용히 줄어듦)까지 함께 막는다.
//
// 이 테스트가 잡는 실패
//   - 덱 이미지가 78장이 아님 (타로 한 벌은 정확히 78장이다)
//   - 화면이 읽는 데이터 JSON이 빠짐
//   - 선언한 글꼴 파일이 디스크에 없음

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:yaml/yaml.dart';

void main() {
  late YamlMap pubspec;

  setUpAll(() {
    pubspec = loadYaml(File('pubspec.yaml').readAsStringSync()) as YamlMap;
  });

  test('덱 이미지는 정확히 78장이다', () {
    final files = Directory('assets/deck')
        .listSync()
        .whereType<File>()
        .where((f) => f.path.endsWith('.webp'))
        .toList();
    expect(files.length, 78, reason: '타로 한 벌은 78장이다. 누락·중복이 있다.');
  });

  test('데이터 JSON 6종이 전부 있고 파싱된다', () {
    const required = [
      'cards.json',
      'cards.i18n.json',
      'dreams.json',
      'lessons.json',
      'quizzes.json',
      'spreads.json',
    ];
    for (final name in required) {
      final file = File('assets/data/$name');
      expect(file.existsSync(), isTrue, reason: 'assets/data/$name 이 없다');
      // 존재만으로는 부족하다 — 복사 중 잘린 파일을 잡으려면 실제로 파싱해 봐야 한다.
      expect(
        () => file.readAsStringSync(),
        returnsNormally,
        reason: 'assets/data/$name 을 읽을 수 없다',
      );
      expect(file.lengthSync(), greaterThan(0), reason: 'assets/data/$name 이 비어 있다');
    }
  });

  test('pubspec이 선언한 글꼴 파일이 전부 디스크에 있다', () {
    final flutterSection = pubspec['flutter'] as YamlMap;
    final fonts = flutterSection['fonts'] as YamlList?;
    expect(fonts, isNotNull, reason: 'pubspec에 fonts 선언이 없다');

    var declared = 0;
    for (final family in fonts!) {
      for (final entry in (family['fonts'] as YamlList)) {
        final asset = entry['asset'] as String;
        expect(File(asset).existsSync(), isTrue, reason: '$asset 이 선언돼 있으나 파일이 없다');
        declared++;
      }
    }
    // 선언이 조용히 사라지는 것도 실패다. 지금은 4파일(LINE Seed 1 + 나눔 2 + 교보 1).
    expect(declared, greaterThanOrEqualTo(4), reason: '글꼴 선언이 줄었다');
  });

  test('pubspec이 선언한 에셋 디렉터리가 전부 존재한다', () {
    final flutterSection = pubspec['flutter'] as YamlMap;
    final assets = flutterSection['assets'] as YamlList;
    for (final entry in assets) {
      final path = entry as String;
      final exists = path.endsWith('/')
          ? Directory(path).existsSync()
          : File(path).existsSync();
      expect(exists, isTrue, reason: '$path 이 선언돼 있으나 없다');
    }
  });
}
