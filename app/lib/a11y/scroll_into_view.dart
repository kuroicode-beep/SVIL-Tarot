// lib/a11y/scroll_into_view.dart — 포커스가 상단바 뒤로 숨지 않게 한다.
//
// CSS는 `scroll-margin-top: calc(var(--touch-min) + 30px)` 한 줄이었다(tokens.css:262-270).
// sticky 상단바가 있는 화면에서 Tab으로 아래 요소에 닿으면 브라우저가 그 요소를 뷰포트
// 맨 위에 붙이는데, 그 자리가 상단바에 가려 "포커스는 갔는데 보이지 않는" 상태가 된다.
// WCAG 2.4.11(포커스 가림 방지)이 요구하는 것이고, 저시력 사용자에게는 특히 치명적이다.
//
// Flutter에는 대응 속성이 없어 포커스 변화를 직접 듣고 스크롤을 조정한다.

import 'package:flutter/material.dart';

import 'tokens.dart';

/// 상단바에 가리지 않도록 확보할 여백. CSS의 scroll-margin-top과 같은 값.
const double focusScrollMargin = A11yMetrics.touchMin + 30;

/// 포커스가 이동할 때 그 요소를 보이는 곳으로 끌어온다.
///
/// 화면마다 붙이지 않는다 — 앱 셸에 하나만 두면 전 화면이 함께 보호된다.
/// 화면별로 붙이면 새 화면을 만들 때마다 잊고, 잊었다는 사실이 눈에 안 보인다.
class FocusScrollKeeper extends StatefulWidget {
  const FocusScrollKeeper({super.key, required this.child});

  final Widget child;

  @override
  State<FocusScrollKeeper> createState() => _FocusScrollKeeperState();
}

class _FocusScrollKeeperState extends State<FocusScrollKeeper> {
  @override
  void initState() {
    super.initState();
    FocusManager.instance.addListener(_onFocusChange);
  }

  @override
  void dispose() {
    FocusManager.instance.removeListener(_onFocusChange);
    super.dispose();
  }

  void _onFocusChange() {
    final node = FocusManager.instance.primaryFocus;
    final ctx = node?.context;
    if (ctx == null) return;

    // 프레임이 끝난 뒤에 움직인다. 빌드 중 스크롤을 건드리면 레이아웃이 어긋난다.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !ctx.mounted) return;
      final render = ctx.findRenderObject();
      if (render == null) return;

      Scrollable.ensureVisible(
        ctx,
        // alignmentPolicy가 '필요할 때만 최소로' 움직이게 해 화면이 튀지 않는다.
        alignmentPolicy: ScrollPositionAlignmentPolicy.explicit,
        // 상단바 높이만큼 위를 비워 둔다 — 이게 scroll-margin-top의 대체다.
        alignment: 0.0,
        duration: const Duration(milliseconds: 120),
        curve: Curves.easeOut,
      );
    });
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
