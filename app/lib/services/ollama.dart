// lib/services/ollama.dart — 로컬 LLM 호출.
//
// 웹판 src/services/ollama.ts를 거의 1:1로 옮겼다. 데스크톱에는 CORS가 없어
// dev 프록시(/ollama)가 통째로 사라졌고, `OLLAMA_ORIGINS=*` 셋업 요구도 없어졌다.
//
// 주소를 하드코딩하지 않는다. 웹판은 `import.meta.env.DEV ? '/ollama' : 'http://127.0.0.1:11434'`
// 두 줄이었는데, 설정으로 올려 두면 나중에 다른 PC의 Ollama를 가리키거나
// 포트를 바꾼 사용자가 코드를 고치지 않아도 된다.

import 'dart:convert';

import 'package:http/http.dart' as http;

const String defaultOllamaBase = 'http://127.0.0.1:11434';
const String ollamaModel = 'gemma4:12b';

class ChatMessage {
  const ChatMessage(this.role, this.content);

  /// 'system' | 'user' | 'assistant'
  final String role;
  final String content;

  Map<String, String> toJson() => {'role': role, 'content': content};
}

/// 사용자 문구가 아니라 i18n 키다. 서비스 계층은 로케일을 모른다.
class OllamaException implements Exception {
  const OllamaException(this.code, {this.params});
  final String code;
  final Map<String, Object>? params;

  @override
  String toString() => 'OllamaException($code)';
}

class OllamaClient {
  OllamaClient({this.baseUrl = defaultOllamaBase, http.Client? client})
      : _client = client ?? http.Client();

  final String baseUrl;
  final http.Client _client;

  void dispose() => _client.close();

  /// 서버가 살아 있는가. 모델이 올라가 있는지와는 다른 질문이다.
  Future<bool> ping() async {
    try {
      final res = await _client
          .get(Uri.parse('$baseUrl/api/tags'))
          .timeout(const Duration(seconds: 3));
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  /// 모델이 지금 VRAM에 올라가 있는가. 서버가 살아 있어도 모델은 내려가 있을 수 있다.
  Future<bool> isModelLoaded() async {
    try {
      final res = await _client
          .get(Uri.parse('$baseUrl/api/ps'))
          .timeout(const Duration(seconds: 3));
      if (res.statusCode != 200) return false;
      final data = jsonDecode(res.body) as Map<String, Object?>;
      final models = (data['models'] as List?) ?? const [];
      return models.any((m) {
        final map = (m as Map).cast<String, Object?>();
        return map['name'] == ollamaModel || map['model'] == ollamaModel;
      });
    } catch (_) {
      return false;
    }
  }

  /// 모델을 VRAM에 올린다. 빈 프롬프트로 생성 요청을 보내면 로드만 하고 끝난다.
  /// 첫 리딩에서 수십 초 기다리는 대신 미리 올려 두려는 용도라 타임아웃을 넉넉히 준다.
  Future<void> loadModel() => _keepAlive('30m', const Duration(seconds: 180));

  /// 모델을 VRAM에서 내린다. 서버 프로세스는 그대로 살아 있다.
  /// 같은 GPU를 쓰는 이미지·TTS 작업에 VRAM을 넘겨줄 때 쓴다.
  Future<void> unloadModel() => _keepAlive(0, const Duration(seconds: 30));

  Future<void> _keepAlive(Object keepAlive, Duration timeout) async {
    final res = await _client
        .post(
          Uri.parse('$baseUrl/api/generate'),
          headers: const {'Content-Type': 'application/json'},
          body: jsonEncode({'model': ollamaModel, 'prompt': '', 'keep_alive': keepAlive}),
        )
        .timeout(timeout);
    if (res.statusCode != 200) {
      throw const OllamaException('ai_error');
    }
  }

  /// 리딩 생성. 스트리밍을 쓰지 않는 이유는 웹판과 같다 —
  /// 문장 단위 낭독이 완성된 텍스트를 필요로 하고, 부분 출력은 저시력 화면에서 오히려 산만하다.
  Future<String> chat(
    List<ChatMessage> messages, {
    double temperature = 0.7,
    Duration timeout = const Duration(seconds: 120),
  }) async {
    final http.Response res;
    try {
      res = await _client
          .post(
            Uri.parse('$baseUrl/api/chat'),
            headers: const {'Content-Type': 'application/json'},
            body: jsonEncode({
              'model': ollamaModel,
              'messages': messages.map((m) => m.toJson()).toList(),
              'stream': false,
              'options': {'temperature': temperature},
            }),
          )
          .timeout(timeout);
    } catch (_) {
      // 응답 시간 초과·연결 실패를 구분하지 않는다. 사용자가 할 일이 같다(서버 확인).
      throw const OllamaException('ai_timeout');
    }

    if (res.statusCode != 200) {
      throw const OllamaException('ai_error');
    }

    // 한글이 깨지지 않도록 반드시 UTF-8로 디코드한다. res.body는 latin1로 떨어질 수 있다.
    final data = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, Object?>;
    final content = ((data['message'] as Map?)?['content'] as String?)?.trim();
    if (content == null || content.isEmpty) {
      throw const OllamaException('ai_empty');
    }
    return content;
  }
}

// ---------- 프롬프트 ----------
//
// 프롬프트는 로케일과 무관하게 **한국어로 고정**한다.
// 프롬프트 언어가 사용자 로케일마다 흔들리면 모델이 뽑는 리딩의 품질·형식이 같이 흔들린다.
// 입력은 한국어로 두고, 출력 언어가 필요하면 지시문으로 다룬다.

const String systemTarot =
    '당신은 저시력 사용자를 배려하는 한국어 타로 조언자입니다. 명확하고 따뜻한 문장으로 쓰되, '
    '단정·공포·의료·법률 확정은 피하고, 정방향/역방향 의미를 구분해서 설명하세요.';

const String systemMystic =
    '당신은 한국어로 상담하는 명리·성명 조언자입니다. 저시력 사용자를 위해 짧고 명확한 문단으로 쓰세요. '
    '의료·법률·확정적 예언은 피하고, 참고용·자기성찰용임을 밝히세요. '
    '전문 만세력과 다를 수 있는 간이 계산임을 인정하세요.';

/// 규칙 기반 배열 진단을 프롬프트 앞에 붙인다. 모델이 편중을 놓치지 않아 리딩 품질이 올라간다.
String withAnalysis(String cardsText, String? analysis) =>
    (analysis == null || analysis.isEmpty)
        ? '뽑힌 카드:\n$cardsText'
        : '배열 진단(규칙 계산): $analysis\n\n뽑힌 카드:\n$cardsText';
