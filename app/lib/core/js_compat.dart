// lib/core/js_compat.dart — JS와 Dart가 조용히 다른 지점을 한곳에 모은다.
//
// 웹판 로직을 Dart로 옮길 때 컴파일도 되고 예외도 안 나는데 **답만 다른** 구문들이 있다.
// 날짜·역법·수리 계산 2,400줄에서 이런 차이는 잘못된 월주나 영원히 복습에 안 뜨는 카드로
// 나타날 뿐 아무 신호도 주지 않는다.
//
// 실측(Node 24 / Dart 3.12):
//   JS   -1 % 5 === -1        Dart  (-1) % 5 == 4
//   JS   Math.round(-0.5) === -0    Dart  (-0.5).round() == -1
//   JS   toISOString()은 항상 UTC(Z)
//   Dart toIso8601String()은 로컬 DateTime이면 Z를 안 붙인다
//
// 포팅한 코드는 원본과 같은 답을 내야 하므로, 원본이 JS 의미론에 기대는 곳에서는
// 여기 있는 함수를 쓴다. test/core/js_compat_test.dart가 차이를 계속 감시한다.

/// JS의 `%`. 부호가 **피제수**를 따른다.
///
/// Dart의 `%`는 항상 음이 아닌 값을 준다(유클리드). 절기·월주 계산은 음수가 될 수 있는
/// 오프셋의 모듈러 연산으로 가득해서, 그대로 두면 경계에서 한 칸씩 어긋난다.
int jsRemainder(int a, int b) => a.remainder(b);

/// 간지·순환 인덱스용 '항상 0 이상' 나머지.
///
/// 원본 TS가 `((n % 60) + 60) % 60` 처럼 직접 보정해 둔 곳은 이걸 쓴다.
/// 의도가 '순환 인덱스'임을 이름으로 드러내려는 것이다.
int cyclicIndex(int value, int modulus) {
  final r = value % modulus;
  return r < 0 ? r + modulus : r;
}

/// JS의 `Math.round`. 반값을 **양의 무한대 방향**으로 올린다.
///
/// Dart의 `round()`는 0에서 멀어지는 방향이라 음수 반값에서 갈린다.
/// (JS: -0.5 → -0 / Dart: -0.5 → -1)
int jsRound(double v) => (v).floor() == v ? v.toInt() : (v + 0.5).floor();

/// 저장·비교용 ISO 문자열. **항상 UTC(Z)**.
///
/// SRS의 `dueAt <= now` 비교는 '사전순 = 시간순'에 의존한다.
/// 로컬 시각 문자열이 섞이면 길이와 오프셋 표기가 달라져 비교가 통째로 무너진다.
/// DateTime을 문자열로 만드는 모든 경로는 반드시 이 함수를 거친다.
String isoOf(DateTime t) => t.toUtc().toIso8601String();

/// 오늘 날짜 키(YYYY-MM-DD). 로컬 기준이다 — '오늘의 한 장'은 사용자의 하루를 따른다.
String dateKeyOf(DateTime local) {
  String two(int n) => n.toString().padLeft(2, '0');
  return '${local.year}-${two(local.month)}-${two(local.day)}';
}
