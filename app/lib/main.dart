// lib/main.dart — 진입점.
//
// WU 0.1 단계라 아직 화면이 없다. 창이 뜨고 어두운 바탕이 칠해지는 것까지만 확인한다.
// 팔레트·글꼴·라우팅은 각각 WU 0.4 / 0.2 / Phase 1에서 붙는다.

import 'package:flutter/material.dart';
import 'package:window_manager/window_manager.dart';

import 'version.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 전체화면 토글(웹판 Fullscreen API 대체)에 window_manager가 필요하고,
  // 초기 창 크기도 여기서 정한다. 저시력 사용자가 글자를 크게 쓰므로 작은 창으로 시작하지 않는다.
  await windowManager.ensureInitialized();
  await windowManager.waitUntilReadyToShow(
    const WindowOptions(
      size: Size(1280, 860),
      minimumSize: Size(960, 640),
      center: true,
      title: 'SVIL 타로',
      titleBarStyle: TitleBarStyle.normal,
    ),
    () async {
      await windowManager.show();
      await windowManager.focus();
    },
  );

  runApp(const SvilTarotApp());
}

class SvilTarotApp extends StatelessWidget {
  const SvilTarotApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SVIL 타로',
      debugShowCheckedModeBanner: false,
      // 임시 테마. WU 0.4에서 tokens.css의 3개 프리셋으로 교체된다.
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0D0D12),
      ),
      home: const _Placeholder(),
    );
  }
}

class _Placeholder extends StatelessWidget {
  const _Placeholder();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'SVIL 타로',
              style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Color(0xFFF5F5F7)),
            ),
            SizedBox(height: 8),
            // SVIL 앱 규칙: 버전은 로고 옆에 상시 표시한다.
            Text('v$appVersion', style: TextStyle(fontSize: 18, color: Color(0xFFB9B9C6))),
          ],
        ),
      ),
    );
  }
}
