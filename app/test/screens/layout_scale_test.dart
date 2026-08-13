// test/screens/layout_scale_test.dart — 글자 크기 × 대비 조합에서 레이아웃이 살아남는가.
//
// 웹판이 이 지점에서 취약했다. tokens.css는 px 리터럴 227개 vs rem 17개로 93%가 고정이라,
// 글자만 커지고 상자는 그대로여서 xl(28px)에서 잘릴 여지가 있었다.
// Flutter로 옮기며 '텍스트만 스케일, 치수는 하한 고정'으로 경계를 다시 그었는데,
// 그 결정이 실제로 통하는지는 렌더해 봐야만 안다.
//
// 15조합(5 크기 × 3 대비)을 눈으로 15번 보는 대신 여기서 강제한다.
// 창 크기는 최소 지원 크기(960×640)를 쓴다 — 넓은 창에서만 통과하면 의미가 없다.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:svil_tarot/a11y/a11y_theme.dart';
import 'package:svil_tarot/a11y/tokens.dart';
import 'package:svil_tarot/screens/home_screen.dart';
import 'package:svil_tarot/screens/settings_screen.dart';
import 'package:svil_tarot/state/app_state.dart';

/// 최소 지원 창 크기. main.dart의 minimumSize와 같아야 한다.
const Size minWindow = Size(960, 640);

Future<Widget> _app(
  WidgetTester tester, {
  required Widget screen,
  required FontSizeStep size,
  required ContrastMode contrast,
}) async {
  SharedPreferences.setMockInitialValues({});
  final prefs = await SharedPreferences.getInstance();
  final state = AppState(prefs)
    ..setFontSize(size)
    ..setContrast(contrast);

  final scale = effectiveTextScale(step: size, systemScale: 1.0);

  return ChangeNotifierProvider<AppState>.value(
    value: state,
    child: MaterialApp(
      theme: buildA11yTheme(contrast: contrast, fontSize: size),
      home: MediaQuery(
        data: MediaQueryData(
          size: minWindow,
          textScaler: TextScaler.linear(scale),
        ),
        // 화면들은 셸 안에서 살지만, 여기서는 화면 자체의 레이아웃만 본다.
        child: Scaffold(body: screen),
      ),
    ),
  );
}

void main() {
  setUp(() {
    // 오버플로는 기본적으로 콘솔 경고로 끝난다. 테스트에서는 실패로 승격시켜야 잡힌다.
    FlutterError.onError = (details) => FlutterError.presentError(details);
  });

  group('레이아웃 — 5 크기 × 3 대비', () {
    for (final contrast in ContrastMode.values) {
      for (final size in FontSizeStep.values) {
        testWidgets('홈 · ${contrast.name} · ${size.id}(${size.basePx.toInt()}px)',
            (tester) async {
          await tester.binding.setSurfaceSize(minWindow);
          addTearDown(() => tester.binding.setSurfaceSize(null));

          await tester.pumpWidget(
            await _app(tester, screen: const HomeScreen(), size: size, contrast: contrast),
          );
          await tester.pumpAndSettle();

          expect(tester.takeException(), isNull, reason: '오버플로가 났다');
        });

        testWidgets('설정 · ${contrast.name} · ${size.id}(${size.basePx.toInt()}px)',
            (tester) async {
          await tester.binding.setSurfaceSize(minWindow);
          addTearDown(() => tester.binding.setSurfaceSize(null));

          await tester.pumpWidget(
            await _app(tester, screen: const SettingsScreen(), size: size, contrast: contrast),
          );
          await tester.pumpAndSettle();

          expect(tester.takeException(), isNull, reason: '오버플로가 났다');
        });
      }
    }
  });

  group('시스템 배율까지 곱해진 극단값', () {
    testWidgets('xl + Windows 225%에서도 살아남는다', (tester) async {
      // 앱 1.75배 × 시스템 2.25배 = 3.9배. 상한(2.6)에 걸려 잘려야 한다.
      final scale = effectiveTextScale(step: FontSizeStep.xl, systemScale: 2.25);
      expect(scale, maxTextScale, reason: '상한을 넘겨 통과시키면 화면에 아무것도 안 남는다');
      expect(
        isTextScaleClamped(step: FontSizeStep.xl, systemScale: 2.25),
        isTrue,
        reason: '잘렸다는 사실을 설정 화면이 알려야 한다',
      );

      await tester.binding.setSurfaceSize(minWindow);
      addTearDown(() => tester.binding.setSurfaceSize(null));

      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      final state = AppState(prefs)..setFontSize(FontSizeStep.xl);

      await tester.pumpWidget(
        ChangeNotifierProvider<AppState>.value(
          value: state,
          child: MaterialApp(
            theme: buildA11yTheme(
              contrast: ContrastMode.standard,
              fontSize: FontSizeStep.xl,
            ),
            home: MediaQuery(
              data: MediaQueryData(
                size: minWindow,
                textScaler: TextScaler.linear(scale),
              ),
              child: const Scaffold(body: SettingsScreen()),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(tester.takeException(), isNull);
    });
  });
}
