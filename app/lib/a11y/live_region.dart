// lib/a11y/live_region.dart — 상태 알림(role="status" / role="alert" 대체).
//
// 웹과 Flutter의 방향이 정반대다. 그 반전을 여기서 흡수한다.
//
//   웹: aria-live 영역은 **DOM이 바뀔 때** 읽힌다. 같은 문자열을 다시 넣으면 아무 일도 없다.
//       HistoryPage가 "비웠다 다시 넣기"로 우회하던 문제가 그것이다.
//   Flutter: SemanticsService.announce는 **부를 때마다** 읽는 일회성 이벤트다.
//       위젯이 리빌드될 때마다 부르면 같은 문구를 계속 반복해 읽는다.
//
// 그래서 여기서는 (문구, 세대)로 중복을 제거한다. 문구가 실제로 바뀔 때만 알리고,
// 같은 문구를 의도적으로 다시 알리고 싶으면 세대를 올린다.

import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';

/// 알림 급함 정도.
enum LiveRegionLevel {
  /// role="status" — 지금 하던 일을 끊지 않고 알린다.
  polite,

  /// role="alert" — 즉시 알린다. 오류·저장 실패처럼 놓치면 안 되는 것만.
  assertive,
}

/// 문구가 바뀔 때만 읽어 주는 영역.
///
/// [message]가 null이거나 비면 아무것도 그리지 않고 알리지도 않는다.
/// [generation]을 올리면 같은 문구도 다시 알린다 — "내보내기" 버튼을 두 번 눌렀을 때처럼
/// 결과 문구는 같지만 사용자에게는 새 사건인 경우에 쓴다.
class LiveRegion extends StatefulWidget {
  const LiveRegion({
    super.key,
    required this.message,
    this.level = LiveRegionLevel.polite,
    this.generation = 0,
    this.style,
  });

  final String? message;
  final LiveRegionLevel level;
  final int generation;
  final TextStyle? style;

  @override
  State<LiveRegion> createState() => _LiveRegionState();
}

class _LiveRegionState extends State<LiveRegion> {
  String? _announced;
  int _announcedGeneration = -1;

  @override
  void initState() {
    super.initState();
    _maybeAnnounce();
  }

  @override
  void didUpdateWidget(LiveRegion old) {
    super.didUpdateWidget(old);
    _maybeAnnounce();
  }

  void _maybeAnnounce() {
    final msg = widget.message;
    if (msg == null || msg.isEmpty) return;
    // 같은 문구 + 같은 세대면 이미 읽었다. 리빌드마다 반복 낭독하는 것을 막는다.
    if (msg == _announced && widget.generation == _announcedGeneration) return;

    _announced = msg;
    _announcedGeneration = widget.generation;

    // 빌드 중에 부르면 시맨틱 트리가 아직 갱신되지 않아 순서가 어긋난다.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      SemanticsService.sendAnnouncement(
        View.of(context),
        msg,
        Directionality.of(context),
        assertiveness: widget.level == LiveRegionLevel.assertive
            ? Assertiveness.assertive
            : Assertiveness.polite,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final msg = widget.message;
    if (msg == null || msg.isEmpty) return const SizedBox.shrink();

    // 화면에도 반드시 글자로 남긴다. 소리로만 알리면 청각을 안 쓰는 저시력 사용자가 놓친다.
    return Semantics(
      liveRegion: true,
      child: Text(msg, style: widget.style),
    );
  }
}
