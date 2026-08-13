// lib/i18n/i18n.dart — 번역 조회.
//
// 웹판 src/i18n/index.ts의 translate()를 그대로 옮겼다.
// ICU(package:intl의 메시지 포맷)를 쓰지 않는 이유: 웹판 문구 3,287개가 전부 `{name}` 치환
// 방식이라 그대로 옮기면 기계 변환으로 끝난다. ICU로 바꾸면 3,287개를 손으로 재작성해야 하고
// 그 과정에서 반드시 흘린다.

import 'strings.dart';

/// 지원 로케일. 순서가 설정 화면 목록 순서다.
const List<String> supportedLocales = ['ko', 'en', 'ja', 'zh', 'vi'];

const String fallbackLocale = 'ko';

/// 로케일 문자열을 언어 코드로 정규화한다.
///
/// 저장값이 'en-US'나 'zh_CN'처럼 지역 접미사를 달고 들어와도 테이블을 찾도록 앞부분만 쓴다.
String normalizeLocale(String? locale) {
  if (locale == null || locale.isEmpty) return fallbackLocale;
  final lang = locale.trim().toLowerCase().split(RegExp('[-_]')).first;
  return supportedLocales.contains(lang) ? lang : fallbackLocale;
}

/// 키를 번역한다.
///
/// 폴백은 세 단계다. 그 언어의 번역 → 한국어 → 키 그대로.
/// 마지막 단계가 화면에 원시 키를 노출시키는 자리라, 테스트가 그 상황을 0건으로 강제한다
/// (test/i18n_test.dart). 실제로 웹판에서 ai_start_hint가 이렇게 새어 나온 적이 있다.
///
/// [params]는 `{name}` 자리를 채운다. 값이 없는 자리는 그대로 남겨 둔다 —
/// 조용히 빈 문자열로 만들면 "{n}장"이 "장"이 되어 문장이 무너진 걸 못 알아챈다.
String translate(String locale, String key, [Map<String, Object>? params]) {
  final lang = normalizeLocale(locale);
  final table = stringTables[lang] ?? koStrings;
  var s = table[key] ?? koStrings[key] ?? key;

  if (params != null) {
    params.forEach((k, v) {
      s = s.replaceAll('{$k}', '$v');
    });
  }
  return s;
}

/// 글꼴 id로 옵션을 찾는다. 알 수 없는 id면 목록 첫 항목(SVIL 기본값 라인시드).
///
/// 저장된 설정에 미확보 글꼴 id가 남아 있을 수 있어 반드시 폴백이 필요하다.
/// 웹판 AppContext.tsx:117이 하던 동작과 같다.
FontOption fontOptionById(String? id) {
  for (final option in fontOptions) {
    if (option.id == id) return option;
  }
  return fontOptions.first;
}

/// 실제로 적용할 글꼴 패밀리. 미확보 글꼴이면 null을 돌려주고 기본 글꼴로 렌더한다.
///
/// pubspec에 없는 패밀리 이름을 그대로 넘기면 Flutter가 조용히 기본 글꼴을 쓴다.
/// 그 조용함이 "글꼴을 바꿨는데 아무 일도 안 일어난다"로 보이므로, 여기서 명시적으로 갈라
/// 설정 화면이 '미확보'를 텍스트로 알릴 수 있게 한다.
String? resolvedFontFamily(String? id) => fontOptionById(id).family;
