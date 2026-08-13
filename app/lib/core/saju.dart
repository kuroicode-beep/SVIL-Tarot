// lib/core/saju.dart — 간이 만세력 (전문 엔진 아님 — AI 풀이 보조 요약용).
//
// 웹판 src/lib/sajuName.ts를 옮겼다. test/core/saju_test.dart가
// TypeScript를 실제로 실행해 뽑은 1,116건과 대조한다.
//
// 이 파일에서 조심할 것
//   - mod()는 **항상 0 이상**을 준다(JS의 %와 다르다). 간지는 순환 인덱스라 이게 맞다.
//   - 일주는 Date 산술이 아니라 UTC 기준 일수 차로 센다. 로컬 시각을 쓰면 표준시에 따라 하루가 민다.

import 'lunar.dart';

const List<String> _stems = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
const List<String> _branches = [
  '자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해',
];
const List<String> _stemElem = ['목', '목', '화', '화', '토', '토', '금', '금', '수', '수'];
const List<String> _branchElem = [
  '수', '토', '목', '목', '토', '화', '화', '토', '금', '금', '토', '수',
];

/// 경고는 화면마다 언어가 달라야 하므로 텍스트 대신 i18n 키만 넘긴다.
class SajuWarn {
  const SajuWarn._();
  static const lunarConverted = 'saju_warn_lunar_converted';
  static const lunarConvertFailed = 'saju_warn_lunar_convert_failed';
  static const hourMissing = 'saju_warn_hour_missing';
  static const solarTermBoundary = 'saju_warn_solar_term_boundary';
  static const monthTermBoundary = 'saju_warn_month_term_boundary';
  static const lateZiHour = 'saju_warn_late_zi_hour';
}

const int _termStartYear = 1900;

/// 달(1~12)별 절입일 최솟값. 실제 일자 = base + offset.
const List<int> _termBaseDay = [5, 3, 5, 4, 5, 5, 6, 7, 7, 7, 7, 6];

/// 한 문자열이 한 절기의 1900~2060(161자)이고, 문자 하나가 그 해의 기준일 대비 오프셋(0~2)이다.
///
/// "기본 2/4 + 몇 해만 2/3" 식 근사는 1902~1984의 38개 해에서 연주를 한 해 앞당겨 틀린다.
/// 예: 1984-02-04는 실제 입춘(2/5 00:19 KST) 전이라 계해년인데 근사로는 갑자년이 된다.
const List<String> _termOffsets = [
  '11112111211121112111111111111111111111111111111111111111101110111011101110111011101110111001100110011001100110011001100110011000100010001000100010001000100010000', // 1월 소한 285°
  '11222122212221222112211221122112211221122112211221122111211121112111211121112111211121111111111111111111111111111111111110111011101110111011101110111011101110011', // 2월 입춘 315°
  '11121112111211121112111111111111111111111111111111111111011101110111011101110111011101110011001100110011001100110011001100010001000100010001000100010001000000000', // 3월 경칩 345°
  '11221122112211221112111211121112111211121112111211111111111111111111111111111111111101110111011101110111011101110111001100110011001100110011001100010001000100010', // 4월 청명 15°
  '11121112111211121111111111111111111111111111111101110111011101110111011101110111001100110011001100110011001100010001000100010001000100010001000000000000000000000', // 5월 입하 45°
  '11221122111211121112111211121112111211111111111111111111111111111111111101110111011101110111011101110011001100110011001100110011000100010001000100010001000100010', // 6월 망종 75°
  '22221222122212221222122212221222112211221122112211221122112211121112111211121112111211121111111111111111111111111111111111110111011101110111011101110111001100110', // 7월 소서 105°
  '11121112111211121111111111111111111111111111111111110111011101110111011101110111001100110011001100110011001100010001000100010001000100010001000000000000000000000', // 8월 입추 135°
  '11121112111211121112111211121112111111111111111111111111111111110111011101110111011101110111011100110011001100110011001100110001000100010001000100010001000100000', // 9월 백로 165°
  '22222222222222222222122212221222122212221222122212221122112211221122112211221122112211121112111211121112111211121111111111111111111111111111111111110111011101110', // 10월 한로 195°
  '11111111111111111111111111111111011101110111011101110111011101110111001100110011001100110011001100110001000100010001000100010001000100000000000000000000000000000', // 11월 입동 225°
  '12221222122212221222122211221122112211221122112211221122111211121112111211121112111211121111111111111111111111111111111111111111011101110111011101110111011101110', // 12월 대설 255°
];

/// 해당 연·월의 절입일(KST). 표 밖의 해·잘못된 달은 근거가 없어 최빈 오프셋 +1로 둔다.
int solarTermDay(int year, int month) {
  if (month < 1 || month > 12) return 6;
  final base = _termBaseDay[month - 1];
  final row = _termOffsets[month - 1];
  final idx = year - _termStartYear;
  if (idx < 0 || idx >= row.length) return base + 1;
  final ch = row[idx];
  return base + (int.tryParse(ch) ?? 1);
}

/// 연주 경계는 2월 절기인 입춘이다.
int lichunDay(int year) => solarTermDay(year, 2);

/// 항상 0 이상인 나머지. 간지는 순환 인덱스라 이게 맞다.
int _mod(int n, int m) {
  final r = n % m;
  return r < 0 ? r + m : r;
}

/// 날짜 파싱이 깨졌는지.
///
/// birthDate가 ''이거나 '-03-15'처럼 연도가 비면 JS에서 Number('')가 0이 되어
/// 정수 검사를 통과했다. 그러면 월주·일주는 '—'인데 연주만 0년 간지가 찍히는 반쪽 결과가 나온다.
bool isValidYear(int? year) => year != null && year >= 1;

class Pillar {
  const Pillar({
    required this.ganji,
    required this.stem,
    required this.branch,
    this.element = '',
    this.boundary = false,
    this.note = '',
    this.stemIdx = -1,
    this.branchIdx = -1,
  });

  final String ganji;
  final String stem;
  final String branch;
  final String element;
  final bool boundary;
  final String note;
  final int stemIdx;
  final int branchIdx;
}

/// 연주는 1/1이 아니라 입춘에 바뀐다. 입춘 이전 출생은 전년도 간지를 쓴다.
Pillar yearPillar(int? year, [int? month, int? day]) {
  if (!isValidYear(year)) {
    return const Pillar(ganji: '—', stem: '', branch: '', note: '날짜 오류');
  }
  final y = year!;
  var effYear = y;
  var note = '';
  var boundary = false;

  // JS는 `if (month && day)` — 0도 falsy다. Dart에서는 null과 0을 함께 걸러야 같아진다.
  if (month != null && month != 0 && day != null && day != 0) {
    final lichun = lichunDay(y);
    // 1월 전체와 입춘 전 2월 초는 아직 전년도 간지다.
    if (month == 1 || (month == 2 && day < lichun)) effYear = y - 1;
    // 절입은 시각 단위라 경계 ±1일은 뒤집힐 수 있어 확인 요청을 남긴다.
    if (month == 2 && (day - lichun).abs() <= 1) {
      boundary = true;
      note = '입춘 경계라 실제 절입 시각 확인 필요';
    }
  }

  final stemIdx = _mod(effYear - 4, 10);
  final branchIdx = _mod(effYear - 4, 12);
  return Pillar(
    ganji: '${_stems[stemIdx]}${_branches[branchIdx]}',
    stem: _stems[stemIdx],
    branch: _branches[branchIdx],
    element: '${_stemElem[stemIdx]}·${_branchElem[branchIdx]}',
    boundary: boundary,
    note: note,
    stemIdx: stemIdx,
    branchIdx: branchIdx,
  );
}

/// 월주 — 절기월은 달의 1일이 아니라 그 달의 절(節) 절입일에 바뀐다.
Pillar monthPillarApprox(int? year, int? month, [int? day]) {
  if (!isValidYear(year) || month == null || month < 1 || month > 12) {
    return const Pillar(ganji: '—', stem: '', branch: '', note: '날짜 오류');
  }
  final y = year!;
  final termDay = solarTermDay(y, month);
  final hasDay = day != null && day != 0;
  final beforeTerm = hasDay && day < termDay;
  final m = beforeTerm ? (month == 1 ? 12 : month - 1) : month;
  final boundary = hasDay && (day - termDay).abs() <= 1;
  final beforeLichun = month == 1 || (month == 2 && hasDay && day < lichunDay(y));
  final baseYear = beforeLichun ? y - 1 : y;

  final yearStem = _mod(baseYear - 4, 10);
  final branchIdx = m % 12; // 2월→인(2), 12월→자(0), 1월→축(1)
  final startStem = const [2, 4, 6, 8, 0][yearStem % 5]; // 갑기년 병인두
  final order = _mod(m - 2, 12); // 인월을 0번째로
  final stemIdx = (startStem + order) % 10;

  return Pillar(
    ganji: '${_stems[stemIdx]}${_branches[branchIdx]}',
    stem: _stems[stemIdx],
    branch: _branches[branchIdx],
    boundary: boundary,
    note: boundary
        ? '12절기 절입일 반영 월주 — 절입 경계라 실제 절입 시각 확인 필요'
        : '12절기 절입일 반영 월주(절입 시각까지는 미반영, 참고용)',
    stemIdx: stemIdx,
    branchIdx: branchIdx,
  );
}

/// 일주 — 1900-01-01 = 갑술 기준 일수 가산(2000-01-01 무오로 검산).
Pillar dayPillarApprox(String isoDate) {
  final parts = isoDate.split('-');
  final y = parts.isNotEmpty ? int.tryParse(parts[0]) : null;
  final m = parts.length > 1 ? int.tryParse(parts[1]) : null;
  final d = parts.length > 2 ? int.tryParse(parts[2]) : null;
  // JS의 `if (!y || !m || !d)` — 0과 NaN을 함께 거른다.
  if (y == null || y == 0 || m == null || m == 0 || d == null || d == 0) {
    return const Pillar(ganji: '—', stem: '', branch: '', note: '날짜 오류');
  }

  // UTC 기준으로만 센다. 로컬을 쓰면 표준시에 따라 하루가 민다.
  final base = DateTime.utc(1900, 1, 1);
  final cur = DateTime.utc(y, m, d);
  final days = cur.difference(base).inDays;

  final stemIdx = _mod(days, 10); // 갑술 = 간0, 지10
  final branchIdx = _mod(10 + days, 12);
  return Pillar(
    ganji: '${_stems[stemIdx]}${_branches[branchIdx]}',
    stem: _stems[stemIdx],
    branch: _branches[branchIdx],
    note: '간이 일주(참고용, 전문 만세력과 다를 수 있음)',
    stemIdx: stemIdx,
    branchIdx: branchIdx,
  );
}

/// 시주 — 시두법: 갑기→갑자 / 을경→병자 / 병신→무자 / 정임→경자 / 무계→임자.
Pillar? hourPillarApprox(int dayStemIdx, int hour) {
  if (dayStemIdx < 0 || dayStemIdx > 9) return null;
  if (hour < 0 || hour > 23) return null;
  // 자시가 23시에 시작하므로 (시각+1)/2로 지지 칸을 만든다.
  final branchIdx = _mod(hour + 1, 24) ~/ 2;
  final startStem = const [0, 2, 4, 6, 8][dayStemIdx % 5];
  final stemIdx = (startStem + branchIdx) % 10;
  return Pillar(
    ganji: '${_stems[stemIdx]}${_branches[branchIdx]}',
    stem: _stems[stemIdx],
    branch: _branches[branchIdx],
    element: '${_stemElem[stemIdx]}·${_branchElem[branchIdx]}',
    note: '간이 시주(참고용, 지역 표준시·서머타임 미보정)',
    stemIdx: stemIdx,
    branchIdx: branchIdx,
  );
}

/// 'HH:MM' 형식만 시각으로 인정한다.
int? parseHour(String? birthTime) {
  if (birthTime == null || birthTime.isEmpty) return null;
  final match = RegExp(r'^(\d{1,2}):(\d{2})$').firstMatch(birthTime.trim());
  if (match == null) return null;
  final hh = int.parse(match.group(1)!);
  final mm = int.parse(match.group(2)!);
  // 저장된 고객 레코드 등 input[type=time]을 안 거친 값이 들어올 수 있어 분까지 본다.
  if (hh > 23 || mm > 59) return null;
  return hh;
}

/// 야자시(23시 이후)는 일주가 다음 날로 넘어간다.
String _shiftIsoDate(String isoDate, int days) {
  final parts = isoDate.split('-');
  final y = parts.isNotEmpty ? int.tryParse(parts[0]) : null;
  final m = parts.length > 1 ? int.tryParse(parts[1]) : null;
  final d = parts.length > 2 ? int.tryParse(parts[2]) : null;
  if (y == null || y == 0 || m == null || m == 0 || d == null || d == 0) return isoDate;
  final dt = DateTime.utc(y, m, d).add(Duration(days: days));
  return _toIsoDate(dt.year, dt.month, dt.day);
}

String _toIsoDate(int year, int month, int day) {
  String two(int n) => n.toString().padLeft(2, '0');
  return '$year-${two(month)}-${two(day)}';
}

class SajuSummary {
  const SajuSummary({
    required this.birthDate,
    required this.birthTime,
    required this.gender,
    required this.calendarType,
    required this.year,
    required this.month,
    required this.day,
    required this.warnings,
    required this.textBlock,
    this.solarDate,
    this.lunarDate,
    this.isLeapMonth,
    this.lunarConverted,
    this.hour,
  });

  final String birthDate;
  final String birthTime;
  final String gender;
  final String calendarType;

  /// 간지 계산에 실제로 쓴 양력 날짜. 환산 실패면 null.
  final String? solarDate;
  final String? lunarDate;
  final bool? isLeapMonth;
  final bool? lunarConverted;

  final Pillar year;
  final Pillar month;
  final Pillar day;
  final Pillar? hour;

  /// 화면이 t()로 띄울 i18n 키 목록.
  final List<String> warnings;

  /// LLM 프롬프트용 한국어 평문. 화면에 그대로 뿌리지 않는다.
  final String textBlock;
}

SajuSummary buildSajuSummary({
  required String birthDate,
  String? birthTime,
  String? gender,
  String? calendarType,
  bool isLeapMonth = false,
}) {
  final hour = parseHour(birthTime);
  final isLunar = calendarType == 'lunar';
  final isLeap = isLunar && isLeapMonth;

  // 간지는 전부 양력 기준 공식이라, 음력 입력은 반드시 먼저 양력으로 환산해야 한다.
  String? solarDate = birthDate;
  if (isLunar) {
    final parts = birthDate.split('-');
    final ly = parts.isNotEmpty ? int.tryParse(parts[0]) : null;
    final lm = parts.length > 1 ? int.tryParse(parts[1]) : null;
    final ld = parts.length > 2 ? int.tryParse(parts[2]) : null;
    final converted = (ly == null || lm == null || ld == null)
        ? null
        : lunarToSolar(LunarDate(year: ly, month: lm, day: ld, isLeapMonth: isLeap));
    solarDate = converted == null ? null : _toIsoDate(converted.year, converted.month, converted.day);
  }

  final lunarFailed = solarDate == null;
  // 환산에 실패하면 틀린 값을 보여 주느니 아예 세우지 않는다.
  final calcDate = solarDate ?? '';
  final parts = calcDate.split('-');
  final y = parts.isNotEmpty ? int.tryParse(parts[0]) : null;
  final m = parts.length > 1 ? int.tryParse(parts[1]) : null;
  final d = parts.length > 2 ? int.tryParse(parts[2]) : null;
  final isLateZi = !lunarFailed && hour != null && hour >= 23;

  final yearP = yearPillar(y, m, d);
  final monthP = monthPillarApprox(y, m, d);
  // 야자시면 일주만 다음 날로 넘기고 연·월주는 원래 날짜 기준을 유지한다.
  final dayDate = isLateZi ? _shiftIsoDate(calcDate, 1) : calcDate;
  final dayP = dayPillarApprox(dayDate);
  final hourP = (hour == null || lunarFailed) ? null : hourPillarApprox(dayP.stemIdx, hour);

  final warnings = <String>[];
  if (lunarFailed) {
    // 환산이 깨졌으면 아래 경고들은 세우지도 않은 간지에 대한 잡음이라 띄우지 않는다.
    warnings.add(SajuWarn.lunarConvertFailed);
  } else {
    if (isLunar) warnings.add(SajuWarn.lunarConverted);
    if (hourP == null) warnings.add(SajuWarn.hourMissing);
    if (yearP.boundary) warnings.add(SajuWarn.solarTermBoundary);
    // 연주(입춘)와 월주(그 달의 절)는 각각 다른 절기에서 갈리므로 경고도 따로 띄운다.
    if (monthP.boundary) warnings.add(SajuWarn.monthTermBoundary);
    if (isLateZi) warnings.add(SajuWarn.lateZiHour);
  }

  final calendarLine = !isLunar
      ? '달력: 양력'
      : lunarFailed
          ? '달력: 음력 입력 — 양력 환산 실패(지원 범위 음력 $lunarMinYear~$lunarMaxYear년, 윤달 여부·날짜 확인 필요)'
          : '달력: 음력 $birthDate${isLeap ? ' 윤달' : ''} → 양력 $solarDate 환산 적용';

  final textBlock = [
    '입력: $birthDate ${(birthTime == null || birthTime.isEmpty) ? '(시간 미상)' : birthTime}',
    calendarLine,
    '성별: ${(gender == null || gender.isEmpty) ? '미지정' : gender}',
    '년주: ${yearP.ganji} (${yearP.element})${yearP.note.isNotEmpty ? ' — ${yearP.note}' : ''}',
    '월주(간이): ${monthP.ganji} — ${monthP.note}',
    '일주(간이): ${dayP.ganji} — ${dayP.note}${isLateZi ? ' · 야자시라 다음 날 일주 적용' : ''}',
    hourP != null
        ? '시주(간이): ${hourP.ganji} (${hourP.element}) — ${hourP.note}'
        : lunarFailed
            ? '시주: 미산출 — 음력을 양력으로 환산하지 못해 계산하지 않았습니다'
            : '시주: 미산출 — 출생 시각이 없어 시주를 세우지 않았습니다',
  ].join('\n');

  return SajuSummary(
    birthDate: birthDate,
    birthTime: birthTime ?? '',
    gender: gender ?? '',
    calendarType: calendarType ?? 'solar',
    // 빈 문자열(깨진 입력)도 null로 눌러야 화면이 "→ 양력 " 같은 반쪽 문구를 찍지 않는다.
    solarDate: (solarDate == null || solarDate.isEmpty) ? null : solarDate,
    lunarDate: isLunar ? birthDate : null,
    isLeapMonth: isLunar ? isLeap : null,
    lunarConverted: isLunar ? !lunarFailed : null,
    year: yearP,
    month: monthP,
    day: dayP,
    hour: hourP,
    warnings: warnings,
    textBlock: textBlock,
  );
}
