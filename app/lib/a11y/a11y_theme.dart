// lib/a11y/a11y_theme.dart — 팔레트를 위젯 트리에 흘려보내는 ThemeExtension.
//
// Material의 ColorScheme에 억지로 끼워 넣지 않는다. SVIL 토큰은 primary/secondary 같은
// Material 축이 아니라 '어디에 쓰는 색인가'로 나뉘어 있고(surface / border-strong / on-primary),
// 그 의미를 유지하는 편이 화면 코드를 읽기 쉽게 만든다.

import 'package:flutter/material.dart';

import 'tokens.dart';

@immutable
class A11yColors extends ThemeExtension<A11yColors> {
  const A11yColors({required this.palette, required this.mode});

  final A11yPalette palette;
  final ContrastMode mode;

  @override
  A11yColors copyWith({A11yPalette? palette, ContrastMode? mode}) =>
      A11yColors(palette: palette ?? this.palette, mode: mode ?? this.mode);

  /// 팔레트 사이를 보간하지 않는다.
  ///
  /// 대비 프리셋은 연속적인 값이 아니라 셋 중 하나다. 전환 중간 프레임의 색은
  /// 어느 프리셋의 대비 보장도 받지 못하므로, 절반을 지나면 즉시 목표 팔레트로 넘어간다.
  @override
  A11yColors lerp(ThemeExtension<A11yColors>? other, double t) {
    if (other is! A11yColors) return this;
    return t < 0.5 ? this : other;
  }
}

extension A11yContext on BuildContext {
  /// 현재 팔레트. 화면 코드는 색을 하드코딩하지 않고 항상 이걸 거친다.
  A11yPalette get colors {
    final ext = Theme.of(this).extension<A11yColors>();
    // 테마에 확장이 안 붙은 트리(테스트에서 위젯을 단독으로 pump하는 경우 등)에서도
    // 색이 없어 죽지 않게 표준 팔레트로 떨어진다.
    return ext?.palette ?? standardPalette;
  }

  ContrastMode get contrastMode =>
      Theme.of(this).extension<A11yColors>()?.mode ?? ContrastMode.standard;
}

/// 프리셋과 글꼴·글자 크기로 ThemeData를 만든다.
///
/// [systemTextScale]은 Windows 접근성 설정(레지스트리 TextScaleFactor)에서 온 배율이다.
/// 앱 설정과 **곱한 뒤 상한을 둔다** — 사용자가 시스템 배율을 켠 데는 이유가 있으니 곱하고,
/// 1280×800에서 2.6배를 넘으면 화면에 아무것도 안 남으므로 자른다.
ThemeData buildA11yTheme({
  required ContrastMode contrast,
  required FontSizeStep fontSize,
  String? fontFamily,
}) {
  final palette = palettes[contrast]!;

  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    scaffoldBackgroundColor: palette.bg,
    canvasColor: palette.bg,
    fontFamily: fontFamily,
    // Material 컴포넌트를 거의 쓰지 않지만, 쓰이는 곳에서 색이 튀지 않게 최소한 맞춰 둔다.
    colorScheme: ColorScheme.dark(
      surface: palette.surface,
      onSurface: palette.text,
      primary: palette.primaryBorder,
      onPrimary: palette.onPrimary,
      error: palette.negative,
      outline: palette.border,
    ),
    extensions: [A11yColors(palette: palette, mode: contrast)],
  );
}

/// 앱 글자 크기와 시스템 배율을 합쳐 최종 배율을 낸다.
///
/// 상한 2.6은 임의값이 아니라 최소 창(960×640)에서 본문·조작 요소가 함께 살아남는 한계다.
/// 상한에 걸렸다는 사실은 설정 화면이 사용자에게 알려야 한다 —
/// 그래야 "크게 해 뒀는데 왜 더 안 커지지"가 설명된다.
const double maxTextScale = 2.6;

double effectiveTextScale({
  required FontSizeStep step,
  required double systemScale,
}) {
  final appScale = step.basePx / 16.0;
  final combined = appScale * systemScale;
  return combined.clamp(1.0, maxTextScale);
}

/// 상한에 걸렸는가. 설정 화면이 이유를 텍스트로 보여줄 때 쓴다.
bool isTextScaleClamped({
  required FontSizeStep step,
  required double systemScale,
}) =>
    (step.basePx / 16.0) * systemScale > maxTextScale;
