// lib/services/tts.dart — 로컬 TTS 호출과 재생 수명주기(취소·타임아웃·정리).
//
// 웹판 src/services/tts.ts의 **계약을 그대로** 옮겼다. 겉보기보다 미묘한 코드라
// 무엇을 지켜야 하는지 먼저 적어 둔다.
//
//   1) stop()은 재생 중이 아니어도 동작해야 한다.
//      '생성 요청 대기 중'에 중지를 눌렀는데 잠시 뒤 음성이 튀어나오는 것이 최악의 회귀다.
//      그래서 세대 번호를 **먼저** 올리고 요청을 끊는다.
//   2) speak()는 중지됐을 때 **예외를 던지지 않고 정상 완료**한다.
//      문장별 순차 낭독이 이 계약에 의존한다 — 중지가 오류로 보이면 화면에 붉은 배너가 뜬다.
//   3) 타임아웃과 사용자 중지를 구분한다. 둘 다 요청을 끊지만 사용자에게 알릴 내용이 다르다.
//   4) 오류는 완성 문장이 아니라 i18n 키다. 이 계층은 로케일을 모른다.

import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;
import 'package:just_audio/just_audio.dart';

const String defaultTtsBase = 'http://127.0.0.1:8765';

/// 로컬 TTS가 응답하지 않을 때 '중지도 안 되고 아무 일도 안 나는' 상태를 막는 상한.
const Duration ttsGenerateTimeout = Duration(seconds: 15);

/// 서버가 긴 텍스트에서 멈추는 것을 막는 상한. 웹판과 같은 값.
const int ttsMaxChars = 2000;

class TtsException implements Exception {
  const TtsException(this.code, {this.params});

  /// i18n 키. 화면이 t(code, params)로 옮긴다.
  final String code;
  final Map<String, Object>? params;

  @override
  String toString() => 'TtsException($code)';
}

class TtsErrors {
  const TtsErrors._();
  static const timeout = 'tts_err_timeout';
  static const playFailed = 'tts_err_play';
  static const http = 'tts_err_http';
}

/// 메모리에 있는 오디오 바이트를 그대로 재생하기 위한 소스.
/// 임시 파일을 만들지 않는다 — 파일을 남기면 언제 지울지가 또 하나의 문제가 된다.
///
/// just_audio가 이 API를 experimental로 표시해 뒀다. 대안은 임시 파일뿐이고
/// 그쪽이 더 나쁘므로 감수한다. 패키지를 올릴 때 이 클래스가 깨지는지 먼저 본다.
// ignore: experimental_member_use
class _BytesSource extends StreamAudioSource {
  _BytesSource(this._bytes, this._contentType);

  final Uint8List _bytes;
  final String _contentType;

  @override
  // ignore: experimental_member_use
  Future<StreamAudioResponse> request([int? start, int? end]) async {
    final from = start ?? 0;
    final to = end ?? _bytes.length;
    // ignore: experimental_member_use
    return StreamAudioResponse(
      sourceLength: _bytes.length,
      contentLength: to - from,
      offset: from,
      stream: Stream.value(_bytes.sublist(from, to)),
      contentType: _contentType,
    );
  }
}

class TtsService {
  /// [client]를 주면 그것만 쓰고, 안 주면 요청마다 새 클라이언트를 만든다.
  ///
  /// 요청별 클라이언트가 필요한 이유: Dart에는 요청 취소가 1급 개념이 아니라
  /// `Client.close()`로 진행 중인 요청을 끊는다. 공용 클라이언트를 닫으면
  /// 이후 호출이 전부 죽으므로, 실제 실행에서는 요청마다 새로 만들어 닫는다.
  /// 테스트는 하나를 주입해 요청을 관찰한다.
  TtsService({
    this.baseUrl = defaultTtsBase,
    http.Client? client,
    AudioPlayer? player,
    this.generateTimeout = ttsGenerateTimeout,
  })  : _injected = client,
        _player = player ?? AudioPlayer();

  final String baseUrl;

  /// 생성 요청 상한. 테스트가 짧게 줄여 실제로 15초를 기다리지 않게 한다.
  final Duration generateTimeout;

  final http.Client? _injected;
  final AudioPlayer _player;

  /// 이 요청에 쓸 클라이언트. 주입된 게 있으면 그것을 쓴다(닫지 않는다).
  http.Client _newClient() => _injected ?? http.Client();

  bool get _ownsClients => _injected == null;

  /// 중지·재호출 때마다 올라간다. 값이 달라진 요청의 결과는 버려 음성이 겹치지 않게 한다.
  int _generation = 0;

  /// 진행 중인 생성 요청을 끊기 위한 것. 오디오가 만들어지기 전에도 중지할 수 있어야 한다.
  http.Client? _inFlight;

  /// 재생 완료를 기다리는 쪽. 중지 시 **오류가 아니라 정상 완료**로 닫는다.
  Completer<void>? _playing;

  StreamSubscription<PlayerState>? _stateSub;

  Future<void> dispose() async {
    await _stateSub?.cancel();
    await _player.dispose();
    _injected?.close();
  }

  Future<bool> ping() async {
    final client = _newClient();
    try {
      final res = await client
          .get(Uri.parse('$baseUrl/api/tts/status'))
          .timeout(const Duration(seconds: 3));
      return res.statusCode == 200;
    } catch (_) {
      return false;
    } finally {
      if (_ownsClients) client.close();
    }
  }

  Future<List<String>> voices() async {
    final client = _newClient();
    try {
      final res = await client
          .get(Uri.parse('$baseUrl/api/tts/voices'))
          .timeout(const Duration(seconds: 5));
      if (res.statusCode != 200) return const [];
      final data = jsonDecode(utf8.decode(res.bodyBytes));
      if (data is List) return data.cast<String>();
      if (data is Map) return ((data['voices'] as List?) ?? const []).cast<String>();
      return const [];
    } catch (_) {
      return const [];
    } finally {
      if (_ownsClients) client.close();
    }
  }

  /// 낭독을 멈춘다.
  ///
  /// 재생 중이 아니어도 안전하다. 세대를 **먼저** 올려 진행 중이던 생성 요청의 결과를
  /// 버리게 만들고, 그다음 요청과 재생을 끊는다. 순서를 바꾸면
  /// '중지를 눌렀는데 잠시 뒤 음성이 나오는' 회귀가 생긴다.
  Future<void> stop() async {
    _generation++;

    // 진행 중인 HTTP 요청을 끊는다. close()는 in-flight 요청을 실패시킨다.
    // 주입된(공용) 클라이언트는 닫지 않는다 — 세대 검사가 결과를 버리는 것으로 충분하다.
    if (_ownsClients) _inFlight?.close();
    _inFlight = null;

    await _stateSub?.cancel();
    _stateSub = null;

    try {
      await _player.stop();
    } catch (_) {
      // 이미 멈춰 있으면 무시. 중지가 실패로 보이면 안 된다.
    }

    // 기다리던 쪽을 정상 완료로 닫는다. 중지는 오류가 아니다.
    final pending = _playing;
    _playing = null;
    if (pending != null && !pending.isCompleted) pending.complete();
  }

  /// 문장 하나를 읽는다. 재생이 끝나면 완료된다.
  ///
  /// 중지되면 **예외 없이** 완료된다 — 문장별 순차 낭독이 이 계약에 의존한다.
  Future<void> speak(String text, {String voice = 'default', int speedPct = 100}) async {
    await stop();

    final trimmed = text.trim();
    if (trimmed.isEmpty) return;

    // 이 호출의 세대를 고정하고 단계마다 최신인지 확인한다. 다르면 이미 중지·재호출된 것이다.
    final myGen = ++_generation;
    final client = _newClient();
    _inFlight = client;

    // 타임아웃과 사용자 중지를 구분해야 해서 플래그를 따로 둔다.
    var timedOut = false;
    Uint8List bytes;
    String contentType;

    try {
      final res = await client
          .post(
            Uri.parse('$baseUrl/api/tts/generate'),
            headers: const {'Content-Type': 'application/json'},
            body: jsonEncode({
              'text': trimmed.length > ttsMaxChars ? trimmed.substring(0, ttsMaxChars) : trimmed,
              'engine': 'qwen3',
              'voice_name': voice.isEmpty ? 'default' : voice,
              'speed_pct': speedPct,
            }),
          )
          .timeout(generateTimeout, onTimeout: () {
        timedOut = true;
        client.close();
        throw TimeoutException('tts generate');
      });

      // 응답을 받는 사이에 중지됐을 수 있다.
      if (myGen != _generation) return;

      if (res.statusCode != 200) {
        throw TtsException(TtsErrors.http, params: {'status': res.statusCode});
      }
      bytes = res.bodyBytes;
      contentType = res.headers['content-type'] ?? 'audio/wav';
    } on TtsException {
      rethrow;
    } catch (_) {
      // 중지·재호출로 버려진 요청은 조용히 끝낸다. 사용자에게 오류로 보이면 안 된다.
      if (myGen != _generation) return;
      if (timedOut) {
        throw TtsException(TtsErrors.timeout, params: {'sec': generateTimeout.inSeconds});
      }
      // 연결 실패 등. 서버가 꺼져 있는 경우가 대부분이다.
      throw const TtsException(TtsErrors.http, params: {'status': 0});
    } finally {
      if (identical(_inFlight, client)) _inFlight = null;
      // 주입된 클라이언트는 우리 것이 아니다. 닫으면 다음 호출이 전부 죽는다.
      if (_ownsClients) client.close();
    }

    if (bytes.isEmpty || myGen != _generation) return;

    final completer = Completer<void>();
    _playing = completer;

    try {
      await _player.setAudioSource(_BytesSource(bytes, contentType));
      // 소스를 준비하는 사이에도 중지될 수 있다.
      if (myGen != _generation) {
        if (!completer.isCompleted) completer.complete();
        return;
      }

      _stateSub = _player.playerStateStream.listen((s) {
        if (s.processingState == ProcessingState.completed) {
          if (!completer.isCompleted) completer.complete();
        }
      });

      unawaited(_player.play());
    } catch (_) {
      if (identical(_playing, completer)) _playing = null;
      if (!completer.isCompleted) completer.complete();
      // 중지로 인한 실패는 오류가 아니다.
      if (myGen != _generation) return;
      throw const TtsException(TtsErrors.playFailed);
    }

    await completer.future;

    if (identical(_playing, completer)) {
      _playing = null;
      await _stateSub?.cancel();
      _stateSub = null;
    }
  }
}
