// lib/a11y/tokens.dart — SVIL 저시력 디자인 토큰.
//
// 웹판 src/styles/tokens.css에서 hex를 **한 글자도 바꾸지 않고** 옮겼다.
// 값을 알고리즘으로 유도하지 않는다("표준을 X만큼 어둡게" 같은 식). 각 팔레트는
// 실제 사용자 반응으로 조정된 결과라, 유도하는 순간 그 의도가 소실된다.
//
// 특히 soft 프리셋은 본문 대비를 13.66:1로 **일부러 낮춘 것**이다.
// 난시·난독증 사용자는 밝은 글자가 번져 보여 오히려 대비가 낮은 쪽이 편하다.
// "대비는 높을수록 좋다"고 판단해 올리면 그 사용자들을 잃는다.

import 'dart:ui' show Color;

/// 대비 프리셋. 웹판 ContrastMode와 같은 값이다.
enum ContrastMode {
  /// 표준 다크.
  standard,

  /// 초고대비 — 순수 검정 바탕에 흰/노랑. 잔여 색조까지 걷어낸다.
  /// Windows 고대비 모드가 켜지면 이 프리셋으로 강제 전환한다.
  max,

  /// 저글레어 소프트 다크 — 대비를 의도적으로 낮춘다(위 주석 참고).
  soft,
}

/// 글자 크기 5단계. 값은 논리 픽셀 기준 본문 크기다.
enum FontSizeStep { xs, sm, md, lg, xl }

extension FontSizeStepValue on FontSizeStep {
  /// 웹판 --font-size-base와 같은 값.
  double get basePx => switch (this) {
        FontSizeStep.xs => 16,
        FontSizeStep.sm => 18,
        FontSizeStep.md => 20,
        FontSizeStep.lg => 24,
        FontSizeStep.xl => 28,
      };

  /// 설정에 저장하는 id. 웹판 값과 같아야 백업·설정 이관이 성립한다.
  String get id => name;
}

/// 색 팔레트 한 벌. 이름은 tokens.css의 CSS 변수와 1:1로 맞춘다.
class A11yPalette {
  const A11yPalette({
    required this.bg,
    required this.bgGlow,
    required this.surface,
    required this.surface2,
    required this.border,
    required this.borderStrong,
    required this.text,
    required this.textSub,
    required this.accent,
    required this.accentStrong,
    required this.accentMax,
    required this.positive,
    required this.warning,
    required this.negative,
    required this.focus,
    required this.yellow,
    required this.primarySurface,
    required this.primarySurfaceHover,
    required this.primaryBorder,
    required this.onPrimary,
  });

  final Color bg;
  final Color bgGlow;
  final Color surface;
  final Color surface2;
  final Color border;
  final Color borderStrong;
  final Color text;
  final Color textSub;
  final Color accent;
  final Color accentStrong;
  final Color accentMax;
  final Color positive;
  final Color warning;
  final Color negative;
  final Color focus;
  final Color yellow;

  /// 강조(primary) 계열 — 짙은 회색 바탕 + 흰 테두리 + 흰 글자.
  ///
  /// 저시력 사용자에게 어두운 화면 속 '밝은 바탕 버튼'은 헤일레이션(번짐)을 일으킨다.
  /// 그래서 밝은 색은 글자·테두리에만 쓰고 넓은 면적을 채우지 않는다.
  /// 이 원칙이 무너졌는지는 대비율이 아니라 '휘도 점프'로만 잡힌다 — contrast_test.dart 참고.
  final Color primarySurface;
  final Color primarySurfaceHover;
  final Color primaryBorder;
  final Color onPrimary;
}

/// 표준 다크. tokens.css `:root`
const A11yPalette standardPalette = A11yPalette(
  bg: Color(0xFF0D0D12),
  bgGlow: Color(0xFF1A1A2E),
  surface: Color(0xFF16161D),
  surface2: Color(0xFF1F1F2A),
  border: Color(0xFF3A3A48),
  borderStrong: Color(0xFF6B6B82),
  text: Color(0xFFF5F5F7),
  textSub: Color(0xFFC9C9D4),
  accent: Color(0xFF7EC8FF),
  accentStrong: Color(0xFFB3DDFF),
  accentMax: Color(0xFFD6ECFF),
  positive: Color(0xFF7EE2A8),
  warning: Color(0xFFFFD479),
  negative: Color(0xFFFF9B9B),
  focus: Color(0xFFFFD479),
  yellow: Color(0xFFFFD94A),
  primarySurface: Color(0xFF303038),
  primarySurfaceHover: Color(0xFF3D3D47),
  primaryBorder: Color(0xFFFFFFFF),
  onPrimary: Color(0xFFFFFFFF),
);

/// 초고대비. tokens.css `[data-contrast='max']`
const A11yPalette maxPalette = A11yPalette(
  bg: Color(0xFF000000),
  bgGlow: Color(0xFF000000),
  surface: Color(0xFF0A0A0A),
  surface2: Color(0xFF141414),
  border: Color(0xFF767676),
  borderStrong: Color(0xFFB0B0B0),
  text: Color(0xFFFFFFFF),
  textSub: Color(0xFFE6E6E6),
  accent: Color(0xFF9AD8FF),
  accentStrong: Color(0xFFCFEAFF),
  accentMax: Color(0xFFFFFFFF),
  positive: Color(0xFF7DFF9F),
  warning: Color(0xFFFFD400),
  negative: Color(0xFFFF8F8F),
  focus: Color(0xFFFFD400),
  yellow: Color(0xFFFFD400),
  primarySurface: Color(0xFF242424),
  primarySurfaceHover: Color(0xFF333333),
  primaryBorder: Color(0xFFFFFFFF),
  onPrimary: Color(0xFFFFFFFF),
);

/// 저글레어 소프트 다크. tokens.css `[data-contrast='soft']`
const A11yPalette softPalette = A11yPalette(
  bg: Color(0xFF12121A),
  bgGlow: Color(0xFF191926),
  surface: Color(0xFF1B1B25),
  surface2: Color(0xFF23232F),
  border: Color(0xFF4A4A58),
  borderStrong: Color(0xFF7B7B8E),
  text: Color(0xFFDCDCE4),
  textSub: Color(0xFFB6B6C2),
  accent: Color(0xFF86BFE8),
  accentStrong: Color(0xFFA9D3F0),
  accentMax: Color(0xFFC8E4F8),
  // tokens.css에 `#86ceA0`으로 대소문자가 섞여 있으나 같은 값이다.
  positive: Color(0xFF86CEA0),
  warning: Color(0xFFE0C072),
  negative: Color(0xFFE59595),
  focus: Color(0xFFE8C968),
  yellow: Color(0xFFE8C968),
  primarySurface: Color(0xFF2E2E38),
  primarySurfaceHover: Color(0xFF393945),
  primaryBorder: Color(0xFFDCDCE4),
  onPrimary: Color(0xFFDCDCE4),
);

const Map<ContrastMode, A11yPalette> palettes = {
  ContrastMode.standard: standardPalette,
  ContrastMode.max: maxPalette,
  ContrastMode.soft: softPalette,
};

/// 스케일되지 않는 치수.
///
/// 이것들은 시각이 아니라 **운동·렌더링 어포던스**라 글자 크기와 함께 커지면 안 된다.
/// WCAG 2.5.5는 터치 타겟의 하한을 요구하지 글자 크기 비례를 요구하지 않는다.
/// xl(28px) 사용자의 버튼이 87lp가 되면 900 높이 창에서 내용이 밀려난다.
class A11yMetrics {
  const A11yMetrics._();

  /// 터치 타겟 최소 높이. tokens.css `--touch-min`.
  /// Material 기본값(48)보다 크므로 반드시 이 상수를 쓴다.
  static const double touchMin = 50;

  static const double radius = 12;
  static const double radiusLarge = 16;

  /// 포커스 링 두께와 간격. tokens.css `outline: 4px` / `outline-offset: 3px`.
  ///
  /// 간격은 장식이 아니라 필수다 — 노랑 링과 흰 테두리의 대비가 1.41:1이라
  /// 사이에 어두운 틈이 없으면 두 선이 한 덩어리로 보여 포커스를 놓친다.
  static const double focusRingWidth = 4;
  static const double focusRingOffset = 3;

  static const double borderThin = 1;
  static const double border = 2;
  static const double borderThick = 3;
}
