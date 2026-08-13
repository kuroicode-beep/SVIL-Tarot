// lib/screens/settings_screen.dart — 설정.
//
// 이 화면이 a11y 레이어를 끝까지 훑는 유일한 화면이다. 글자 크기 5단계 × 대비 3종을
// 여기서 바꿀 수 있으므로, 15조합에서 레이아웃이 살아남는지가 여기서 판명된다.

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../a11y/a11y_button.dart';
import '../a11y/a11y_theme.dart';
import '../a11y/tokens.dart';
import '../i18n/i18n.dart';
import '../i18n/strings.dart';
import '../state/app_state.dart';
import '../version.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final p = context.colors;
    final systemScale = MediaQuery.textScalerOf(context).scale(16) / 16;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Semantics(
            header: true,
            child: Text(
              app.t('settings_title'),
              style: TextStyle(color: p.text, fontSize: 30, fontWeight: FontWeight.w700),
            ),
          ),
          const SizedBox(height: 20),

          _Section(
            title: app.t('settings_font_size'),
            children: [
              _ChoiceRow(
                options: [
                  for (final step in FontSizeStep.values)
                    _Choice(
                      id: step.id,
                      // 라벨에 px 수치가 들어 있다(웹판 그대로). 값이 곧 설명이다.
                      label: app.t('size_${step.id}'),
                      selected: app.settings.fontSize == step,
                      onSelect: () => app.setFontSize(step),
                    ),
                ],
              ),
              // 시스템 배율이 곱해진다는 사실을 숨기면 "보통으로 뒀는데 왜 크지"가 설명되지 않는다.
              if (systemScale > 1.01)
                Padding(
                  padding: const EdgeInsets.only(top: 10),
                  child: Text(
                    app.t('settings_system_scale', {'pct': (systemScale * 100).round()}),
                    style: TextStyle(color: p.textSub),
                  ),
                ),
              if (isTextScaleClamped(step: app.settings.fontSize, systemScale: systemScale))
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(
                    app.t('settings_scale_clamped'),
                    style: TextStyle(color: p.warning),
                  ),
                ),
            ],
          ),

          _Section(
            title: app.t('settings_contrast'),
            children: [
              _ChoiceRow(
                options: [
                  _Choice(
                    id: 'standard',
                    label: app.t('contrast_standard'),
                    selected: app.settings.contrast == ContrastMode.standard,
                    onSelect: () => app.setContrast(ContrastMode.standard),
                  ),
                  _Choice(
                    id: 'max',
                    label: app.t('contrast_max'),
                    selected: app.settings.contrast == ContrastMode.max,
                    onSelect: () => app.setContrast(ContrastMode.max),
                  ),
                  _Choice(
                    id: 'soft',
                    label: app.t('contrast_soft'),
                    selected: app.settings.contrast == ContrastMode.soft,
                    onSelect: () => app.setContrast(ContrastMode.soft),
                  ),
                ],
              ),
              // OS 고대비가 켜지면 사용자 선택보다 우선한다. 왜 안 바뀌는지 글자로 알린다.
              if (app.systemHighContrast)
                Padding(
                  padding: const EdgeInsets.only(top: 10),
                  child: Text(
                    app.t('settings_system_high_contrast'),
                    style: TextStyle(color: p.warning, fontWeight: FontWeight.w700),
                  ),
                ),
            ],
          ),

          _Section(
            title: app.t('settings_plain_bg'),
            children: [
              Text(app.t('settings_plain_bg_hint'), style: TextStyle(color: p.textSub)),
              const SizedBox(height: 10),
              // 웹판과 같은 단일 토글. 상태를 색이 아니라 켬/끔 글자로 알린다.
              _ChoiceRow(
                options: [
                  _Choice(
                    id: 'plain',
                    label:
                        '${app.t('settings_plain_bg')} · ${app.settings.plainBackground ? app.t('viewer_on') : app.t('viewer_off')}',
                    selected: app.settings.plainBackground,
                    onSelect: () => app.setPlainBackground(!app.settings.plainBackground),
                  ),
                ],
              ),
            ],
          ),

          _Section(
            title: app.t('settings_font'),
            children: [
              _ChoiceRow(
                options: [
                  for (final f in fontOptions)
                    _Choice(
                      id: f.id,
                      // 미확보 글꼴은 골라도 아무 일이 없다. 그 사실을 라벨에 드러낸다 —
                      // 조용히 기본 글꼴로 렌더되면 "고장"으로 읽힌다.
                      label: f.family == null ? '${f.label} (${app.t('loading')})' : f.label,
                      selected: app.settings.fontId == f.id,
                      softDisabled: f.family == null,
                      disabledReason: f.family == null ? app.t('loading') : null,
                      onSelect: () => app.setFontId(f.id),
                    ),
                ],
              ),
            ],
          ),

          _Section(
            title: app.t('settings_lang'),
            children: [
              _ChoiceRow(
                options: [
                  for (final loc in supportedLocales)
                    _Choice(
                      id: loc,
                      label: _localeLabel(loc),
                      selected: app.settings.locale == loc,
                      onSelect: () => app.setLocale(loc),
                    ),
                ],
              ),
            ],
          ),

          _Section(
            title: app.t('settings_history'),
            children: [
              for (final entry in versionHistory) ...[
                Text(
                  'v${entry.version} · ${entry.date}',
                  style: TextStyle(
                    color: p.text,
                    fontWeight: FontWeight.w700,
                    fontFamily: 'Consolas',
                  ),
                ),
                const SizedBox(height: 6),
                for (final line in entry.lines)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Text('· $line', style: TextStyle(color: p.textSub)),
                  ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

String _localeLabel(String code) => switch (code) {
      'ko' => '한국어',
      'en' => 'English',
      'ja' => '日本語',
      'zh' => '中文',
      'vi' => 'Tiếng Việt',
      _ => code,
    };

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final p = context.colors;
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: p.surface,
        border: Border.all(color: p.border, width: A11yMetrics.borderThin),
        borderRadius: BorderRadius.circular(A11yMetrics.radiusLarge),
      ),
      child: Semantics(
        container: true,
        label: title,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: TextStyle(color: p.text, fontSize: 20, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 12),
            ...children,
          ],
        ),
      ),
    );
  }
}

class _Choice {
  const _Choice({
    required this.id,
    required this.label,
    required this.selected,
    required this.onSelect,
    this.softDisabled = false,
    this.disabledReason,
  });

  final String id;
  final String label;
  final bool selected;
  final VoidCallback onSelect;
  final bool softDisabled;
  final String? disabledReason;
}

/// 선택지 묶음. 선택 상태를 색이 아니라 **글자와 시맨틱**으로도 알린다.
class _ChoiceRow extends StatelessWidget {
  const _ChoiceRow({required this.options});

  final List<_Choice> options;

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: [
        for (final o in options)
          Semantics(
            // aria-pressed 대응. 선택 상태가 보조기술에 전달된다.
            toggled: o.selected,
            child: A11yButton(
              // 색만으로 선택을 표시하지 않는다 — 선택된 항목에 표시를 붙인다.
              label: o.selected ? '✓ ${o.label}' : o.label,
              semanticLabel: o.selected ? '${o.label}, ${app.t('selected')}' : o.label,
              variant: o.selected ? A11yButtonVariant.primary : A11yButtonVariant.normal,
              softDisabled: o.softDisabled,
              disabledReason: o.disabledReason,
              onPressed: o.onSelect,
            ),
          ),
      ],
    );
  }
}
