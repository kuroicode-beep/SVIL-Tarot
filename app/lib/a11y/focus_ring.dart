// lib/a11y/focus_ring.dart — 포커스 표시.
//
// CSS는 `outline: 4px solid var(--focus)` + `outline-offset: 3px`이었다.
// Flutter에는 둘 다 없다.
//
// 간격(offset)은 장식이 아니라 필수다. 노랑 포커스 링과 흰 버튼 테두리의 대비가 1.41:1이라,
// 사이에 어두운 틈이 없으면 두 선이 한 덩어리로 보여 포커스 위치를 놓친다.
// (contrast_test.dart가 이 조건을 단언한다.)
//
// 바깥으로 번지는 그림자(BoxShadow)로 그리지 않는 이유:
// tokens.css:263 주석이 "box-shadow는 overflow가 있는 조상에서 잘려서 안 쓴다"고 못 박았는데,
// Flutter에서도 ClipRRect·ListView가 정확히 같은 함정이다. 목록 안의 첫/마지막 항목만
// 링이 잘리는 식으로 조용히 깨진다.
//
// 그래서 링을 '자식 바깥에 그리는 효과'가 아니라 **레이아웃 공간을 실제로 차지하는 테두리**로 만든다.
// 포커스가 없을 때도 같은 공간을 투명하게 잡아 두어 포커스 이동 시 레이아웃이 흔들리지 않는다.

import 'package:flutter/material.dart';

import 'a11y_theme.dart';
import 'tokens.dart';

class FocusRing extends StatelessWidget {
  const FocusRing({
    super.key,
    required this.visible,
    required this.child,
    this.radius = A11yMetrics.radius,
  });

  final bool visible;
  final Widget child;

  /// 감싸는 대상의 모서리 반경. 링은 간격만큼 더 크게 돈다.
  final double radius;

  @override
  Widget build(BuildContext context) {
    final focus = context.colors.focus;

    return Container(
      // 테두리(=링) 안쪽 여백이 곧 CSS의 outline-offset이다.
      padding: const EdgeInsets.all(A11yMetrics.focusRingOffset),
      decoration: BoxDecoration(
        border: Border.all(
          // 포커스가 없을 때도 같은 두께를 투명하게 잡는다. 색만 바뀌므로 레이아웃이 안 움직인다.
          color: visible ? focus : Colors.transparent,
          width: A11yMetrics.focusRingWidth,
        ),
        borderRadius: BorderRadius.circular(
          radius + A11yMetrics.focusRingOffset + A11yMetrics.focusRingWidth,
        ),
      ),
      child: child,
    );
  }

  /// 링이 차지하는 전체 여백. 부모가 크기를 계산할 때 쓴다.
  static const double totalInset = A11yMetrics.focusRingWidth + A11yMetrics.focusRingOffset;
}
