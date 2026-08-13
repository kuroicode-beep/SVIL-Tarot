// test/a11y/a11y_button_test.dart — aria-disabled 계약을 코드로 못 박는다.
//
// 이 파일이 지키는 명제는 하나다.
//   "못 누르는 버튼도 포커스는 받는다."
//
// Flutter 기본값(onPressed: null)은 정확히 그 반대로 동작하고, 마우스로 눈 테스트하면
// 절대 보이지 않는다. 화면 22개를 쓰는 동안 이 결정이 하나씩 사라지는 것이
// 이 포팅의 최대 위험이라, 게이트를 화면보다 먼저 세운다.

import 'dart:ui' show Tristate;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:svil_tarot/a11y/a11y_button.dart';
import 'package:svil_tarot/a11y/a11y_theme.dart';
import 'package:svil_tarot/a11y/tokens.dart';

Widget _wrap(Widget child) => MaterialApp(
      theme: buildA11yTheme(
        contrast: ContrastMode.standard,
        fontSize: FontSizeStep.md,
      ),
      home: Scaffold(body: Center(child: child)),
    );

void main() {
  group('softDisabled — aria-disabled 계약', () {
    testWidgets('비활성이어도 포커스를 받는다', (tester) async {
      final node = FocusNode();
      addTearDown(node.dispose);

      await tester.pumpWidget(_wrap(A11yButton(
        label: '저장',
        softDisabled: true,
        disabledReason: '저장할 내용이 없습니다',
        focusNode: node,
        onPressed: () {},
      )));

      node.requestFocus();
      await tester.pump();

      expect(node.hasFocus, isTrue, reason: '비활성 버튼이 포커스를 잃으면 왜 못 누르는지 들을 수 없다');
    });

    testWidgets('활성→비활성 전환에서 포커스를 유지한다', (tester) async {
      // 실제로 사고가 나는 순간이다 — 낭독 중 첫 문장에 닿아 '이전' 버튼이 비활성이 되는 식.
      final node = FocusNode();
      addTearDown(node.dispose);

      Widget build(bool disabled) => _wrap(A11yButton(
            label: '이전 문장',
            softDisabled: disabled,
            disabledReason: disabled ? '첫 문장입니다' : null,
            focusNode: node,
            onPressed: () {},
          ));

      await tester.pumpWidget(build(false));
      node.requestFocus();
      await tester.pump();
      expect(node.hasFocus, isTrue);

      await tester.pumpWidget(build(true));
      await tester.pump();

      expect(node.hasFocus, isTrue, reason: '비활성이 되는 순간 포커스가 body로 떨어지면 위치를 통째로 잃는다');
    });

    testWidgets('시맨틱 노드가 enabled=false이면서 focusable이다', (tester) async {
      final handle = tester.ensureSemantics();

      await tester.pumpWidget(_wrap(A11yButton(
        label: '저장',
        softDisabled: true,
        disabledReason: '저장할 내용이 없습니다',
        onPressed: () {},
      )));

      final node = tester.getSemantics(find.bySemanticsLabel('저장'));
      // 새 API는 hasEnabledState + isEnabled를 Tristate 하나로 합쳤다.
      // none이면 '해당 없음'이고, isFalse여야 aria-disabled 상태다.
      expect(node.flagsCollection.isEnabled, Tristate.isFalse,
          reason: 'aria-disabled 상태여야 한다. none이면 상태 자체가 없다는 뜻이라 틀렸다');
      expect(node.flagsCollection.isButton, isTrue);

      handle.dispose();
    });

    testWidgets('비활성 사유가 힌트로 노출된다', (tester) async {
      final handle = tester.ensureSemantics();

      await tester.pumpWidget(_wrap(A11yButton(
        label: '복습 시작',
        softDisabled: true,
        disabledReason: '오늘 복습할 카드가 없습니다',
        onPressed: () {},
      )));

      final node = tester.getSemantics(find.bySemanticsLabel('복습 시작'));
      expect(node.hint, contains('오늘 복습할 카드가 없습니다'));

      handle.dispose();
    });

    testWidgets('비활성 상태에서 눌러도 핸들러가 돌지 않는다', (tester) async {
      var calls = 0;
      await tester.pumpWidget(_wrap(A11yButton(
        label: '저장',
        softDisabled: true,
        disabledReason: '저장할 내용이 없습니다',
        onPressed: () => calls++,
      )));

      await tester.tap(find.byType(A11yButton));
      await tester.pump();

      expect(calls, 0);
    });

    testWidgets('비활성 상태에서 누르면 사유를 소리로 알린다', (tester) async {
      // 웹판은 여기가 무성이라 스크린리더 사용자가 눌러도 아무 반응이 없었다.
      final announced = <String>[];
      tester.binding.defaultBinaryMessenger.setMockDecodedMessageHandler<dynamic>(
        SystemChannels.accessibility,
        (dynamic message) async {
          final map = message as Map<dynamic, dynamic>;
          if (map['type'] == 'announce') {
            announced.add((map['data'] as Map<dynamic, dynamic>)['message'] as String);
          }
          return null;
        },
      );
      addTearDown(() {
        tester.binding.defaultBinaryMessenger
            .setMockDecodedMessageHandler<dynamic>(SystemChannels.accessibility, null);
      });

      await tester.pumpWidget(_wrap(A11yButton(
        label: '저장',
        softDisabled: true,
        disabledReason: '저장할 내용이 없습니다',
        onPressed: () {},
      )));

      await tester.tap(find.byType(A11yButton));
      await tester.pump();

      expect(announced, ['저장할 내용이 없습니다']);
    });
  });

  group('정상 동작', () {
    testWidgets('누르면 핸들러가 정확히 1회 돈다', (tester) async {
      var calls = 0;
      await tester.pumpWidget(_wrap(A11yButton(label: '뽑기', onPressed: () => calls++)));

      await tester.tap(find.byType(A11yButton));
      await tester.pump();

      expect(calls, 1);
    });

    testWidgets('Enter와 Space로 활성화된다', (tester) async {
      var calls = 0;
      final node = FocusNode();
      addTearDown(node.dispose);

      await tester.pumpWidget(_wrap(
        A11yButton(label: '뽑기', focusNode: node, onPressed: () => calls++),
      ));
      node.requestFocus();
      await tester.pump();

      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pump();
      expect(calls, 1, reason: 'Enter로 눌리지 않는다');

      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      await tester.pump();
      expect(calls, 2, reason: 'Space로 눌리지 않는다');
    });

    testWidgets('활성 상태의 시맨틱은 enabled다', (tester) async {
      final handle = tester.ensureSemantics();

      await tester.pumpWidget(_wrap(A11yButton(label: '뽑기', onPressed: () {})));

      final node = tester.getSemantics(find.bySemanticsLabel('뽑기'));
      expect(node.flagsCollection.isEnabled, Tristate.isTrue);

      handle.dispose();
    });
  });

  group('왜 Material 버튼을 안 쓰는가 — 근거를 코드로 남긴다', () {
    testWidgets('ElevatedButton(onPressed: null)은 포커스를 받지 못한다', (tester) async {
      // 이 테스트는 A11yButton을 검사하지 않는다. Flutter 기본 동작을 기록한다.
      //
      // 위 계약 테스트들이 "당연한 걸 검사하는 공허한 테스트"로 보여 언젠가 지워지는 것을 막는다.
      // button_style_button.dart는 `enabled => onPressed != null`이고
      // `canRequestFocus: widget.enabled`라, null을 넣으면 탭 순회에서 사라진다.
      // 이 앱은 그 동작을 의도적으로 거부한다.
      final node = FocusNode();
      addTearDown(node.dispose);

      await tester.pumpWidget(_wrap(
        // ignore: avoid_redundant_argument_values
        ElevatedButton(onPressed: null, focusNode: node, child: const Text('저장')),
      ));

      node.requestFocus();
      await tester.pump();

      expect(
        node.hasFocus,
        isFalse,
        reason: 'Flutter 기본 동작이 바뀌었다면 A11yButton의 전제를 다시 검토해야 한다',
      );
    });
  });

  group('치수', () {
    testWidgets('터치 타겟이 50 미만으로 내려가지 않는다', (tester) async {
      await tester.pumpWidget(_wrap(A11yButton(label: '짧음', onPressed: () {})));

      final size = tester.getSize(find.byType(A11yButton));
      // 포커스 링 여백까지 포함한 전체 높이라 최소 50 + 링 여백이다.
      expect(size.height, greaterThanOrEqualTo(A11yMetrics.touchMin));
    });

    testWidgets('글자가 커지면 상자도 커진다 — 고정 높이가 아니다', (tester) async {
      // SizedBox(height: 50)을 쓰면 xl(28px)에서 글자가 잘린다.
      Future<double> heightAt(double scale) async {
        await tester.pumpWidget(MaterialApp(
          theme: buildA11yTheme(contrast: ContrastMode.standard, fontSize: FontSizeStep.md),
          home: MediaQuery(
            data: MediaQueryData(textScaler: TextScaler.linear(scale)),
            child: Scaffold(
              body: Center(
                child: SizedBox(
                  width: 200,
                  child: A11yButton(label: '두 줄이 될 만큼 충분히 긴 라벨입니다', onPressed: () {}),
                ),
              ),
            ),
          ),
        ));
        await tester.pumpAndSettle();
        return tester.getSize(find.byType(A11yButton)).height;
      }

      final small = await heightAt(1.0);
      final large = await heightAt(2.6);
      expect(large, greaterThan(small), reason: '글자가 커져도 상자가 그대로면 글자가 잘린다');
    });
  });
}
