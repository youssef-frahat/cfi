import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:cfi_record/main.dart';

void main() {
  testWidgets('CFI Report App smoke test', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1920, 1080);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    await tester.pumpWidget(const CFIReportApp());
    expect(find.byType(CFIReportApp), findsOneWidget);
    await tester.pump(const Duration(milliseconds: 100));
  });
}
