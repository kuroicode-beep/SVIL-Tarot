// lib/core/lunar.dart — 한국 음력 ↔ 양력 변환 (1900~2100 압축 테이블, 완전 오프라인).
//
// 웹판 src/lib/lunar.ts를 옮겼다. 표는 그대로 가져온다 — 이 표는 천문 계산으로 직접
// 만들고 73,384일 왕복 검사로 검증한 결과라, 다시 계산할 이유가 없다.
//
// ── 이 표는 "한국" 음력이다 (중요) ──
// 인터넷에 널리 도는 1900~2100 음력 테이블은 대부분 중국 농력(UTC+8 기준)이다.
// 한국 음력은 한국 표준시로 삭(朔)이 든 날을 초하루로 잡아, 삭이 KST 자정 직후에 들면
// 중국보다 하루 늦어진다. 2,485개 달 중 92개가 갈리고 윤달 배치가 다른 해도 있다
// (2012 한국 윤3월 / 중국 윤4월, 2017 한국 윤5월 / 중국 윤6월).
// 대표 사례: 1997년 정월 삭 = 2월 8일 00:06 KST → 한국 설날 2/8, 중국 춘절 2/7.
//
// 나눗셈에 대하여
//   JS의 Math.floor(a/b)와 Dart의 a ~/ b는 **음수에서 다르다**(내림 vs 0 방향 절삭).
//   아래 식들은 전부 피제수가 양수임을 확인하고 옮겼다(Fliegel–Van Flandern이
//   4800년을 더해 쓰는 이유가 정확히 그것이다). 새 식을 넣을 때는 부호를 먼저 확인할 것.

/// 지원 범위. 화면이 안내 문구에 쓴다.
const int lunarMinYear = 1900;
const int lunarMaxYear = 2100;

class LunarDate {
  const LunarDate({
    required this.year,
    required this.month,
    required this.day,
    this.isLeapMonth = false,
  });

  final int year;
  final int month;
  final int day;
  final bool isLeapMonth;

  @override
  bool operator ==(Object other) =>
      other is LunarDate &&
      other.year == year &&
      other.month == month &&
      other.day == day &&
      other.isLeapMonth == isLeapMonth;

  @override
  int get hashCode => Object.hash(year, month, day, isLeapMonth);

  @override
  String toString() => '$year-$month-$day${isLeapMonth ? '(윤)' : ''}';
}

class SolarDate {
  const SolarDate(this.year, this.month, this.day);

  final int year;
  final int month;
  final int day;

  @override
  bool operator ==(Object other) =>
      other is SolarDate && other.year == year && other.month == month && other.day == day;

  @override
  int get hashCode => Object.hash(year, month, day);

  @override
  String toString() => '$year-$month-$day';
}

/// 음력 1년치를 32비트 정수 하나에 담은 표(1900~2100, 201개).
///
///   0x0000F (하위 4비트) : 윤달 위치. 0이면 윤달 없음, 1~12면 그 달 뒤에 윤달이 붙는다.
///   0x0FFF0 (12비트)     : 1~12월 대소월. 0x8000이 1월, 0x0010이 12월. 서면 30일.
///   0x10000 (17번째 비트): 윤달이 대월(30일)이면 1.
///
/// 기준일: 양력 1900-01-31 = 음력 1900-01-01.
const List<int> _lunarInfo = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054e5, 0x0d2a0, 0x0e950, 0x16554, 0x056a0, 0x0aad0, 0x055d2, // 1900-1909
  0x04ae0, 0x0a5d6, 0x0a4d0, 0x0d250, 0x0da95, 0x0b550, 0x056a0, 0x0ada2, 0x095d0, 0x04bb7, // 1910-1919
  0x049b0, 0x0a4b0, 0x0b4b5, 0x06a90, 0x0ad40, 0x0bb54, 0x02b60, 0x095b0, 0x05372, 0x04970, // 1920-1929
  0x06566, 0x0e4a0, 0x0ea50, 0x16a95, 0x05b50, 0x02b60, 0x18ae3, 0x092e0, 0x1c8d7, 0x0c950, // 1930-1939
  0x0d4a0, 0x1d8a6, 0x0b690, 0x056d0, 0x125b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0d557, // 1940-1949
  0x0b4a0, 0x0b550, 0x15555, 0x04db0, 0x025b0, 0x18573, 0x052b0, 0x0a9b8, 0x06950, 0x06aa0, // 1950-1959
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05270, 0x07263, 0x0d950, 0x06b57, 0x056a0, // 1960-1969
  0x09ad0, 0x04dd5, 0x04ae0, 0x0a4e0, 0x0d4d4, 0x0d250, 0x0d598, 0x0b540, 0x0d6a0, 0x195a6, // 1970-1979
  0x095b0, 0x049b0, 0x0a9b4, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0b756, 0x02b60, 0x095b0, // 1980-1989
  0x04b75, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06d98, 0x05ad0, 0x02b60, 0x096e5, 0x092e0, // 1990-1999
  0x0c960, 0x0e954, 0x0d4a0, 0x0da50, 0x07552, 0x056c0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5, // 2000-2009
  0x0a950, 0x0b4a0, 0x1b4a3, 0x0b550, 0x055d9, 0x04ba0, 0x0a5b0, 0x05575, 0x052b0, 0x0a950, // 2010-2019
  0x0b954, 0x06aa0, 0x0ad50, 0x06b52, 0x04b60, 0x0a6e6, 0x0a570, 0x05270, 0x06a65, 0x0d930, // 2020-2029
  0x05aa0, 0x0b6a3, 0x096d0, 0x04afb, 0x04ae0, 0x0a4d0, 0x1d0d6, 0x0d250, 0x0d520, 0x0dd45, // 2030-2039
  0x0b6a0, 0x096d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0b250, 0x1b255, 0x06d40, 0x0ada0, // 2040-2049
  0x18b63, 0x09570, 0x14978, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1aac4, 0x0ab60, // 2050-2059
  0x09370, 0x052e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0aad0, 0x095d4, // 2060-2069
  0x092d0, 0x0c9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0, // 2070-2079
  0x0b2b3, 0x0a930, 0x07557, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054f4, 0x05260, // 2080-2089
  0x0e968, 0x0d530, 0x05aa0, 0x1aaa6, 0x096d0, 0x04ae0, 0x0aad4, 0x0a4d0, 0x0d260, 0x0f253, // 2090-2099
  0x0d520, // 2100
];

/// 그레고리력 → JDN (Fliegel–Van Flandern). 4800년을 더해 음수 나눗셈을 없앤다.
int gregorianToJdn(int year, int month, int day) {
  final a = (14 - month) ~/ 12; // month는 1~12라 피제수가 항상 양수다
  final y = year + 4800 - a;
  final m = month + 12 * a - 3;
  return day +
      (153 * m + 2) ~/ 5 +
      365 * y +
      y ~/ 4 -
      y ~/ 100 +
      y ~/ 400 -
      32045;
}

/// JDN → 그레고리력.
SolarDate jdnToGregorian(int jdn) {
  final a = jdn + 32044;
  final b = (4 * a + 3) ~/ 146097;
  final c = a - (146097 * b) ~/ 4;
  final d = (4 * c + 3) ~/ 1461;
  final e = c - (1461 * d) ~/ 4;
  final m = (5 * e + 2) ~/ 153;
  return SolarDate(
    100 * b + d - 4800 + m ~/ 10,
    m + 3 - 12 * (m ~/ 10),
    e - (153 * m + 2) ~/ 5 + 1,
  );
}

int _leapMonthOf(int year) => _lunarInfo[year - lunarMinYear] & 0xf;

int _leapMonthDays(int year) {
  if (_leapMonthOf(year) == 0) return 0;
  return (_lunarInfo[year - lunarMinYear] & 0x10000) != 0 ? 30 : 29;
}

/// 평달의 일수. 0x8000이 1월이라 (0x10000 >> month)로 비트를 집는다.
int _normalMonthDays(int year, int month) =>
    (_lunarInfo[year - lunarMinYear] & (0x10000 >> month)) != 0 ? 30 : 29;

int _lunarYearDays(int year) {
  var sum = 0;
  for (var m = 1; m <= 12; m++) {
    sum += _normalMonthDays(year, m);
  }
  return sum + _leapMonthDays(year);
}

/// 기준일 1900-01-31의 JDN. Date 객체를 쓰지 않는다 — 표준시에 따라 하루가 밀 수 있다.
final int _epochJdn = gregorianToJdn(1900, 1, 31);

/// 연도별 누적 일수. 201개뿐이라 한 번 만들어 두면 변환이 O(1)에 가깝다.
final List<int> _yearOffset = () {
  final acc = <int>[];
  var sum = 0;
  for (var y = lunarMinYear; y <= lunarMaxYear; y++) {
    acc.add(sum);
    sum += _lunarYearDays(y);
  }
  acc.add(sum); // 표 끝 다음 위치
  return acc;
}();

/// 표가 덮는 마지막 양력 날짜의 JDN.
final int _maxJdn = _epochJdn + _yearOffset[lunarMaxYear - lunarMinYear + 1] - 1;

/// 음력 → 양력. 표 밖이거나 존재하지 않는 날짜면 null.
SolarDate? lunarToSolar(LunarDate d) {
  final year = d.year;
  final month = d.month;
  final day = d.day;
  final wantLeap = d.isLeapMonth;

  if (year < lunarMinYear || year > lunarMaxYear) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 30) return null;

  final leap = _leapMonthOf(year);
  // 윤달을 달라고 했는데 그 해에 그 윤달이 없으면 존재하지 않는 날짜다.
  if (wantLeap && leap != month) return null;

  final size = wantLeap ? _leapMonthDays(year) : _normalMonthDays(year, month);
  // 29일까지인 달의 30일 같은 없는 날은 조용히 밀지 않고 실패로 돌려준다.
  if (day > size) return null;

  var offset = _yearOffset[year - lunarMinYear];
  for (var m = 1; m < month; m++) {
    offset += _normalMonthDays(year, m);
    // 윤달은 같은 번호의 평달 '뒤'에 오므로 m월을 지날 때 함께 더한다.
    if (leap == m) offset += _leapMonthDays(year);
  }
  if (wantLeap) offset += _normalMonthDays(year, month);
  offset += day - 1;

  return jdnToGregorian(_epochJdn + offset);
}

/// 양력 → 음력. 화면에 "음력 O월 O일"을 되비쳐 줄 때 쓴다.
LunarDate? solarToLunar(int year, int month, int day) {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  final jdn = gregorianToJdn(year, month, day);
  // 2월 30일처럼 없는 날은 JDN 왕복에서 다른 날짜로 되돌아온다 — 그걸로 걸러낸다.
  final back = jdnToGregorian(jdn);
  if (back.year != year || back.month != month || back.day != day) return null;
  if (jdn < _epochJdn || jdn > _maxJdn) return null;

  var offset = jdn - _epochJdn;

  var ly = lunarMaxYear;
  for (var y = lunarMinYear; y <= lunarMaxYear; y++) {
    if (_yearOffset[y - lunarMinYear + 1] > offset) {
      ly = y;
      break;
    }
  }
  offset -= _yearOffset[ly - lunarMinYear];

  final leap = _leapMonthOf(ly);
  for (var m = 1; m <= 12; m++) {
    final nd = _normalMonthDays(ly, m);
    if (offset < nd) {
      return LunarDate(year: ly, month: m, day: offset + 1);
    }
    offset -= nd;
    if (leap == m) {
      final ld = _leapMonthDays(ly);
      if (offset < ld) {
        return LunarDate(year: ly, month: m, day: offset + 1, isLeapMonth: true);
      }
      offset -= ld;
    }
  }
  return null;
}

/// 그 해에 윤달이 있으면 몇 월인지. 없으면 0.
int leapMonthOfYear(int year) {
  if (year < lunarMinYear || year > lunarMaxYear) return 0;
  return _leapMonthOf(year);
}

/// 그 음력 달의 일수(29 또는 30). 표 밖이거나 없는 윤달이면 0.
int lunarMonthLength(int year, int month, {bool isLeapMonth = false}) {
  if (year < lunarMinYear || year > lunarMaxYear) return 0;
  if (month < 1 || month > 12) return 0;
  if (isLeapMonth) return _leapMonthOf(year) == month ? _leapMonthDays(year) : 0;
  return _normalMonthDays(year, month);
}
