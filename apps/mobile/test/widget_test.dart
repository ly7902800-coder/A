import 'package:flutter_test/flutter_test.dart';
import 'package:genesis_ai/main.dart';

void main() {
  testWidgets('Genesis AI app starts', (tester) async {
    await tester.pumpWidget(const GenesisApp());
    await tester.pump();
    expect(find.byType(GenesisHome), findsOneWidget);
  });
}
