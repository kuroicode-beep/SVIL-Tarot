// lib/a11y/skip_link.dart — '본문으로 건너뛰기'.
//
// 웹에는 관용구가 있다. 화면 밖(left:-9999px)에 두었다가 포커스를 받으면 나타나는 링크로,
// 스크린리더·키보드 사용자가 상단바 컨트롤 8개를 매번 지나치지 않게 해 준다.
// 네이티브에는 이 관용구도, 앵커 이동도 없다.
//
// 대신 순회 최선두에 버튼을 두고 본문 FocusNode로 포커스를 옮긴다. 결과는 같다.
//
// Offstage를 쓰면 안 된다 — 포커스 순회에서 통째로 빠져 버려 이 위젯의 목적이 사라진다.
// 높이 0의 ClipRect로 '자리는 있으나 보이지 않는' 상태를 만들고, 포커스를 받으면 펼친다.

import 'package:flutter/material.dart';

import 'a11y_button.dart';

class SkipLink extends StatefulWidget {
  const SkipLink({super.key, required this.label, required this.targetFocusNode});

  final String label;

  /// 본문 영역의 FocusNode. 보통 화면 제목이 `focusNode`로 들고 있는다.
  final FocusNode targetFocusNode;

  @override
  State<SkipLink> createState() => _SkipLinkState();
}

class _SkipLinkState extends State<SkipLink> {
  final FocusNode _node = FocusNode(debugLabel: 'skip-link');
  bool _visible = false;

  @override
  void initState() {
    super.initState();
    _node.addListener(_onFocus);
  }

  void _onFocus() {
    if (_node.hasFocus != _visible) setState(() => _visible = _node.hasFocus);
  }

  @override
  void dispose() {
    _node.removeListener(_onFocus);
    _node.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final button = A11yButton(
      label: widget.label,
      focusNode: _node,
      onPressed: () => widget.targetFocusNode.requestFocus(),
    );

    // 포커스가 없을 때는 높이 0으로 접어 두되 트리에는 남긴다.
    // Offstage/Visibility(maintainState:false)는 순회에서 빼 버려 쓸 수 없다.
    return ClipRect(
      child: Align(
        alignment: Alignment.topLeft,
        heightFactor: _visible ? 1.0 : 0.0,
        child: Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: button,
        ),
      ),
    );
  }
}
