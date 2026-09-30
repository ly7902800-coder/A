import 'package:flutter_test/flutter_test.dart';
import 'package:genesis_ai/main.dart';

void main() {
  testWidgets('Flutter app smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const MyApp());
    expect(find.text('Flutter Demo Home Page'), findsOneWidget);
    expect(find.text('0'), findsOneWidget);
  });
}
