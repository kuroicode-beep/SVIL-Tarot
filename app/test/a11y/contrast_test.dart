// test/a11y/contrast_test.dart — 팔레트 접근성 회귀 게이트.
//
// 웹판 scripts/check-contrast.mjs를 옮긴 것이다. CSS 파서는 옮기지 않았다 —
// 토큰이 Dart const가 되면서 파싱 단계 자체가 사라졌고, 값을 직접 단언하는 편이 더 강하다.
//
// 이 파일에서 가장 값비싼 단언은 대비율이 아니라 '휘도 점프'다.
// 사고 기록: 구판 팔레트는 WCAG 대비 14.70:1로 AAA를 통과하면서도 저시력 사용자에게
// 읽히지 않았다. 원인은 대비 부족이 아니라 어두운 화면 속 넓은 밝은 면적의 눈부심이었다.
// 기성 린터와 대비 검사는 이 축을 보지 않는다. 그래서 "대비는 이미 검사하니 중복"이라며
// 이 검사를 지우면 같은 사고가 그대로 재발한다.

import 'dart:math' as math;
import 'dart:ui' show Color;

import 'package:flutter_test/flutter_test.dart';
import 'package:svil_tarot/a11y/tokens.dart';

/// sRGB 채널 선형화. WCAG 2.x 정의 그대로(0.04045 / 12.92 / 2.4).
double _lin(int channel) {
  final c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : math.pow((c + 0.055) / 1.055, 2.4).toDouble();
}

double luminance(Color c) {
  // Flutter 3.27+ 의 Color는 채널이 double(0~1)이다. 8비트로 되돌려 WCAG 식에 넣는다.
  final r = (c.r * 255).round();
  final g = (c.g * 255).round();
  final b = (c.b * 255).round();
  return 0.2126 * _lin(r) + 0.7152 * _lin(g) + 0.0722 * _lin(b);
}

double contrast(Color a, Color b) {
  final x = luminance(a);
  final y = luminance(b);
  final hi = x > y ? x : y;
  final lo = x > y ? y : x;
  return (hi + 0.05) / (lo + 0.05);
}

/// 페이지 배경 대비 밝기 점프. 넓은 면적에서 눈부심을 만드는 축이다.
double jump(Color surface, Color bg) =>
    (luminance(surface) + 0.05) / (luminance(bg) + 0.05);

const double aaa = 7;
const double nonText = 3;
const double maxJump = 2;

void main() {
  const presets = {
    '표준': standardPalette,
    '초고대비': maxPalette,
    '소프트': softPalette,
  };

  presets.forEach((name, p) {
    group(name, () {
      test('본문 대비 AAA', () {
        expect(contrast(p.text, p.bg), greaterThanOrEqualTo(aaa));
      });
      test('보조 텍스트 대비 AAA', () {
        expect(contrast(p.textSub, p.bg), greaterThanOrEqualTo(aaa));
      });
      test('강조 버튼 글자 대비 AAA', () {
        expect(contrast(p.onPrimary, p.primarySurface), greaterThanOrEqualTo(aaa));
      });
      test('버튼 테두리 vs 배경', () {
        expect(contrast(p.primaryBorder, p.bg), greaterThanOrEqualTo(nonText));
      });
      test('조작 경계선 vs 패널', () {
        expect(contrast(p.borderStrong, p.surface), greaterThanOrEqualTo(nonText));
      });
      test('오류 텍스트 대비 AAA', () {
        expect(contrast(p.negative, p.surface), greaterThanOrEqualTo(aaa));
      });
      test('긍정 텍스트 대비 AAA', () {
        expect(contrast(p.positive, p.surface), greaterThanOrEqualTo(aaa));
      });
      test('포커스 링 vs 배경', () {
        expect(contrast(p.focus, p.bg), greaterThanOrEqualTo(nonText));
      });

      test('강조 버튼 밝기 점프 ≤2배 — 대비 14.70:1로 AAA를 통과하고도 안 읽혔던 사고의 지표', () {
        // 이 단언이 이 파일의 존재 이유다. 대비 검사와 중복이 아니다.
        expect(jump(p.primarySurface, p.bg), lessThanOrEqualTo(maxJump));
      });

      test('포커스 링이 버튼 테두리와 붙으면 간격이 있어야 한다', () {
        // 노랑 링과 흰 테두리는 대비가 1.41:1이라 맞붙으면 한 덩어리로 보인다.
        // CSS는 outline-offset으로 해결했다. Flutter에는 그 속성이 없으므로
        // 상수로 간격을 보장하고 여기서 그 사실을 강제한다.
        if (contrast(p.focus, p.primaryBorder) < nonText) {
          expect(A11yMetrics.focusRingOffset, greaterThanOrEqualTo(1),
              reason: '포커스 링과 버튼 테두리가 붙는 팔레트인데 간격이 0이다');
        }
      });
    });
  });

  group('소프트 프리셋의 의도', () {
    test('표준보다 본문 대비가 낮다 — 난시 배려로 일부러 낮춘 것이다', () {
      // "대비는 높을수록 좋다"고 판단해 올리는 회귀를 막는다.
      final soft = contrast(softPalette.text, softPalette.bg);
      final std = contrast(standardPalette.text, standardPalette.bg);
      expect(soft, lessThan(std));
      // 그래도 AAA(7:1)는 유지해야 한다.
      expect(soft, greaterThanOrEqualTo(aaa));
    });
  });

  group('치수 상수', () {
    test('터치 타겟이 Material 기본(48)보다 크다', () {
      // SVIL 기준은 50이다. Material 기본값으로 조용히 되돌아가는 것을 막는다.
      expect(A11yMetrics.touchMin, greaterThanOrEqualTo(50));
    });

    test('포커스 링에 두께와 간격이 둘 다 있다', () {
      expect(A11yMetrics.focusRingWidth, greaterThanOrEqualTo(3));
      expect(A11yMetrics.focusRingOffset, greaterThanOrEqualTo(1));
    });
  });
}
