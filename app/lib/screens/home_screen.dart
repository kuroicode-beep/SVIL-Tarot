// lib/screens/home_screen.dart — 홈. 기능 타일 목록.
//
// 웹판 HomePage.tsx의 타일 18개를 그대로 옮겼다. 아직 대상 화면이 없는 타일은
// softDisabled로 두어 **목록에서 지우지 않는다** — 무엇이 준비 중인지 보이는 편이,
// 화면이 하나씩 생길 때마다 목록이 늘어나는 것보다 이해하기 쉽다.

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../a11y/a11y_button.dart';
import '../a11y/a11y_theme.dart';
import '../state/app_state.dart';

/// 타일 하나. [ready]가 false면 아직 포팅되지 않은 화면이다.
class _Tile {
  const _Tile(this.path, this.labelKey, this.icon, {this.hintKey, this.ready = false});

  final String path;
  final String labelKey;
  final IconData icon;
  final String? hintKey;
  final bool ready;
}

const List<_Tile> _tiles = [
  // 설정은 상단바에도 있지만, 저시력 사용자가 상단바를 훑기 전에 홈에서 바로 닿을 수 있어야 한다.
  _Tile('/settings', 'nav_settings', Icons.settings, ready: true),
  _Tile('/daily', 'home_daily', Icons.wb_twilight, hintKey: 'daily_desc'),
  _Tile('/customers', 'home_customers', Icons.people),
  _Tile('/consultations', 'home_consultations', Icons.folder_shared),
  _Tile('/stats', 'home_stats', Icons.bar_chart, hintKey: 'stats_desc'),
  _Tile('/review', 'home_review', Icons.repeat, hintKey: 'home_review_hint'),
  _Tile('/learn', 'home_learn', Icons.menu_book),
  _Tile('/dictionary', 'home_dictionary', Icons.local_library),
  _Tile('/spreads', 'home_spreads', Icons.style),
  _Tile('/spread-builder', 'home_spread_builder', Icons.build),
  _Tile('/practice', 'home_practice', Icons.auto_awesome, hintKey: 'home_practice_hint'),
  _Tile('/ai', 'home_ai', Icons.smart_toy),
  _Tile('/soul', 'home_soul', Icons.auto_awesome_motion),
  _Tile('/dream', 'home_dream', Icons.nightlight),
  _Tile('/calendar', 'home_calendar', Icons.calendar_month, hintKey: 'home_calendar_hint'),
  _Tile('/saju', 'home_saju', Icons.article),
  _Tile('/compat', 'home_compat', Icons.favorite),
  _Tile('/nameology', 'home_nameology', Icons.abc),
  _Tile('/naming', 'home_naming', Icons.child_care),
];

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final p = context.colors;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Semantics(
            header: true,
            child: Text(
              app.t('brand'),
              style: TextStyle(color: p.text, fontSize: 34, fontWeight: FontWeight.w700),
            ),
          ),
          const SizedBox(height: 6),
          Text(app.t('tagline'), style: TextStyle(color: p.textSub)),
          const SizedBox(height: 20),
          // 고정 열 수를 쓰지 않는다. 글자를 크게 쓰면 타일도 커져 2열이 안 들어간다.
          LayoutBuilder(
            builder: (context, constraints) {
              const minTileWidth = 300.0;
              final columns = (constraints.maxWidth / minTileWidth).floor().clamp(1, 3);
              return Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  for (final tile in _tiles)
                    SizedBox(
                      width: columns == 1
                          ? constraints.maxWidth
                          : (constraints.maxWidth - 12 * (columns - 1)) / columns,
                      child: _TileButton(tile: tile),
                    ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

class _TileButton extends StatelessWidget {
  const _TileButton({required this.tile});

  final _Tile tile;

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final label = app.t(tile.labelKey);
    final hint = tile.hintKey == null ? null : app.t(tile.hintKey!);

    return A11yButton(
      label: hint == null ? label : '$label\n$hint',
      icon: tile.icon,
      expand: true,
      variant: A11yButtonVariant.primary,
      // 아직 없는 화면은 지우지 않고 사유를 붙여 둔다.
      softDisabled: !tile.ready,
      disabledReason: tile.ready ? null : app.t('loading'),
      semanticLabel: hint == null ? label : '$label. $hint',
      onPressed: () => context.go(tile.path),
    );
  }
}
