/// Business rules for bookings. Change them here and the whole app follows.
class BookingConstants {
  BookingConstants._();

  /// Opening and closing time, as hours in the user's local time zone.
  static const int openingHour = 9; // 09:00
  static const int closingHour = 17; // 17:00

  /// A new appointment can start every [slotIntervalMinutes].
  static const int slotIntervalMinutes = 30;

  /// Customers can book today and the following days, this many days in total.
  static const int bookingWindowDays = 14;

  /// When the local reminder notification fires.
  static const Duration reminderBefore = Duration(hours: 1);

  /// Shown in front of prices. Change it to your currency.
  static const String currencySymbol = '\$';
}
