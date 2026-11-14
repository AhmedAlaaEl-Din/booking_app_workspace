import 'package:intl/intl.dart';

import '../constants/booking_constants.dart';

/// Display helpers. All [DateTime]s passed in are expected in local time,
/// which is what Firestore's `Timestamp.toDate()` returns.
class Formatters {
  Formatters._();

  static final DateFormat _time = DateFormat.Hm(); // 09:30
  // Mon, 17 Nov 2026
  static final DateFormat _date = DateFormat('EEE, d MMM yyyy');
  static final DateFormat _weekday = DateFormat('EEE'); // Mon
  static final DateFormat _dayMonth = DateFormat('d MMM'); // 17 Nov

  static String time(DateTime dateTime) => _time.format(dateTime);
  static String date(DateTime dateTime) => _date.format(dateTime);
  static String weekday(DateTime dateTime) => _weekday.format(dateTime);
  static String dayMonth(DateTime dateTime) => _dayMonth.format(dateTime);

  /// For example "09:30 – 10:00".
  static String timeRange(DateTime start, int durationMinutes) {
    final end = start.add(Duration(minutes: durationMinutes));
    return '${time(start)} – ${time(end)}';
  }

  /// For example "$25" or "$12.50".
  static String price(double price) {
    final digits = price == price.roundToDouble() ? 0 : 2;
    return '${BookingConstants.currencySymbol}${price.toStringAsFixed(digits)}';
  }

  /// For example "30 min" or "1 h 30 min".
  static String duration(int minutes) {
    final hours = minutes ~/ 60;
    final rest = minutes % 60;
    if (hours == 0) return '$rest min';
    if (rest == 0) return '$hours h';
    return '$hours h $rest min';
  }
}
