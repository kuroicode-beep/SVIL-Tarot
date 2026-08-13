// lib/widgets/app_shell.dart — 모든 화면을 감싸는 껍데기.
//
// 웹판 AppShell.tsx를 옮겼다. 상단바·skip link·저장 배너·본문 포커스 대상을 여기서 한 번만 둔다.
// 화면마다 붙이지 않는 이유: 새 화면을 만들 때마다 잊게 되고, 잊었다는 사실이 눈에 안 보인다.

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:window_manager/window_manager.dart';

import '../a11y/a11y_button.dart';
import '../a11y/a11y_theme.dart';
import '../a11y/live_region.dart';
import '../a11y/skip_link.dart';
import '../a11y/tokens.dart';
import '../state/app_state.dart';
import '../version.dart';

class AppShell extends StatefulWidget {
  const AppShell({super.key, required this.child});

  final Widget child;

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  /// 본문 시작점. skip link가 여기로 포커스를 보낸다.
  final FocusNode _mainFocus = FocusNode(debugLabel: 'main-content');

  @override
  void dispose() {
    _mainFocus.dispose();
    super.dispose();
  }

  Future<void> _toggleFullscreen() async {
    final full = await windowManager.isFullScreen();
    await windowManager.setFullScreen(!full);
  }

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final p = context.colors;
    final location = GoRouterState.of(context).uri.path;
    final isHome = location == '/';

    return Scaffold(
      backgroundColor: p.bg,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              // 순회 최선두. 상단바 컨트롤 8개를 매번 지나치지 않게 해 준다.
              child: SkipLink(label: app.t('skip_main'), targetFocusNode: _mainFocus),
            ),
            _TopBar(onFullscreen: _toggleFullscreen),
            // 저장 실패·안내는 전역 배너로. 성공 문구는 각 화면이 버튼 옆에 띄운다 —
            // 저시력 사용자에게는 화면 맨 위보다 방금 누른 버튼 근처가 훨씬 잘 보인다.
            if (app.saveMessage != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                child: LiveRegion(
                  message: app.saveMessage,
                  level: LiveRegionLevel.assertive,
                  style: TextStyle(color: p.negative, fontWeight: FontWeight.w700),
                ),
              ),
            if (!isHome)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: A11yButton(
                    label: app.t('nav_back'),
                    icon: Icons.arrow_back,
                    onPressed: () {
                      if (context.canPop()) {
                        context.pop();
                      } else {
                        context.go('/');
                      }
                    },
                  ),
                ),
              ),
            Expanded(
              // tabIndex={-1}에 해당. skip link가 보낸 포커스를 여기서 받는다.
              child: Focus(
                focusNode: _mainFocus,
                // 이 노드 자체는 Tab 순회에 끼지 않는다. 프로그램적으로만 포커스를 받는다.
                skipTraversal: true,
                child: widget.child,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TopBar extends StatelessWidget {
  const _TopBar({required this.onFullscreen});

  final Future<void> Function() onFullscreen;

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final p = context.colors;
    final canSpeak = app.lastSpeakText.trim().isNotEmpty;

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
      decoration: BoxDecoration(
        color: p.surface,
        border: Border(bottom: BorderSide(color: p.border, width: A11yMetrics.borderThin)),
      ),
      child: Wrap(
        spacing: 10,
        runSpacing: 10,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          // SVIL 앱 규칙: 버전은 로고 옆에 상시 표시한다.
          _Brand(),
          A11yButton(
            // 낭독 중에는 같은 버튼이 '중지'가 된다. 상태를 색이 아니라 글자로 바꾼다.
            label: app.speaking ? app.t('nav_stop') : app.t('nav_tts'),
            icon: app.speaking ? Icons.stop : Icons.volume_up,
            // 읽을 내용이 없을 때 hard-disable하면 탭 순서에서 빠져 상태를 알 길이 없어진다.
            softDisabled: !app.speaking && !canSpeak,
            disabledReason: (!app.speaking && !canSpeak) ? app.t('nav_tts_none') : null,
            onPressed: () {
              if (app.speaking) {
                app.stopSpeak();
              } else if (canSpeak) {
                app.speak(app.lastSpeakText);
              }
            },
          ),
          A11yButton(
            label: app.t('nav_save'),
            icon: Icons.save,
            onPressed: () => app.runSave(),
          ),
          A11yButton(
            label: app.t('home_customers'),
            icon: Icons.people,
            onPressed: () => context.go('/customers'),
          ),
          A11yButton(
            label: app.t('nav_history'),
            icon: Icons.list_alt,
            onPressed: () => context.go('/history'),
          ),
          A11yButton(
            label: app.t('nav_settings'),
            icon: Icons.settings,
            onPressed: () => context.go('/settings'),
          ),
          A11yButton(
            label: app.t('nav_fullscreen'),
            icon: Icons.fullscreen,
            onPressed: () => onFullscreen(),
          ),
        ],
      ),
    );
  }
}

class _Brand extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final p = context.colors;
    return Semantics(
      header: true,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            app.t('brand'),
            style: TextStyle(color: p.text, fontWeight: FontWeight.w700, fontSize: 20),
          ),
          const SizedBox(width: 8),
          Text(
            'v$appVersion',
            // 숫자는 모노체(SVIL 규칙).
            style: TextStyle(color: p.textSub, fontFamily: 'Consolas', fontSize: 14),
          ),
        ],
      ),
    );
  }
}
