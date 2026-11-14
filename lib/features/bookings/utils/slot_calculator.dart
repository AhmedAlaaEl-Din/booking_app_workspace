import '../../../core/constants/booking_constants.dart';

/// Pure date/time logic for bookings. No Firebase and no Flutter, which makes
/// it easy to unit test (see test/features/bookings/slot_calculator_test.dart).
class SlotCalculator {
  SlotCalculator._();

  /// The days a customer can pick: today plus the following days,
  /// [BookingConstants.bookingWindowDays] in total, each at midnight local time.
  static List<DateTime> bookableDays(DateTime now) {
    return List.generate(
      BookingConstants.bookingWindowDays,
      // DateTime(y, m, d + i) rolls over months/years correctly and, unlike
      // adding Duration(days: i), is not shifted by daylight saving changes.
      (i) => DateTime(now.year, now.month, now.day + i),
    );
  }

  /// Start times on [day] for a service lasting [durationMinutes].
  ///
  /// A slot starts every [BookingConstants.slotIntervalMinutes] from opening
  /// time, must end by closing time, and must start after [now] (so no
  /// past times today).
  static List<DateTime> slotsForDay({
    required DateTime day,
    required int durationMinutes,
    required DateTime now,
  }) {
    final closing = DateTime(
      day.year,
      day.month,
      day.day,
      BookingConstants.closingHour,
    );
    final slots = <DateTime>[];
    for (var minutes = 0; ; minutes += BookingConstants.slotIntervalMinutes) {
      final start = DateTime(
        day.year,
        day.month,
        day.day,
        BookingConstants.openingHour,
        minutes, // Minutes above 59 roll over into hours.
      );
      final end = start.add(Duration(minutes: durationMinutes));
      if (end.isAfter(closing)) break;
      if (start.isAfter(now)) slots.add(start);
    }
    return slots;
  }

  /// Firestore document ID for the slot of [serviceId] starting at [startAt],
  /// e.g. `haircut_1763373600000`. The same service and time always give the
  /// same ID, which is what prevents double booking. The security rules
  /// rebuild this ID the same way, so keep the two in sync.
  static String slotId(String serviceId, DateTime startAt) {
    return '${serviceId}_${startAt.millisecondsSinceEpoch}';
  }
}
