// lib/data/models.dart — 저장 레코드 모델.
//
// 웹판 src/services/db.ts의 타입을 그대로 옮겼다. **필드 이름을 하나도 바꾸지 않는다** —
// 이 이름들이 백업 JSON의 키이고, 백업 파일이 웹판 데이터의 유일한 이관 통로다.
// 이름을 '더 낫게' 고치는 순간 사용자 데이터가 안 넘어온다.
//
// JS→Dart 포팅에서 실제로 터지는 지점 하나를 여기서 막는다:
// jsonDecode는 `2`를 int로, `2.5`를 double로 준다. `as double`로 캐스팅하면
// 정수로 저장된 ease에서 크래시한다. 반드시 `as num` → `.toDouble()`이어야 한다.

/// 리딩 종류. 웹판 HistoryKind.
const List<String> historyKinds = [
  'practice', 'ai', 'soul', 'learn', 'saju', 'compat', 'nameology', 'naming', 'daily',
];

/// 상담 서비스 종류. 웹판 ServiceType.
const List<String> serviceTypes = [
  'practice', 'ai', 'soul', 'saju', 'compat', 'nameology', 'naming', 'other',
];

/// JSON 숫자를 안전하게 double로. int로 저장된 값에서 죽지 않게 한다.
double? _toDouble(Object? v) => v == null ? null : (v as num).toDouble();
int? _toInt(Object? v) => v == null ? null : (v as num).toInt();

/// 뽑힌 카드 한 장. 순서가 의미인 위치 배열의 원소다.
class DrawnCard {
  const DrawnCard({
    required this.id,
    required this.nameKo,
    required this.nameEn,
    required this.isReversed,
    this.positionKey,
    this.positionLabel,
  });

  final String id;
  final String nameKo;
  final String nameEn;
  final bool isReversed;
  final String? positionKey;
  final String? positionLabel;

  factory DrawnCard.fromJson(Map<String, Object?> j) => DrawnCard(
        id: j['id'] as String,
        nameKo: (j['nameKo'] ?? '') as String,
        nameEn: (j['nameEn'] ?? '') as String,
        isReversed: (j['isReversed'] ?? false) as bool,
        positionKey: j['positionKey'] as String?,
        positionLabel: j['positionLabel'] as String?,
      );

  Map<String, Object?> toJson() => {
        'id': id,
        'nameKo': nameKo,
        'nameEn': nameEn,
        'isReversed': isReversed,
        // 없는 값은 키 자체를 넣지 않는다. 웹판 레코드와 모양을 맞춘다.
        if (positionKey != null) 'positionKey': positionKey,
        if (positionLabel != null) 'positionLabel': positionLabel,
      };
}

class Customer {
  const Customer({
    required this.id,
    required this.name,
    required this.createdAt,
    required this.updatedAt,
    this.phone,
    this.email,
    this.gender,
    this.birthDate,
    this.birthTime,
    this.calendarType,
    this.notes,
  });

  final String id;
  final String name;
  final String createdAt;
  final String updatedAt;
  final String? phone;
  final String? email;
  final String? gender;
  final String? birthDate;
  final String? birthTime;
  final String? calendarType;
  final String? notes;

  factory Customer.fromJson(Map<String, Object?> j) => Customer(
        id: j['id'] as String,
        name: j['name'] as String,
        createdAt: j['createdAt'] as String,
        updatedAt: j['updatedAt'] as String,
        phone: j['phone'] as String?,
        email: j['email'] as String?,
        gender: j['gender'] as String?,
        birthDate: j['birthDate'] as String?,
        birthTime: j['birthTime'] as String?,
        calendarType: j['calendarType'] as String?,
        notes: j['notes'] as String?,
      );

  Map<String, Object?> toJson() => {
        'id': id,
        'name': name,
        if (phone != null) 'phone': phone,
        if (email != null) 'email': email,
        if (gender != null) 'gender': gender,
        if (birthDate != null) 'birthDate': birthDate,
        if (birthTime != null) 'birthTime': birthTime,
        if (calendarType != null) 'calendarType': calendarType,
        if (notes != null) 'notes': notes,
        'createdAt': createdAt,
        'updatedAt': updatedAt,
      };
}

class Consultation {
  const Consultation({
    required this.id,
    required this.customerId,
    required this.serviceType,
    required this.title,
    required this.summary,
    required this.createdAt,
    this.detail,
    this.resultText,
    this.historyId,
    this.meta,
    this.dueAt,
    this.status,
    this.aiNote,
  });

  final String id;
  final String customerId;
  final String serviceType;
  final String title;
  final String summary;
  final String createdAt;
  final String? detail;
  final String? resultText;
  final String? historyId;
  final Map<String, Object?>? meta;

  /// v5에서 추가. 없으면 마감일 없음.
  final String? dueAt;

  /// v5에서 추가. 없으면 'done'으로 본다(기존 기록은 전부 완료된 것으로 간주).
  final String? status;

  /// v5에서 추가. 로컬 LLM이 정리한 3줄 요약.
  final String? aiNote;

  factory Consultation.fromJson(Map<String, Object?> j) => Consultation(
        id: j['id'] as String,
        customerId: j['customerId'] as String,
        serviceType: j['serviceType'] as String,
        title: j['title'] as String,
        summary: (j['summary'] ?? '') as String,
        createdAt: j['createdAt'] as String,
        detail: j['detail'] as String?,
        resultText: j['resultText'] as String?,
        historyId: j['historyId'] as String?,
        meta: (j['meta'] as Map?)?.cast<String, Object?>(),
        dueAt: j['dueAt'] as String?,
        status: j['status'] as String?,
        aiNote: j['aiNote'] as String?,
      );

  Map<String, Object?> toJson() => {
        'id': id,
        'customerId': customerId,
        'serviceType': serviceType,
        'title': title,
        'summary': summary,
        if (detail != null) 'detail': detail,
        if (resultText != null) 'resultText': resultText,
        if (historyId != null) 'historyId': historyId,
        if (meta != null) 'meta': meta,
        'createdAt': createdAt,
        if (dueAt != null) 'dueAt': dueAt,
        if (status != null) 'status': status,
        if (aiNote != null) 'aiNote': aiNote,
      };
}

class HistoryEntry {
  const HistoryEntry({
    required this.id,
    required this.kind,
    required this.title,
    required this.createdAt,
    this.cards,
    this.userNote,
    this.aiText,
    this.customerId,
    this.consultationId,
    this.outcome,
    this.outcomeNote,
    this.outcomeAt,
    this.meta,
  });

  final String id;
  final String kind;
  final String title;
  final String createdAt;

  /// **null(부재)과 빈 배열은 다른 값이다.**
  /// 백업에서 부재는 키 자체가 없는 것이고, 빈 배열은 `"cards": []`다.
  /// 왕복에서 이 구분이 무너지면 골든 비교가 깨진다.
  final List<DrawnCard>? cards;

  final String? userNote;
  final String? aiText;
  final String? customerId;
  final String? consultationId;
  final String? outcome;
  final String? outcomeNote;
  final String? outcomeAt;
  final Map<String, Object?>? meta;

  factory HistoryEntry.fromJson(Map<String, Object?> j) => HistoryEntry(
        id: j['id'] as String,
        kind: j['kind'] as String,
        title: j['title'] as String,
        createdAt: j['createdAt'] as String,
        cards: j.containsKey('cards') && j['cards'] != null
            ? (j['cards'] as List)
                .map((e) => DrawnCard.fromJson((e as Map).cast<String, Object?>()))
                .toList()
            : null,
        userNote: j['userNote'] as String?,
        aiText: j['aiText'] as String?,
        customerId: j['customerId'] as String?,
        consultationId: j['consultationId'] as String?,
        outcome: j['outcome'] as String?,
        outcomeNote: j['outcomeNote'] as String?,
        outcomeAt: j['outcomeAt'] as String?,
        meta: (j['meta'] as Map?)?.cast<String, Object?>(),
      );

  Map<String, Object?> toJson() => {
        'id': id,
        'kind': kind,
        'title': title,
        'createdAt': createdAt,
        if (cards != null) 'cards': cards!.map((c) => c.toJson()).toList(),
        if (userNote != null) 'userNote': userNote,
        if (aiText != null) 'aiText': aiText,
        if (customerId != null) 'customerId': customerId,
        if (consultationId != null) 'consultationId': consultationId,
        if (outcome != null) 'outcome': outcome,
        if (outcomeNote != null) 'outcomeNote': outcomeNote,
        if (outcomeAt != null) 'outcomeAt': outcomeAt,
        if (meta != null) 'meta': meta,
      };
}

class CardNote {
  const CardNote({required this.cardId, required this.updatedAt, this.keywords, this.meaning});

  final String cardId;
  final String updatedAt;
  final String? keywords;
  final String? meaning;

  factory CardNote.fromJson(Map<String, Object?> j) => CardNote(
        cardId: j['cardId'] as String,
        updatedAt: j['updatedAt'] as String,
        keywords: j['keywords'] as String?,
        meaning: j['meaning'] as String?,
      );

  Map<String, Object?> toJson() => {
        'cardId': cardId,
        if (keywords != null) 'keywords': keywords,
        if (meaning != null) 'meaning': meaning,
        'updatedAt': updatedAt,
      };
}

class DailyDraw {
  const DailyDraw({
    required this.date,
    required this.card,
    required this.createdAt,
    this.aiText,
  });

  /// YYYY-MM-DD. 키다.
  final String date;
  final DrawnCard card;
  final String createdAt;
  final String? aiText;

  factory DailyDraw.fromJson(Map<String, Object?> j) => DailyDraw(
        date: j['date'] as String,
        card: DrawnCard.fromJson((j['card'] as Map).cast<String, Object?>()),
        createdAt: j['createdAt'] as String,
        aiText: j['aiText'] as String?,
      );

  Map<String, Object?> toJson() => {
        'date': date,
        'card': card.toJson(),
        if (aiText != null) 'aiText': aiText,
        'createdAt': createdAt,
      };
}

class SpreadPosition {
  const SpreadPosition({required this.key, required this.labelKo});

  final String key;
  final String labelKo;

  factory SpreadPosition.fromJson(Map<String, Object?> j) => SpreadPosition(
        key: j['key'] as String,
        labelKo: j['labelKo'] as String,
      );

  Map<String, Object?> toJson() => {'key': key, 'labelKo': labelKo};
}

class CustomSpread {
  const CustomSpread({
    required this.id,
    required this.nameKo,
    required this.cardCount,
    required this.positions,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String nameKo;
  final int cardCount;
  final List<SpreadPosition> positions;
  final String createdAt;
  final String updatedAt;

  factory CustomSpread.fromJson(Map<String, Object?> j) => CustomSpread(
        id: j['id'] as String,
        nameKo: j['nameKo'] as String,
        cardCount: _toInt(j['cardCount']) ?? 0,
        positions: ((j['positions'] as List?) ?? const [])
            .map((e) => SpreadPosition.fromJson((e as Map).cast<String, Object?>()))
            .toList(),
        createdAt: j['createdAt'] as String,
        updatedAt: j['updatedAt'] as String,
      );

  Map<String, Object?> toJson() => {
        'id': id,
        'nameKo': nameKo,
        'cardCount': cardCount,
        'positions': positions.map((p) => p.toJson()).toList(),
        'createdAt': createdAt,
        'updatedAt': updatedAt,
      };
}

class SrsCard {
  const SrsCard({
    required this.cardId,
    required this.ease,
    required this.interval,
    required this.reps,
    required this.lapses,
    required this.dueAt,
    required this.updatedAt,
  });

  final String cardId;

  /// 난이도 계수. 초기 2.5, 하한 1.3.
  /// **정수로 저장돼 있을 수 있다** — `as double`이 아니라 num→toDouble로 읽는다.
  final double ease;

  final int interval;
  final int reps;
  final int lapses;

  /// ISO. 사전순 = 시간순이라는 성질에 조회가 의존한다(항상 UTC `Z` 표기여야 한다).
  final String dueAt;

  final String updatedAt;

  factory SrsCard.fromJson(Map<String, Object?> j) => SrsCard(
        cardId: j['cardId'] as String,
        ease: _toDouble(j['ease']) ?? 2.5,
        interval: _toInt(j['interval']) ?? 0,
        reps: _toInt(j['reps']) ?? 0,
        lapses: _toInt(j['lapses']) ?? 0,
        dueAt: j['dueAt'] as String,
        updatedAt: j['updatedAt'] as String,
      );

  Map<String, Object?> toJson() => {
        'cardId': cardId,
        'ease': ease,
        'interval': interval,
        'reps': reps,
        'lapses': lapses,
        'dueAt': dueAt,
        'updatedAt': updatedAt,
      };
}
