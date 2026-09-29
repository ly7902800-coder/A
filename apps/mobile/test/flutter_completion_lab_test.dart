import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../lib/flutter_completion_lab.dart';

void main() {
  test('feature counter provider starts at zero', () {
    final container = ProviderContainer();
    addTearDown(container.dispose);
    expect(container.read(featureCounterProvider), 0);
  });

  testWidgets('production lab renders core sections', (tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: FlutterCompletionLab()),
      ),
    );
    await tester.pump();
    expect(find.text('Genesis Flutter Stack'), findsOneWidget);
    expect(find.text('5. Scrolling & Lists'), findsOneWidget);
    expect(find.text('15. Production'), findsOneWidget);
  });
}
