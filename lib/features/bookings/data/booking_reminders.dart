import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest.dart' as tz_data;
import 'package:timezone/timezone.dart' as tz;

import '../../../core/constants/booking_constants.dart';
import '../../../core/utils/formatters.dart';
import 'booking.dart';

enum ReminderResult { scheduled, tooSoon, notAllowed }

/// Local reminder notifications, scheduled on the phone itself.
/// No server or Cloud Functions involved, so it works on the free Spark plan.
class BookingReminders {
  final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();

  /// Android 8.0+ shows notifications only through a "channel", which users
  /// can switch on/off in the system settings under this name.
  static const AndroidNotificationChannel _channel = AndroidNotificationChannel(
    'booking_reminders',
    'Booking reminders',
    description: 'A reminder one hour before each booking',
    importance: Importance.high,
  );

  AndroidFlutterLocalNotificationsPlugin? get _android => _plugin
      .resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin
      >();

  /// Call once at app start.
  Future<void> init() async {
    tz_data.initializeTimeZones();
    await _plugin.initialize(
      settings: const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
      ),
    );
    // Create the channel up front (needed on Android 8.0+, ignored before).
    await _android?.createNotificationChannel(_channel);
  }

  /// Schedules a reminder [BookingConstants.reminderBefore] the booking.
  ///
  /// On Android 13+ this shows the system permission dialog the first time.
  /// On older versions there is no dialog; it just checks that notifications
  /// aren't switched off for the app.
  Future<ReminderResult> scheduleFor(Booking booking) async {
    final remindAt = booking.startAt.subtract(BookingConstants.reminderBefore);
    if (!remindAt.isAfter(DateTime.now())) return ReminderResult.tooSoon;

    final allowed = await _android?.requestNotificationsPermission() ?? false;
    if (!allowed) return ReminderResult.notAllowed;

    await _plugin.zonedSchedule(
      id: notificationId(booking.id),
      // A one-off reminder only needs the exact moment, so UTC is enough;
      // no need to know the phone's time zone name.
      scheduledDate: tz.TZDateTime.from(remindAt.toUtc(), tz.UTC),
      notificationDetails: NotificationDetails(
        android: AndroidNotificationDetails(
          _channel.id,
          _channel.name,
          channelDescription: _channel.description,
          importance: Importance.high,
          priority: Priority.high,
        ),
      ),
      // Inexact: may fire a few minutes late, but needs no special
      // "exact alarm" permission (required since Android 14).
      androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
      title: 'Upcoming: ${booking.serviceName}',
      body: 'Your booking starts at ${Formatters.time(booking.startAt)}.',
    );
    return ReminderResult.scheduled;
  }

  Future<void> cancelFor(String bookingId) {
    return _plugin.cancel(id: notificationId(bookingId));
  }

  /// Notifications are identified by an int, bookings by a string ID.
  /// This turns the booking ID into a stable 31-bit number (FNV-1a hash).
  /// String.hashCode is not used because it may differ between app runs.
  static int notificationId(String bookingId) {
    var hash = 0x811c9dc5;
    for (final unit in bookingId.codeUnits) {
      hash ^= unit;
      hash = (hash * 0x01000193) & 0x7fffffff;
    }
    return hash;
  }
}
