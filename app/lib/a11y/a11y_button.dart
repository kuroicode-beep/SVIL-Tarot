// lib/a11y/a11y_button.dart — 이 앱의 유일한 버튼.
//
// 왜 Material 버튼을 안 쓰는가
//   Flutter의 button_style_button.dart는 `enabled => onPressed != null`이고
//   `canRequestFocus: widget.enabled`다. 즉 `onPressed: null`을 넣는 순간
//   그 버튼은 **탭 순회에서 사라진다.**
//
//   웹판은 정확히 그 동작을 피하려고 `disabled` 대신 `aria-disabled`를 쓴다.
//   코드 주석: "disabled를 쓰면 탭 순서에서 빠져 상태를 알 길이 없어진다 /
//   첫 문장에 닿는 순간 버튼이 포커스를 잃고 body로 떨어진다."
//   못 누르는 버튼도 **닿을 수는 있어야** 왜 못 누르는지 들을 수 있다.
//
//   Material 버튼을 바깥에서 Semantics(enabled: false)로 감싸는 우회도 안 된다 —
//   button_style_button이 자기 Semantics를 이미 방출해 노드가 둘이 되고,
//   스크린리더는 안쪽(enabled) 것을 읽는다.
//
// 그래서 FocusableActionDetector 위에 직접 짓는다. 포커스 가능성은 항상 참이고,
// '못 누름'은 Semantics(enabled:false)로만 표현한다 — 그게 aria-disabled 그 자체다.
//
// 잘못된 상태를 표현 불가능하게 만든다
//   onPressed가 non-nullable이다. hard-disabled 변종도 없다.
//   정말 쓸 수 없어야 하면 버튼을 렌더하지 않는다.
//   softDisabled면 disabledReason이 필수다(assert) — 왜 못 누르는지 텍스트가 반드시 있어야 한다.

import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';

import 'a11y_theme.dart';
import 'focus_ring.dart';
import 'tokens.dart';

enum A11yButtonVariant {
  /// 기본. 패널 위 보조 동작.
  normal,

  /// 강조. 짙은 회색 바탕 + 흰 테두리 + 흰 글자.
  /// 밝은 바탕을 쓰지 않는다 — 어두운 화면 속 넓은 밝은 면적은 헤일레이션을 만든다.
  primary,

  /// 파괴적 동작(삭제 등). 색만으로 구분하지 않으므로 라벨에도 그 뜻이 있어야 한다.
  danger,
}

class A11yButton extends StatefulWidget {
  const A11yButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.softDisabled = false,
    this.disabledReason,
    this.variant = A11yButtonVariant.normal,
    this.icon,
    this.semanticLabel,
    this.autofocus = false,
    this.focusNode,
    this.expand = false,
  }) : assert(
          !softDisabled || disabledReason != null,
          'softDisabled면 disabledReason이 필수다. '
          '왜 못 누르는지 텍스트로 알리지 않으면 저시력·스크린리더 사용자에게는 고장으로 읽힌다.',
        );

  /// 화면에 보이는 글자. 색만으로 상태를 구분하지 않는 것이 SVIL 규칙이라
  /// 상태는 반드시 이 글자(또는 disabledReason)에 나타나야 한다.
  final String label;

  /// 눌렀을 때 할 일. **nullable이 아니다.**
  /// 비활성은 softDisabled로 표현한다 — null을 넣으면 포커스를 잃기 때문이다.
  final VoidCallback onPressed;

  /// 지금은 누를 수 없음. 포커스는 그대로 받는다(aria-disabled).
  final bool softDisabled;

  /// 왜 못 누르는지. softDisabled면 필수.
  final String? disabledReason;

  final A11yButtonVariant variant;
  final IconData? icon;

  /// 보조기술이 읽을 이름. 생략하면 label을 쓴다.
  /// 아이콘만 있는 버튼처럼 화면 글자가 짧을 때만 따로 준다.
  final String? semanticLabel;

  final bool autofocus;
  final FocusNode? focusNode;

  /// 가로를 꽉 채운다. 목록 안의 큰 선택지에 쓴다.
  final bool expand;

  @override
  State<A11yButton> createState() => _A11yButtonState();
}

class _A11yButtonState extends State<A11yButton> {
  bool _focused = false;
  bool _hovered = false;

  void _activate() {
    if (widget.softDisabled) {
      // 조용히 return하지 않는다.
      //
      // 웹판은 여기가 무성이다 — aria-disabled는 클릭을 막지 않으므로 핸들러가 스스로
      // 범위를 잘라내는데, 그러면 스크린리더 사용자는 눌러도 아무 일이 없다.
      // 이유를 소리로 알려 준다. 3줄로 닫히는 개선이다.
      SemanticsService.sendAnnouncement(
        View.of(context),
        widget.disabledReason!,
        Directionality.of(context),
      );
      return;
    }
    widget.onPressed();
  }

  ({Color background, Color border, Color foreground, double borderWidth}) _style(
    A11yPalette p,
  ) {
    switch (widget.variant) {
      case A11yButtonVariant.primary:
        return (
          background: _hovered ? p.primarySurfaceHover : p.primarySurface,
          border: p.primaryBorder,
          foreground: p.onPrimary,
          borderWidth: A11yMetrics.border,
        );
      case A11yButtonVariant.danger:
        return (
          background: _hovered ? p.surface2 : p.surface,
          border: p.negative,
          foreground: p.negative,
          borderWidth: A11yMetrics.border,
        );
      case A11yButtonVariant.normal:
        return (
          background: _hovered ? p.surface2 : p.surface,
          border: p.borderStrong,
          foreground: p.text,
          borderWidth: A11yMetrics.border,
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.colors;
    final s = _style(p);

    // 비활성은 opacity로 표현하지 않는다 — 투명도를 낮추면 대비까지 같이 무너져
    // 저시력 사용자에게는 '사라진 것'이 된다. 색을 직접 지정해 대비를 유지한다.
    final foreground = widget.softDisabled ? p.textSub : s.foreground;
    final border = widget.softDisabled ? p.border : s.border;

    final content = Row(
      mainAxisSize: widget.expand ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (widget.icon != null) ...[
          Icon(widget.icon, color: foreground, size: 22),
          const SizedBox(width: 8),
        ],
        Flexible(
          child: Text(
            widget.label,
            textAlign: TextAlign.center,
            style: TextStyle(color: foreground, fontWeight: FontWeight.w700),
          ),
        ),
      ],
    );

    final visual = ConstrainedBox(
      // SizedBox(height: 50)이 아니라 minHeight다.
      // 글자가 커지면 상자도 함께 커져야 xl(28px)에서 글자가 잘리지 않는다.
      constraints: const BoxConstraints(minHeight: A11yMetrics.touchMin),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: s.background,
          border: Border.all(color: border, width: s.borderWidth),
          borderRadius: BorderRadius.circular(A11yMetrics.radius),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          child: content,
        ),
      ),
    );

    return FocusableActionDetector(
      focusNode: widget.focusNode,
      autofocus: widget.autofocus,
      // 항상 true. 이 한 줄이 이 위젯의 존재 이유다 —
      // softDisabled여도 포커스를 받아야 왜 못 누르는지 들을 수 있다.
      enabled: true,
      mouseCursor: widget.softDisabled
          ? SystemMouseCursors.basic
          : SystemMouseCursors.click,
      onShowFocusHighlight: (v) => setState(() => _focused = v),
      onShowHoverHighlight: (v) => setState(() => _hovered = v),
      actions: <Type, Action<Intent>>{
        ActivateIntent: CallbackAction<ActivateIntent>(
          onInvoke: (_) {
            _activate();
            return null;
          },
        ),
        ButtonActivateIntent: CallbackAction<ButtonActivateIntent>(
          onInvoke: (_) {
            _activate();
            return null;
          },
        ),
      },
      child: Semantics(
        container: true,
        button: true,
        // aria-disabled 그 자체. hasEnabledState는 세우고 포커스 가능성은 건드리지 않는다.
        enabled: !widget.softDisabled,
        label: widget.semanticLabel ?? widget.label,
        hint: widget.softDisabled ? widget.disabledReason : null,
        onTap: _activate,
        child: ExcludeSemantics(
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: _activate,
            child: FocusRing(visible: _focused, child: visual),
          ),
        ),
      ),
    );
  }
}
