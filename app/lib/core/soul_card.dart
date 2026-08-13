// lib/core/soul_card.dart — 생년월일 → 소울카드(1~9).
//
// 웹판 src/lib/soulCard.ts를 옮겼다. test/core/soul_card_test.dart가
// TypeScript를 실제로 실행해 뽑은 313건과 대조한다.

/// 년/월/일이 모두 채워졌고 실제 존재하는 날짜인지.
bool isValidBirth(String y, String m, String d) {
  if (y.isEmpty || m.isEmpty || d.isEmpty) return false;
  final yy = int.tryParse(y);
  final mm = int.tryParse(m);
  final dd = int.tryParse(d);
  if (yy == null || yy < 1 || yy > 9999) return false;
  if (mm == null || mm < 1 || mm > 12) return false;
  if (dd == null) return false;
  // JS의 `new Date(yy, mm, 0).getDate()`와 같다 — 다음 달 0일 = 이번 달 마지막 날.
  final daysInMonth = DateTime(yy, mm + 1, 0).day;
  return dd >= 1 && dd <= daysInMonth;
}

/// 생년월일의 숫자를 모두 더해 한 자리가 될 때까지 접는다.
///
/// 숫자가 하나도 없으면 **예외를 던진다**. 웹판이 그렇게 동작하고,
/// 조용히 0을 돌려주면 잘못된 카드가 화면에 뜬다.
int calcSoulCard(String birthdate) {
  final digits = birthdate.replaceAll(RegExp(r'\D'), '');
  if (digits.isEmpty) throw const FormatException('생년월일 형식 오류');

  var sum = 0;
  for (final ch in digits.codeUnits) {
    sum += ch - 48;
  }
  while (sum >= 10) {
    var next = 0;
    for (final ch in sum.toString().codeUnits) {
      next += ch - 48;
    }
    sum = next;
  }
  // 합이 0이 되는 입력('0000' 등)은 9로 본다.
  return sum == 0 ? 9 : sum;
}

const Map<int, String> soulCardNames = {
  1: '마법사',
  2: '여사제',
  3: '여황제',
  4: '황제',
  5: '교황',
  6: '연인',
  7: '전차',
  8: '힘',
  9: '은둔자',
};

const Map<int, String> soulCardMajorIds = {
  1: 'major_01',
  2: 'major_02',
  3: 'major_03',
  4: 'major_04',
  5: 'major_05',
  6: 'major_06',
  7: 'major_07',
  8: 'major_08',
  9: 'major_09',
};

const Map<int, String> soulCardDescriptions = {
  1: '목표를 향한 의지가 강하고, 어떤 상황도 자신의 것으로 만드는 힘이 있어요.',
  2: '직관이 예리하고, 말하지 않아도 많은 것을 느끼는 깊은 내면을 가졌어요.',
  3: '따뜻하고 풍요로운 에너지로 주변을 편안하게 만드는 존재예요.',
  4: '안정감과 신뢰를 주는 단단한 기반을 가진 사람이에요.',
  5: '지혜롭고 진실을 중요하게 여기며, 관계에서 신뢰를 쌓아가는 타입이에요.',
  6: '감수성이 풍부하고 관계에서 진심을 다하는 로맨틱한 영혼이에요.',
  7: '추진력이 강하고 한번 마음먹으면 끝까지 밀고 나가는 에너지가 있어요.',
  8: '겉으로는 부드럽지만 내면에 단단한 힘을 가진, 진정한 강인함의 소유자예요.',
  9: '깊은 사색과 통찰력으로 남들이 보지 못하는 것을 꿰뚫어 보는 지혜가 있어요.',
};
