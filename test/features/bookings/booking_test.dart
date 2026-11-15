import 'package:booking_app/features/bookings/data/booking.dart';
import 'package:booking_app/features/bookings/data/booking_reminders.dart';
import 'package:booking_app/features/bookings/utils/slot_calculator.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final startAt = DateTime(2026, 11, 20, 10, 30);

  Map<String, dynamic> firestoreData({String status = 'confirmed'}) => {
    'userId': 'user-1',
    'serviceId': 'haircut',
    'serviceName': 'Haircut',
    'startAt': Timestamp.fromDate(startAt),
    'durationMinutes': 30,
    'status': status,
    'createdAt': Timestamp.fromDate(DateTime(2026, 11, 14, 8)),
  };

  group('Booking.fromMap', () {
    test('reads all fields, with times in local time', () {
      final booking = Booking.fromMap('b1', firestoreData());

      expect(booking.id, 'b1');
      expect(booking.userId, 'user-1');
      expect(booking.serviceId, 'haircut');
      expect(booking.serviceName, 'Haircut');
      expect(booking.startAt, startAt);
      expect(booking.startAt.isUtc, isFalse);
      expect(booking.durationMinutes, 30);
      expect(booking.status, BookingStatus.confirmed);
      expect(booking.createdAt, DateTime(2026, 11, 14, 8));
    });

    test('reads the cancelled status', () {
      final booking = Booking.fromMap('b1', firestoreData(status: 'cancelled'));

      expect(booking.status, BookingStatus.cancelled);
    });

    test('treats an unknown status as cancelled', () {
      final booking = Booking.fromMap('b1', firestoreData(status: 'weird'));

      expect(booking.status, BookingStatus.cancelled);
    });

    test('createdAt is null while the server timestamp is pending', () {
      final data = firestoreData()..['createdAt'] = null;

      expect(Booking.fromMap('b1', data).createdAt, isNull);
    });
  });

  test('toMap and fromMap round-trip', () {
    final original = Booking.fromMap('b1', firestoreData());
    final copy = Booking.fromMap('b1', original.toMap());

    expect(copy.userId, original.userId);
    expect(copy.serviceId, original.serviceId);
    expect(copy.serviceName, original.serviceName);
    expect(copy.startAt, original.startAt);
    expect(copy.durationMinutes, original.durationMinutes);
    expect(copy.status, original.status);
    expect(original.toMap().containsKey('createdAt'), isFalse);
  });

  group('derived values', () {
    final booking = Booking.fromMap('b1', firestoreData());

    test('endAt adds the duration', () {
      expect(booking.endAt, DateTime(2026, 11, 20, 11, 0));
    });

    test('slotId matches the slot calculator', () {
      expect(booking.slotId, SlotCalculator.slotId('haircut', startAt));
    });

    test('upcoming confirmed bookings can be cancelled', () {
      final before = DateTime(2026, 11, 20, 10, 29);

      expect(booking.isUpcoming(before), isTrue);
      expect(booking.canCancel(before), isTrue);
    });

    test('bookings that started cannot be cancelled', () {
      final after = DateTime(2026, 11, 20, 10, 30);

      expect(booking.isUpcoming(after), isFalse);
      expect(booking.canCancel(after), isFalse);
    });

    test('cancelled bookings cannot be cancelled again', () {
      final cancelled = Booking.fromMap(
        'b1',
        firestoreData(status: 'cancelled'),
      );

      expect(cancelled.canCancel(DateTime(2026, 11, 1)), isFalse);
    });
  });

  group('splitBookings', () {
    final now = DateTime(2026, 11, 15, 12);

    Booking make(String id, DateTime startAt, BookingStatus status) => Booking(
      id: id,
      userId: 'user-1',
      serviceId: 'haircut',
      serviceName: 'Haircut',
      startAt: startAt,
      durationMinutes: 30,
      status: status,
    );

    final soonConfirmed = make(
      'a',
      DateTime(2026, 11, 16, 9),
      BookingStatus.confirmed,
    );
    final laterConfirmed = make(
      'b',
      DateTime(2026, 11, 20, 9),
      BookingStatus.confirmed,
    );
    final futureCancelled = make(
      'c',
      DateTime(2026, 11, 18, 9),
      BookingStatus.cancelled,
    );
    final pastConfirmed = make(
      'd',
      DateTime(2026, 11, 10, 9),
      BookingStatus.confirmed,
    );
    final pastCancelled = make(
      'e',
      DateTime(2026, 11, 1, 9),
      BookingStatus.cancelled,
    );

    final split = splitBookings([
      pastCancelled,
      laterConfirmed,
      futureCancelled,
      soonConfirmed,
      pastConfirmed,
    ], now);

    List<String> ids(List<Booking> list) => list.map((b) => b.id).toList();

    test('upcoming: only confirmed future bookings, soonest first', () {
      expect(ids(split.upcoming), ['a', 'b']);
    });

    test(
      'past: started or cancelled (even if in the future), newest first',
      () {
        expect(ids(split.past), ['c', 'd', 'e']);
      },
    );
  });

  group('BookingReminders.notificationId', () {
    test('is stable and a positive 31-bit number', () {
      final id = BookingReminders.notificationId('AbC123xyz');

      expect(BookingReminders.notificationId('AbC123xyz'), id);
      expect(id, inInclusiveRange(0, 0x7fffffff));
    });

    test('differs for different bookings', () {
      expect(
        BookingReminders.notificationId('booking-a'),
        isNot(BookingReminders.notificationId('booking-b')),
      );
    });
  });
}
