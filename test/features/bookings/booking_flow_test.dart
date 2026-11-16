import 'dart:async';

import 'package:booking_app/core/theme/app_theme.dart';
import 'package:booking_app/core/utils/formatters.dart';
import 'package:booking_app/features/auth/screens/auth_gate.dart';
import 'package:booking_app/features/bookings/data/booking_repository.dart';
import 'package:booking_app/features/bookings/screens/confirm_booking_screen.dart';
import 'package:booking_app/features/bookings/screens/my_bookings_screen.dart';
import 'package:booking_app/features/services/screens/services_screen.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';

import '../../helpers/fake_booking_data.dart';

DateTime tomorrowAt(int hour) {
  final now = DateTime.now();
  return DateTime(now.year, now.month, now.day + 1, hour);
}

/// Opens Haircut, picks tomorrow 10:00 and goes to the confirm screen.
Future<void> chooseTomorrowTen(WidgetTester tester) async {
  await tester.tap(find.text('Haircut'));
  await tester.pumpAndSettle();
  await tester.tap(find.textContaining(Formatters.dayMonth(tomorrowAt(10))));
  await tester.pumpAndSettle();
  await tester.tap(find.text('10:00'));
  await tester.pumpAndSettle();
  await tester.tap(find.text('Continue with 10:00'));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('book a slot, see it in My bookings, cancel it; double taps '
      'are ignored', (tester) async {
    final bookings = FakeBookingRepository()..holdCreate = Completer<void>();
    final reminders = FakeReminders();
    await tester.pumpWidget(
      buildSignedInApp(
        home: const AuthGate(),
        bookings: bookings,
        reminders: reminders,
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Services'), findsWidgets);

    // A double tap on the service card opens the booking flow only once.
    await tester.tap(find.text('Haircut'));
    await tester.tap(find.text('Haircut'), warnIfMissed: false);
    await tester.pumpAndSettle();
    expect(find.byType(BackButton), findsOneWidget);
    await tester.pageBack();
    await tester.pumpAndSettle();

    await chooseTomorrowTen(tester);
    expect(find.byType(ConfirmBookingScreen), findsOneWidget);
    expect(find.text('Haircut'), findsWidgets);

    // Two taps in the same frame: only one booking is created.
    await tester.tap(find.widgetWithText(FilledButton, 'Confirm booking'));
    await tester.tap(find.widgetWithText(FilledButton, 'Confirm booking'));
    await tester.pump();
    expect(bookings.created, hasLength(1));
    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    bookings.holdCreate!.complete();
    await tester.pumpAndSettle();
    expect(find.byType(ConfirmBookingScreen), findsNothing);
    expect(find.textContaining('Booked Haircut'), findsOneWidget);
    expect(reminders.scheduled, ['b1']);
    expect(bookings.created.single.startAt, tomorrowAt(10));

    await tester.tap(find.text('My bookings'));
    await tester.pumpAndSettle();
    expect(find.text('Confirmed'), findsOneWidget);

    // A double tap on "Cancel booking" opens one dialog.
    await tester.tap(find.widgetWithText(TextButton, 'Cancel booking'));
    await tester.tap(
      find.widgetWithText(TextButton, 'Cancel booking'),
      warnIfMissed: false,
    );
    await tester.pumpAndSettle();
    expect(find.byType(AlertDialog), findsOneWidget);
    await tester.tap(
      find.descendant(
        of: find.byType(AlertDialog),
        matching: find.text('Cancel booking'),
      ),
    );
    await tester.pumpAndSettle();

    expect(bookings.cancelled, hasLength(1));
    expect(find.text('Booking cancelled.'), findsOneWidget);
    expect(find.text('No upcoming bookings.'), findsOneWidget);
  });

  testWidgets('a slot taken by someone else shows a clear message', (
    tester,
  ) async {
    await tester.pumpWidget(
      buildSignedInApp(
        home: const AuthGate(),
        bookings: FakeBookingRepository(createError: SlotTakenException()),
      ),
    );
    await tester.pumpAndSettle();
    await chooseTomorrowTen(tester);

    await tester.tap(find.widgetWithText(FilledButton, 'Confirm booking'));
    await tester.pumpAndSettle();
    expect(
      find.textContaining('that time was just booked by someone else'),
      findsOneWidget,
    );
    expect(find.byType(ConfirmBookingScreen), findsOneWidget);
  });

  testWidgets('taken times are disabled', (tester) async {
    await tester.pumpWidget(
      buildSignedInApp(
        home: const AuthGate(),
        bookings: FakeBookingRepository(taken: {tomorrowAt(10)}),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Haircut'));
    await tester.pumpAndSettle();
    await tester.tap(find.textContaining(Formatters.dayMonth(tomorrowAt(10))));
    await tester.pumpAndSettle();

    final chip = tester.widget<ChoiceChip>(
      find.ancestor(of: find.text('10:00'), matching: find.byType(ChoiceChip)),
    );
    expect(chip.onSelected, isNull);
  });

  group('services list states', () {
    testWidgets('loading', (tester) async {
      await tester.pumpWidget(
        buildSignedInApp(
          home: const ServicesScreen(),
          services: FakeServicesRepository(const Stream.empty()),
        ),
      );
      await tester.pump();
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('empty', (tester) async {
      await tester.pumpWidget(
        buildSignedInApp(
          home: const ServicesScreen(),
          services: FakeServicesRepository.withServices([]),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('No services available yet.'), findsOneWidget);
    });

    testWidgets('Firebase error: friendly message, no raw exception', (
      tester,
    ) async {
      await tester.pumpWidget(
        buildSignedInApp(
          home: const ServicesScreen(),
          services: FakeServicesRepository(
            Stream.error(
              FirebaseException(
                plugin: 'cloud_firestore',
                code: 'permission-denied',
                message: 'PERMISSION_DENIED: raw details',
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('You do not have permission to do that.'), findsOne);
      expect(find.textContaining('PERMISSION_DENIED'), findsNothing);
    });

    testWidgets('unknown error: generic message', (tester) async {
      await tester.pumpWidget(
        buildSignedInApp(
          home: const ServicesScreen(),
          services: FakeServicesRepository(
            Stream.error(StateError('Bad state: something internal')),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Something went wrong. Please try again.'), findsOne);
      expect(find.textContaining('Bad state'), findsNothing);
    });
  });

  group('small phone, text scale 1.3, light and dark', () {
    for (final (name, theme) in [
      ('light', AppTheme.light()),
      ('dark', AppTheme.dark()),
    ]) {
      testWidgets('$name: every booking screen lays out without overflow', (
        tester,
      ) async {
        tester.view.physicalSize = const Size(720, 1280); // 360 x 640 dp.
        tester.view.devicePixelRatio = 2;
        addTearDown(tester.view.reset);

        final bookings = FakeBookingRepository();
        await bookings.createBooking(
          userId: demoCustomer.uid,
          service: manicure,
          startAt: tomorrowAt(14),
        );
        await tester.pumpWidget(
          buildSignedInApp(
            home: const AuthGate(),
            services: FakeServicesRepository.withServices([haircut, manicure]),
            bookings: bookings,
            theme: theme,
            textScale: 1.3,
          ),
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull, reason: 'services');

        await chooseTomorrowTen(tester);
        expect(tester.takeException(), isNull, reason: 'choose + confirm');

        await tester.pageBack();
        await tester.pumpAndSettle();
        await tester.pageBack();
        await tester.pumpAndSettle();
        await tester.tap(find.text('My bookings'));
        await tester.pumpAndSettle();
        expect(find.byType(MyBookingsScreen), findsOneWidget);
        expect(find.text('Manicure'), findsOneWidget);
        expect(tester.takeException(), isNull, reason: 'my bookings');

        await tester.tap(find.text('Profile'));
        await tester.pumpAndSettle();
        expect(find.text('Lina Youssef'), findsOneWidget);
        expect(tester.takeException(), isNull, reason: 'profile');
      });
    }
  });
}
