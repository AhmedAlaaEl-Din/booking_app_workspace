import 'package:booking_app/core/constants/booking_constants.dart';
import 'package:booking_app/core/utils/formatters.dart';
import 'package:booking_app/features/bookings/utils/slot_calculator.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('bookableDays', () {
    test('returns 14 consecutive days starting today at midnight', () {
      final days = SlotCalculator.bookableDays(DateTime(2026, 11, 14, 15, 42));

      expect(days, hasLength(BookingConstants.bookingWindowDays));
      expect(days.first, DateTime(2026, 11, 14));
      expect(days.last, DateTime(2026, 11, 27));
    });

    test('rolls over into the next month and year', () {
      final days = SlotCalculator.bookableDays(DateTime(2026, 12, 25, 9));

      expect(days[6], DateTime(2026, 12, 31));
      expect(days[7], DateTime(2027, 1, 1));
    });
  });

  group('slotsForDay', () {
    final tomorrow = DateTime(2026, 11, 15);
    final now = DateTime(2026, 11, 14, 12);

    List<String> times(List<DateTime> slots) =>
        slots.map(Formatters.time).toList();

    test('30-minute service: every 30 minutes from 09:00 to 16:30', () {
      final slots = SlotCalculator.slotsForDay(
        day: tomorrow,
        durationMinutes: 30,
        now: now,
      );

      expect(slots, hasLength(16));
      expect(slots.first, DateTime(2026, 11, 15, 9, 0));
      expect(slots.last, DateTime(2026, 11, 15, 16, 30));
      expect(times(slots).take(3), ['09:00', '09:30', '10:00']);
    });

    test('longer service must still end by closing time', () {
      final slots = SlotCalculator.slotsForDay(
        day: tomorrow,
        durationMinutes: 90,
        now: now,
      );

      // 15:30 + 90 min = 17:00 is the last one that fits.
      expect(slots.last, DateTime(2026, 11, 15, 15, 30));
      expect(slots, hasLength(14));
    });

    test('today: hides times that have already started', () {
      final slots = SlotCalculator.slotsForDay(
        day: DateTime(2026, 11, 14),
        durationMinutes: 30,
        now: DateTime(2026, 11, 14, 10, 15),
      );

      expect(slots.first, DateTime(2026, 11, 14, 10, 30));
    });

    test('today: a slot starting exactly now is not offered', () {
      final slots = SlotCalculator.slotsForDay(
        day: DateTime(2026, 11, 14),
        durationMinutes: 30,
        now: DateTime(2026, 11, 14, 10, 0),
      );

      expect(slots.first, DateTime(2026, 11, 14, 10, 30));
    });

    test('today after closing: no slots', () {
      final slots = SlotCalculator.slotsForDay(
        day: DateTime(2026, 11, 14),
        durationMinutes: 30,
        now: DateTime(2026, 11, 14, 17, 5),
      );

      expect(slots, isEmpty);
    });

    test('service longer than the working day: no slots', () {
      final slots = SlotCalculator.slotsForDay(
        day: tomorrow,
        durationMinutes: 9 * 60,
        now: now,
      );

      expect(slots, isEmpty);
    });
  });

  group('slotId', () {
    test('is serviceId plus start time in milliseconds', () {
      final start = DateTime.utc(2030, 1, 7, 10);

      // 2030-01-07 10:00 UTC = 1894010400 seconds since 1970-01-01 UTC.
      expect(SlotCalculator.slotId('haircut', start), 'haircut_1894010400000');
    });

    test('same service and time always give the same ID', () {
      final a = DateTime(2026, 11, 15, 9, 30);
      final b = DateTime(2026, 11, 15, 9, 30);

      expect(
        SlotCalculator.slotId('styling', a),
        SlotCalculator.slotId('styling', b),
      );
      expect(
        SlotCalculator.slotId('styling', a),
        isNot(SlotCalculator.slotId('coloring', a)),
      );
    });
  });
}
