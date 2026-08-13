// test/services/tts_test.dart — TTS 취소 계약.
//
// 이 포팅에서 조용히 깨지기 가장 쉬운 곳이다. 겉보기에는 동작하다가
// "중지를 눌렀는데 잠시 뒤 음성이 튀어나온다"로 나타난다.
//
// 지키는 계약 셋:
//   1) 중지는 예외가 아니라 정상 완료다 (문장별 순차 낭독이 여기 의존한다)
//   2) 생성 요청 대기 중 중지해도 오디오가 시작되지 않는다
//   3) 연속 호출이 겹치지 않는다 (뒤 호출이 앞 호출을 무효화한다)

import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:just_audio/just_audio.dart';
import 'package:svil_tarot/services/tts.dart';

/// 재생을 실제로 하지 않는 가짜 플레이어.
/// just_audio는 플랫폼 채널이 필요해 유닛 테스트에서 돌지 않는다.
class _FakePlayer implements AudioPlayer {
  int setSourceCalls = 0;
  int playCalls = 0;
  int stopCalls = 0;

  final _stateController = StreamController<PlayerState>.broadcast();

  @override
  Future<Duration?> setAudioSource(
    AudioSource source, {
    bool preload = true,
    int? initialIndex,
    Duration? initialPosition,
    dynamic tag,
  }) async {
    setSourceCalls++;
    return Duration.zero;
  }

  @override
  Future<void> play() async {
    playCalls++;
    // 짧게 재생하고 끝났다고 알린다.
    scheduleMicrotask(() {
      _stateController.add(PlayerState(true, ProcessingState.completed));
    });
  }

  @override
  Future<void> stop() async => stopCalls++;

  @override
  Stream<PlayerState> get playerStateStream => _stateController.stream;

  @override
  Future<void> dispose() async => _stateController.close();

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

Uint8List _wav() => Uint8List.fromList(utf8.encode('RIFF....WAVEfake'));

void main() {
  group('취소 계약', () {
    test('중지는 예외가 아니라 정상 완료다', () async {
      // 서버가 영원히 응답하지 않는 상황.
      final response = Completer<http.Response>();
      final requestSent = Completer<void>();
      final client = MockClient((_) {
        if (!requestSent.isCompleted) requestSent.complete();
        return response.future;
      });
      final player = _FakePlayer();
      final tts = TtsService(
          client: client, player: player, generateTimeout: const Duration(milliseconds: 200));

      final speaking = tts.speak('안녕하세요');
      // 요청이 실제로 나간 뒤에 중지한다. 이게 '생성 대기 중 중지'다.
      // (요청이 뜨기도 전에 중지하는 것은 speak가 stop을 덮어쓰는 게 맞는 의미론이다.)
      await requestSent.future;
      await tts.stop();

      // throw하면 화면에 붉은 오류 배너가 뜬다. 사용자가 스스로 누른 중지인데.
      await expectLater(speaking, completes);
      expect(player.playCalls, 0, reason: '중지했는데 오디오가 시작됐다');
    });

    test('생성 대기 중 중지하면 응답이 늦게 와도 재생되지 않는다', () async {
      // 최악의 회귀: 중지 후 몇 초 뒤 음성이 튀어나온다.
      final response = Completer<http.Response>();
      final requestSent = Completer<void>();
      final client = MockClient((_) {
        if (!requestSent.isCompleted) requestSent.complete();
        return response.future;
      });
      final player = _FakePlayer();
      final tts = TtsService(
          client: client, player: player, generateTimeout: const Duration(milliseconds: 200));

      final speaking = tts.speak('안녕하세요');
      await requestSent.future;
      await tts.stop();

      // 중지 이후에 서버가 응답을 보낸다.
      response.complete(http.Response.bytes(_wav(), 200));
      await speaking;
      // 응답 처리에 시간을 준다.
      await Future<void>.delayed(const Duration(milliseconds: 50));

      expect(player.setSourceCalls, 0, reason: '버려야 할 응답으로 오디오를 만들었다');
      expect(player.playCalls, 0, reason: '중지 후 재생이 시작됐다');
    });

    test('연속 호출이 겹치지 않는다 — 뒤 호출이 앞을 무효화한다', () async {
      final first = Completer<http.Response>();
      var callCount = 0;
      final client = MockClient((_) {
        callCount++;
        // 첫 호출만 붙잡아 둔다.
        if (callCount == 1) return first.future;
        return Future.value(http.Response.bytes(_wav(), 200));
      });
      final player = _FakePlayer();
      final tts = TtsService(
          client: client, player: player, generateTimeout: const Duration(milliseconds: 200));

      final a = tts.speak('첫 문장');
      final b = tts.speak('둘째 문장');

      await b;
      // 뒤늦게 첫 응답이 도착한다.
      first.complete(http.Response.bytes(_wav(), 200));
      await a;
      await Future<void>.delayed(const Duration(milliseconds: 50));

      expect(player.playCalls, 1, reason: '두 문장이 겹쳐 재생됐다');
    });

    test('중지는 재생 중이 아니어도 안전하다', () async {
      final client = MockClient((_) async => http.Response('', 200));
      final tts = TtsService(client: client, player: _FakePlayer());
      await expectLater(tts.stop(), completes);
      await expectLater(tts.stop(), completes);
    });
  });

  group('오류', () {
    test('HTTP 오류는 상태 코드를 담은 i18n 키로 나온다', () async {
      final client = MockClient((_) async => http.Response('server error', 500));
      final tts = TtsService(client: client, player: _FakePlayer());

      await expectLater(
        tts.speak('안녕하세요'),
        throwsA(isA<TtsException>()
            .having((e) => e.code, 'code', TtsErrors.http)
            .having((e) => e.params?['status'], 'status', 500)),
      );
    });

    test('서버가 꺼져 있으면 status 0으로 알린다', () async {
      final client = MockClient((_) => throw const SocketExceptionStub());
      final tts = TtsService(client: client, player: _FakePlayer());

      await expectLater(
        tts.speak('안녕하세요'),
        throwsA(isA<TtsException>().having((e) => e.code, 'code', TtsErrors.http)),
      );
    });

    test('빈 문자열은 아무것도 하지 않는다', () async {
      final player = _FakePlayer();
      final client = MockClient((_) async => http.Response.bytes(_wav(), 200));
      final tts = TtsService(client: client, player: player);

      await tts.speak('   ');
      expect(player.setSourceCalls, 0);
    });
  });

  group('상태 조회', () {
    test('서버가 살아 있으면 ping이 true다', () async {
      final client = MockClient((r) async {
        expect(r.url.path, '/api/tts/status');
        return http.Response('{}', 200);
      });
      expect(await TtsService(client: client, player: _FakePlayer()).ping(), isTrue);
    });

    test('보이스 목록은 배열과 객체 두 모양을 모두 읽는다', () async {
      final asArray = MockClient((_) async => http.Response('["a","b"]', 200));
      expect(
        await TtsService(client: asArray, player: _FakePlayer()).voices(),
        ['a', 'b'],
      );

      final asObject = MockClient((_) async => http.Response('{"voices":["c"]}', 200));
      expect(
        await TtsService(client: asObject, player: _FakePlayer()).voices(),
        ['c'],
      );
    });

    test('서버가 죽어 있으면 빈 목록이다 — 화면이 죽지 않는다', () async {
      final client = MockClient((_) => throw const SocketExceptionStub());
      expect(await TtsService(client: client, player: _FakePlayer()).voices(), isEmpty);
    });
  });
}

/// dart:io의 SocketException을 테스트에서 직접 만들기 번거로워 최소 대역으로 둔다.
class SocketExceptionStub implements Exception {
  const SocketExceptionStub();
}
