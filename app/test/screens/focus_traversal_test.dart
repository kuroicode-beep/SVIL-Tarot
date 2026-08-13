// test/screens/focus_traversal_test.dart — 키보드만으로 앱을 통과할 수 있는가.
//
// WU 1.1의 판정 기준이다. 저시력·키보드 사용자에게 이건 편의가 아니라 도달 가능성 자체다.
//   - Tab을 눌렀을 때 포커스가 허공(null)으로 떨어지지 않는다
//   - 건너뛰는 정지점이 없다
//   - skip link가 본문으로 포커스를 옮긴다
//
// 마우스로 눈 테스트하면 이 중 무엇도 보이지 않는다.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:svil_tarot/a11y/a11y_button.dart';
import 'package:svil_tarot/a11y/a11y_theme.dart';
import 'package:svil_tarot/a11y/skip_link.dart';
import 'package:svil_tarot/a11y/tokens.dart';
import 'package:svil_tarot/screens/home_screen.dart';
import 'package:svil_tarot/state/app_state.dart';

Future<AppState> _state() async {
  SharedPreferences.setMockInitialValues({});
  return AppState(await SharedPreferences.getInstance());
}

void main() {
  testWidgets('Tab 순회에서 포커스가 허공으로 떨어지지 않는다', (tester) async {
    await tester.binding.setSurfaceSize(const Size(1280, 900));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    final state = await _state();
    await tester.pumpWidget(
      ChangeNotifierProvider<AppState>.value(
        value: state,
        child: MaterialApp(
          theme: buildA11yTheme(contrast: ContrastMode.standard, fontSize: FontSizeStep.md),
          home: const Scaffold(body: HomeScreen()),
        ),
      ),
    );
    await tester.pumpAndSettle();

    final buttonCount = find.byType(A11yButton).evaluate().length;
    expect(buttonCount, greaterThan(10), reason: '홈 타일이 렌더되지 않았다');

    // 첫 Tab으로 순회를 시작한다.
    await tester.sendKeyEvent(LogicalKeyboardKey.tab);
    await tester.pumpAndSettle();

    final visited = <String>{};
    for (var i = 0; i < buttonCount; i++) {
      final node = FocusManager.instance.primaryFocus;
      expect(node, isNotNull, reason: '${i + 1}번째 정지점에서 포커스가 허공으로 떨어졌다');
      // 같은 노드를 두 번 밟으면 순회가 갇힌 것이다.
      final id = '${node.hashCode}';
      expect(visited.contains(id), isFalse, reason: '순회가 같은 자리를 반복한다(${i + 1}번째)');
      visited.add(id);

      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pumpAndSettle();
    }

    // 비활성(softDisabled) 타일도 순회에 남아 있어야 한다.
    // 준비 안 된 화면이 순회에서 빠지면 왜 못 쓰는지 들을 방법이 없어진다.
    expect(visited.length, buttonCount,
        reason: '건너뛴 정지점이 있다 — softDisabled 타일이 순회에서 빠졌을 가능성이 높다');
  });

  testWidgets('skip link가 본문으로 포커스를 옮긴다', (tester) async {
    final target = FocusNode(debugLabel: 'main');
    addTearDown(target.dispose);

    final state = await _state();
    await tester.pumpWidget(
      ChangeNotifierProvider<AppState>.value(
        value: state,
        child: MaterialApp(
          theme: buildA11yTheme(contrast: ContrastMode.standard, fontSize: FontSizeStep.md),
          home: Scaffold(
            body: Column(
              children: [
                SkipLink(label: '본문으로 건너뛰기', targetFocusNode: target),
                A11yButton(label: '상단바 버튼', onPressed: () {}),
                Focus(focusNode: target, skipTraversal: true, child: const Text('본문')),
              ],
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // 첫 Tab이 skip link에 닿아야 한다 — 순회 최선두라는 것이 이 위젯의 존재 이유다.
    await tester.sendKeyEvent(LogicalKeyboardKey.tab);
    await tester.pumpAndSettle();

    await tester.sendKeyEvent(LogicalKeyboardKey.enter);
    await tester.pumpAndSettle();

    expect(target.hasFocus, isTrue, reason: 'skip link를 눌러도 본문으로 가지 않는다');
  });

  testWidgets('skip link는 포커스를 받기 전에는 자리를 차지하지 않는다', (tester) async {
    final target = FocusNode();
    addTearDown(target.dispose);

    final state = await _state();
    await tester.pumpWidget(
      ChangeNotifierProvider<AppState>.value(
        value: state,
        child: MaterialApp(
          theme: buildA11yTheme(contrast: ContrastMode.standard, fontSize: FontSizeStep.md),
          home: Scaffold(
            body: SkipLink(label: '본문으로 건너뛰기', targetFocusNode: target),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // 접혀 있어야 한다. 단, Offstage처럼 트리에서 빠지면 안 된다 —
    // 빠지는 순간 Tab으로 닿을 수 없어 이 위젯의 목적이 사라진다.
    expect(find.byType(A11yButton), findsOneWidget, reason: '트리에서 사라졌다');
    expect(tester.getSize(find.byType(SkipLink)).height, lessThan(10),
        reason: '포커스 전에는 접혀 있어야 한다');
  });
}
