// lib/main.dart — 진입점.
//
// 라우트는 웹판 App.tsx의 25개를 그대로 옮겨 가되, 화면이 준비된 것부터 붙인다.
// 코드 분할·서비스워커·청크 프리페치는 Flutter에 개념 자체가 없어 통째로 사라졌다.

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:window_manager/window_manager.dart';

import 'a11y/a11y_theme.dart';
import 'a11y/scroll_into_view.dart';
import 'i18n/i18n.dart';
import 'screens/home_screen.dart';
import 'screens/settings_screen.dart';
import 'state/app_state.dart';
import 'widgets/app_shell.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await windowManager.ensureInitialized();
  await windowManager.waitUntilReadyToShow(
    const WindowOptions(
      size: Size(1280, 860),
      // 저시력 사용자가 글자를 크게 쓰므로 작은 창으로 시작하지 않는다.
      // 이 값이 레이아웃 검증의 기준 하한이기도 하다.
      minimumSize: Size(960, 640),
      center: true,
      title: 'SVIL 타로',
    ),
    () async {
      await windowManager.show();
      await windowManager.focus();
    },
  );

  final prefs = await SharedPreferences.getInstance();

  runApp(
    ChangeNotifierProvider(
      create: (_) => AppState(prefs),
      child: const SvilTarotApp(),
    ),
  );
}

final GoRouter _router = GoRouter(
  routes: [
    ShellRoute(
      builder: (context, state, child) => AppShell(child: child),
      routes: [
        GoRoute(path: '/', builder: (_, _) => const HomeScreen()),
        GoRoute(path: '/settings', builder: (_, _) => const SettingsScreen()),
      ],
    ),
  ],
  // 아직 없는 경로로 가면 홈으로. 웹판의 catch-all Navigate와 같다.
  errorBuilder: (_, _) => const HomeScreen(),
);

class SvilTarotApp extends StatelessWidget {
  const SvilTarotApp({super.key});

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();

    return Builder(
      builder: (context) {
        // Windows 고대비는 엔진이 SPI_GETHIGHCONTRAST로 읽어 여기에 넣어 준다.
        // WM_THEMECHANGED로 실행 중 전환도 반영되므로 FFI가 필요 없다.
        final highContrast = MediaQuery.highContrastOf(context);
        WidgetsBinding.instance.addPostFrameCallback((_) {
          app.updateSystemHighContrast(highContrast);
        });

        // 시스템 텍스트 배율(레지스트리 TextScaleFactor)이 앱 설정과 곱해진다.
        // 웹판에 없던 변수라 상한을 두지 않으면 1280×800에서 화면이 통째로 밀려난다.
        final systemScale = MediaQuery.textScalerOf(context).scale(16) / 16;
        final scale = effectiveTextScale(
          step: app.settings.fontSize,
          systemScale: systemScale,
        );

        return MaterialApp.router(
          title: 'SVIL 타로',
          debugShowCheckedModeBanner: false,
          routerConfig: _router,
          theme: buildA11yTheme(
            contrast: app.effectiveContrast,
            fontSize: app.settings.fontSize,
            fontFamily: resolvedFontFamily(app.settings.fontId),
          ),
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context).copyWith(textScaler: TextScaler.linear(scale)),
            // 포커스가 상단바 뒤로 숨지 않게 셸 전체를 감싼다(scroll-margin-top 대체).
            child: FocusScrollKeeper(child: child ?? const SizedBox.shrink()),
          ),
        );
      },
    );
  }
}
