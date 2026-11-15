import 'package:booking_app/core/navigation/snack_bar_dismisser.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';

void main() {
  late SnackBarDismisser dismisser;

  /// A tiny app with one button that shows a snackbar and one that opens a
  /// second screen, wired up like the real app.
  Widget buildApp() {
    dismisser = SnackBarDismisser();
    return MaterialApp(
      scaffoldMessengerKey: dismisser.messengerKey,
      navigatorObservers: [dismisser],
      home: Builder(
        builder: (context) => Scaffold(
          body: Column(
            children: [
              TextButton(
                onPressed: () =>
                    ScaffoldMessenger.of(context)
                        .showSnackBar(const SnackBar(content: Text('Hello'))),
                child: const Text('show'),
              ),
              TextButton(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (context) => Scaffold(
                      body: TextButton(
                        // Like ConfirmBookingScreen: go back, THEN show.
                        onPressed: () {
                          final messenger = ScaffoldMessenger.of(context);
                          Navigator.of(context).pop();
                          messenger.showSnackBar(
                            const SnackBar(content: Text('Booked')),
                          );
                        },
                        child: const Text('done'),
                      ),
                    ),
                  ),
                ),
                child: const Text('open'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  testWidgets('opening a screen dismisses the snackbar', (tester) async {
    await tester.pumpWidget(buildApp());
    await tester.tap(find.text('show'));
    await tester.pumpAndSettle();
    expect(find.text('Hello'), findsOneWidget);

    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();

    expect(find.text('Hello'), findsNothing);
  });

  testWidgets('going back dismisses the snackbar', (tester) async {
    await tester.pumpWidget(buildApp());
    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();
    dismisser.messengerKey.currentState!.showSnackBar(
      const SnackBar(content: Text('Hello')),
    );
    await tester.pumpAndSettle();
    expect(find.text('Hello'), findsOneWidget);

    await tester.binding.handlePopRoute(); // The Android back button.
    await tester.pumpAndSettle();

    expect(find.text('Hello'), findsNothing);
  });

  testWidgets('a snackbar shown right after going back stays visible', (
    tester,
  ) async {
    await tester.pumpWidget(buildApp());
    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('done'));
    await tester.pumpAndSettle();

    expect(find.text('Booked'), findsOneWidget);
  });

  testWidgets('dismissSnackBars removes the snackbar', (tester) async {
    await tester.pumpWidget(buildApp());
    await tester.tap(find.text('show'));
    await tester.pumpAndSettle();

    dismissSnackBars(tester.element(find.text('show')));
    await tester.pumpAndSettle();

    expect(find.text('Hello'), findsNothing);
  });
}
