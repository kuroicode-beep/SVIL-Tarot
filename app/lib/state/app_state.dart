// lib/state/app_state.dart — 앱 전역 상태.
//
// 웹판 src/context/AppContext.tsx를 옮겼다. 컨텍스트가 하나뿐이라 ChangeNotifier 하나로 1:1이다.
// Riverpod은 이 규모에 과한 도입 비용이다.
//
// 설정은 웹판과 **같은 키('svil-tarot-settings')에 같은 JSON 모양**으로 저장한다.
// 나중에 설정까지 이관하고 싶어질 때 파일 하나를 옮기면 되게 해 둔다.

import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../a11y/tokens.dart';
import '../i18n/i18n.dart';
import '../services/ollama.dart';
import '../services/tts.dart';

const String settingsStorageKey = 'svil-tarot-settings';

class AppSettings {
  const AppSettings({
    this.fontSize = FontSizeStep.md,
    this.fontId = 'lineseed',
    this.locale = 'ko',
    this.ttsVoice = 'default',
    this.ttsSpeed = 100,
    this.contrast = ContrastMode.standard,
    this.plainBackground = false,
  });

  final FontSizeStep fontSize;
  final String fontId;
  final String locale;
  final String ttsVoice;
  final int ttsSpeed;
  final ContrastMode contrast;

  /// 배경 그라디언트·흐림 끄기. 투명·흐림이 어지럽거나 대비를 떨어뜨리는 사용자를 위해.
  final bool plainBackground;

  AppSettings copyWith({
    FontSizeStep? fontSize,
    String? fontId,
    String? locale,
    String? ttsVoice,
    int? ttsSpeed,
    ContrastMode? contrast,
    bool? plainBackground,
  }) =>
      AppSettings(
        fontSize: fontSize ?? this.fontSize,
        fontId: fontId ?? this.fontId,
        locale: locale ?? this.locale,
        ttsVoice: ttsVoice ?? this.ttsVoice,
        ttsSpeed: ttsSpeed ?? this.ttsSpeed,
        contrast: contrast ?? this.contrast,
        plainBackground: plainBackground ?? this.plainBackground,
      );

  Map<String, Object?> toJson() => {
        'fontSize': fontSize.id,
        'fontId': fontId,
        'locale': locale,
        'ttsVoice': ttsVoice,
        'ttsSpeed': ttsSpeed,
        'contrast': contrast.name,
        'plainBackground': plainBackground,
      };

  /// 저장값이 손상돼 있어도 죽지 않는다. 알 수 없는 값은 전부 기본값으로 떨어진다.
  factory AppSettings.fromJson(Map<String, Object?> j) {
    FontSizeStep size = FontSizeStep.md;
    for (final s in FontSizeStep.values) {
      if (s.id == j['fontSize']) size = s;
    }
    ContrastMode contrast = ContrastMode.standard;
    for (final c in ContrastMode.values) {
      if (c.name == j['contrast']) contrast = c;
    }
    return AppSettings(
      fontSize: size,
      // 알 수 없는 글꼴 id면 목록 첫 항목으로. 미확보 글꼴을 고른 설정이 남아 있을 수 있다.
      fontId: fontOptionById(j['fontId'] as String?).id,
      locale: normalizeLocale(j['locale'] as String?),
      ttsVoice: (j['ttsVoice'] as String?) ?? 'default',
      ttsSpeed: (j['ttsSpeed'] as num?)?.toInt() ?? 100,
      contrast: contrast,
      plainBackground: (j['plainBackground'] as bool?) ?? false,
    );
  }
}

class AppState extends ChangeNotifier {
  AppState(this._prefs, {TtsService? tts, OllamaClient? ollama})
      : _settings = _load(_prefs),
        _tts = tts ?? TtsService(),
        _ollama = ollama ?? OllamaClient();

  final SharedPreferences _prefs;
  final TtsService _tts;
  final OllamaClient _ollama;
  AppSettings _settings;

  AppSettings get settings => _settings;

  static AppSettings _load(SharedPreferences prefs) {
    final raw = prefs.getString(settingsStorageKey);
    if (raw == null) return const AppSettings();
    try {
      return AppSettings.fromJson((jsonDecode(raw) as Map).cast<String, Object?>());
    } catch (_) {
      // 손상된 설정 때문에 앱이 안 열리는 상황을 만들지 않는다.
      return const AppSettings();
    }
  }

  Future<void> _persist() async {
    await _prefs.setString(settingsStorageKey, jsonEncode(_settings.toJson()));
  }

  void _update(AppSettings next) {
    _settings = next;
    notifyListeners();
    // 저장 실패가 화면을 막지 않게 기다리지 않는다. 다음 실행에서 기본값으로 떨어질 뿐이다.
    unawaited(_persist());
  }

  void setFontSize(FontSizeStep v) => _update(_settings.copyWith(fontSize: v));
  void setFontId(String v) => _update(_settings.copyWith(fontId: v));
  void setLocale(String v) => _update(_settings.copyWith(locale: normalizeLocale(v)));
  void setContrast(ContrastMode v) => _update(_settings.copyWith(contrast: v));
  void setPlainBackground(bool v) => _update(_settings.copyWith(plainBackground: v));
  void setTtsVoice(String v) => _update(_settings.copyWith(ttsVoice: v));
  void setTtsSpeed(int v) => _update(_settings.copyWith(ttsSpeed: v));

  /// 번역. 화면은 전부 이걸 거친다.
  String t(String key, [Map<String, Object>? params]) =>
      translate(_settings.locale, key, params);

  // ---------- Windows 고대비 ----------

  bool _systemHighContrast = false;

  /// OS 고대비 모드가 켜졌는가. MediaQuery.highContrast에서 온다.
  ///
  /// Flutter 엔진이 이미 SystemParametersInfoW(SPI_GETHIGHCONTRAST)를 읽어
  /// 이 값을 채우고 WM_THEMECHANGED로 실시간 갱신까지 해 준다. FFI가 필요 없다.
  bool get systemHighContrast => _systemHighContrast;

  void updateSystemHighContrast(bool v) {
    if (_systemHighContrast == v) return;
    _systemHighContrast = v;
    notifyListeners();
  }

  /// 실제로 적용할 대비 프리셋.
  ///
  /// OS 고대비가 켜져 있으면 사용자 설정과 무관하게 초고대비로 간다.
  /// 웹판 `@media (forced-colors: active)` 블록이 하던 일이다 —
  /// 시스템 팔레트를 그대로 미러링하지는 않지만, max 프리셋이 이미 순수 검정+흰/노랑이라
  /// 시각적 결과가 거의 같고 대비 게이트를 통과한 값이라는 보장이 있다.
  ContrastMode get effectiveContrast =>
      _systemHighContrast ? ContrastMode.max : _settings.contrast;

  /// 고대비일 때는 배경 그라디언트·흐림을 강제로 끈다.
  /// tokens.css의 `[data-contrast='max'] body { background-image: none }`에 해당한다.
  bool get effectivePlainBackground => _systemHighContrast || _settings.plainBackground;

  // ---------- 낭독 대상 ----------

  String _lastSpeakText = '';
  String get lastSpeakText => _lastSpeakText;

  /// 상단바 '읽어주기'가 읽을 문장. 화면이 바뀌면 그 화면이 다시 등록한다.
  void setLastSpeakText(String v) {
    if (_lastSpeakText == v) return;
    _lastSpeakText = v;
    notifyListeners();
  }

  // ---------- 낭독 ----------

  bool _speaking = false;
  TtsException? _ttsError;

  bool get speaking => _speaking;

  /// i18n 키 + 파라미터. 서비스 계층은 로케일을 모르므로 화면이 t()로 옮긴다.
  TtsException? get ttsError => _ttsError;

  void clearTtsError() {
    if (_ttsError == null) return;
    _ttsError = null;
    notifyListeners();
  }

  Future<void> speak(String text) async {
    _ttsError = null;
    _speaking = true;
    _lastSpeakText = text;
    notifyListeners();
    try {
      await _tts.speak(text, voice: _settings.ttsVoice, speedPct: _settings.ttsSpeed);
    } on TtsException catch (e) {
      _ttsError = e;
    } finally {
      _speaking = false;
      notifyListeners();
    }
  }

  /// 중지는 오류가 아니다. speak()가 정상 완료되고 배너도 뜨지 않는다.
  Future<void> stopSpeak() async {
    await _tts.stop();
    _speaking = false;
    notifyListeners();
  }

  // ---------- 로컬 서버 상태 ----------

  bool? _ollamaOk;
  bool? _ttsOk;
  List<String> _voices = const [];

  bool? get ollamaOk => _ollamaOk;
  bool? get ttsOk => _ttsOk;
  List<String> get voices => _voices;

  /// 상단 상태 표시용. 실패해도 화면이 죽지 않게 전부 삼킨다.
  Future<void> refreshStatus() async {
    final results = await Future.wait([
      _ollama.ping(),
      _tts.ping(),
      _tts.voices(),
    ]);
    _ollamaOk = results[0] as bool;
    _ttsOk = results[1] as bool;
    _voices = results[2] as List<String>;
    notifyListeners();
  }

  @override
  void dispose() {
    unawaited(_tts.dispose());
    _ollama.dispose();
    super.dispose();
  }

  // ---------- 저장 ----------

  Future<void> Function()? _saveHandler;
  String? _saveMessage;
  bool _saveFailed = false;

  String? get saveMessage => _saveMessage;
  bool get saveFailed => _saveFailed;

  void registerSaveHandler(Future<void> Function()? fn) => _saveHandler = fn;

  void clearSaveMessage() {
    if (_saveMessage == null && !_saveFailed) return;
    _saveMessage = null;
    _saveFailed = false;
    notifyListeners();
  }

  /// 상단바 저장. 실패가 조용히 삼켜지면 사용자는 저장된 줄 알고 화면을 떠난다.
  Future<void> runSave() async {
    _saveMessage = null;
    _saveFailed = false;
    final handler = _saveHandler;
    if (handler == null) {
      _saveMessage = t('save_none');
      notifyListeners();
      return;
    }
    try {
      await handler();
    } catch (_) {
      _saveFailed = true;
      _saveMessage = t('save_fail');
    }
    notifyListeners();
  }
}

/// `unawaited`를 위해. dart:async를 통째로 들이지 않으려고 얇게 둔다.
void unawaited(Future<void> future) {
  future.catchError((Object _) {});
}
