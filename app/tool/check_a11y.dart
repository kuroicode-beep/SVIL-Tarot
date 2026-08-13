// tool/check_a11y.dart — 접근성 결정이 화면 코드에서 침식되는 것을 기계로 막는 게이트.
//
// 왜 필요한가
//   웹판은 비활성 버튼에 `disabled`가 아니라 `aria-disabled`를 쓴다. 의도적인 설계다 —
//   코드 주석: "disabled를 쓰면 탭 순서에서 빠져 상태를 알 길이 없어진다."
//   그런데 Flutter의 `onPressed: null`은 정확히 그 반대로 동작한다.
//   `button_style_button.dart`가 `enabled => onPressed != null`이고 `canRequestFocus: widget.enabled`라,
//   null을 넣는 순간 그 버튼은 포커스를 받을 수 없게 된다.
//
//   이건 모든 Flutter 예제·자동완성·LLM 보완의 기본값이라 "조심하자"로는 못 막는다.
//   마우스로 눈 테스트하면 절대 안 보이고, 툴체인도 아무 말을 하지 않는다.
//   그래서 화면 코드에서 Material 버튼과 `onPressed: null`을 아예 금지하고 빌드를 실패시킨다.
//
// 쓰는 법
//   dart run tool/check_a11y.dart
//   (CI·커밋 전 검사에 묶는다. 경고가 아니라 종료 코드 1이다.)
//
// 예외를 두지 않는 이유
//   정말 못 쓰게 해야 하는 버튼은 A11yButton의 softDisabled로 표현하거나, 아예 렌더하지 않는다.
//   "이번만" 예외를 허용하면 게이트가 존재하지 않는 것과 같아진다.

import 'dart:io';

/// 화면 코드에서 금지하는 위젯. 전부 `onPressed: null`이면 포커스를 잃는 계열이다.
const bannedWidgets = <String>[
  'ElevatedButton',
  'TextButton',
  'OutlinedButton',
  'FilledButton',
  'IconButton',
  'CupertinoButton',
];

/// 검사 대상. 화면과 위젯 조합 코드만 본다 — a11y 프리미티브 자신은 Material을 써도 된다.
const scannedDirs = <String>['lib/screens', 'lib/widgets'];

/// 이 경로들은 프리미티브 정의부라 금지 대상에서 제외한다.
const allowedPrefixes = <String>['lib/a11y/'];

class Finding {
  Finding(this.file, this.line, this.message);
  final String file;
  final int line;
  final String message;

  @override
  String toString() => '$file:$line  $message';
}

void main() {
  final findings = <Finding>[];

  for (final dirPath in scannedDirs) {
    final dir = Directory(dirPath);
    if (!dir.existsSync()) continue;

    for (final entity in dir.listSync(recursive: true)) {
      if (entity is! File || !entity.path.endsWith('.dart')) continue;

      final rel = entity.path.replaceAll(r'\', '/');
      if (allowedPrefixes.any(rel.startsWith)) continue;

      final lines = entity.readAsLinesSync();
      for (var i = 0; i < lines.length; i++) {
        final line = lines[i];
        // 주석 줄은 건너뛴다. 설계 의도를 적어 둔 주석이 게이트에 걸리면 안 된다.
        if (line.trimLeft().startsWith('//')) continue;

        for (final widget in bannedWidgets) {
          // 단어 경계로 본다. 'MyElevatedButtonWrapper' 같은 식별자에 걸리지 않게.
          if (RegExp('\\b$widget\\b').hasMatch(line)) {
            findings.add(Finding(rel, i + 1,
                '$widget 금지 — A11yButton을 쓴다 (onPressed: null이 포커스를 뺏는다)'));
          }
        }

        // 리터럴 `onPressed: null`. 변수를 넣는 경우는 잡지 못하지만,
        // 압도적 다수가 리터럴이라 여기서 대부분 걸린다.
        if (RegExp(r'onPressed\s*:\s*null').hasMatch(line)) {
          findings.add(Finding(rel, i + 1,
              'onPressed: null 금지 — 포커스를 잃는다. softDisabled를 쓴다'));
        }
      }
    }
  }

  if (findings.isEmpty) {
    final scanned = scannedDirs.where((d) => Directory(d).existsSync()).join(', ');
    stdout.writeln(
        'PASS — 접근성 게이트 통과${scanned.isEmpty ? ' (검사할 화면 코드 없음)' : ' ($scanned)'}');
    return;
  }

  stderr.writeln('FAIL — ${findings.length}건');
  for (final f in findings) {
    stderr.writeln('  $f');
  }
  stderr.writeln('');
  stderr.writeln('비활성 버튼은 A11yButton(softDisabled: true, disabledReason: ...)로 표현한다.');
  stderr.writeln('정말 쓸 수 없어야 하면 버튼을 렌더하지 않는다.');
  exit(1);
}
