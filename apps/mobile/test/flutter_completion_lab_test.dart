import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import '../lib/flutter_completion_lab.dart';

void main() {
  testWidgets('Flutter completion lab renders', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: FlutterCompletionLab()));
    expect(find.text('Genesis AI'), findsOneWidget);
  });
}
