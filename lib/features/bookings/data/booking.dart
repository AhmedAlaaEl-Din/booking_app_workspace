import 'package:cloud_firestore/cloud_firestore.dart';

import '../utils/slot_calculator.dart';

enum BookingStatus { confirmed, cancelled }

/// A customer's booking, stored in Firestore at `bookings/{id}`.
class Booking {
  const Booking({
    required this.id,
    required this.userId,
    required this.serviceId,
    required this.serviceName,
    required this.startAt,
    required this.durationMinutes,
    required this.status,
    this.createdAt,
  });

  final String id;
  final String userId;
  final String serviceId;

  /// Copied from the service so the bookings list needs no extra reads.
  final String serviceName;

  /// In local time (Firestore stores the exact moment, the app shows it local).
  final DateTime startAt;
  final int durationMinutes;
  final BookingStatus status;

  /// Set by the server; null until the server has confirmed the write.
  final DateTime? createdAt;

  DateTime get endAt => startAt.add(Duration(minutes: durationMinutes));

  /// Document ID of the matching entry in the `slots` collection.
  String get slotId => SlotCalculator.slotId(serviceId, startAt);

  bool isUpcoming(DateTime now) => startAt.isAfter(now);

  /// Confirmed and not started yet: shown in the "Upcoming" tab.
  bool isActiveUpcoming(DateTime now) =>
      status == BookingStatus.confirmed && isUpcoming(now);

  /// Only confirmed bookings that haven't started yet can be cancelled.
  bool canCancel(DateTime now) => isActiveUpcoming(now);

  factory Booking.fromMap(String id, Map<String, dynamic> data) {
    return Booking(
      id: id,
      userId: data['userId'] as String? ?? '',
      serviceId: data['serviceId'] as String? ?? '',
      serviceName: data['serviceName'] as String? ?? '',
      startAt: (data['startAt'] as Timestamp).toDate(),
      durationMinutes: (data['durationMinutes'] as num?)?.toInt() ?? 0,
      // An unknown status is treated as cancelled: safest, as it can't be changed.
      status:
          BookingStatus.values.asNameMap()[data['status']] ??
          BookingStatus.cancelled,
      createdAt: (data['createdAt'] as Timestamp?)?.toDate(),
    );
  }

  /// Fields written when the booking is created. `createdAt` is added by the
  /// repository as a server timestamp.
  Map<String, dynamic> toMap() {
    return {
      'userId': userId,
      'serviceId': serviceId,
      'serviceName': serviceName,
      'startAt': Timestamp.fromDate(startAt),
      'durationMinutes': durationMinutes,
      'status': status.name,
    };
  }
}

/// Splits bookings for the two "My bookings" tabs:
/// - upcoming: confirmed and not started yet, soonest first;
/// - past: everything else (already started, or cancelled), most recent first.
///
/// Sorting happens here rather than with orderBy() in the query, which
/// together with where('userId', ...) would need a composite index.
({List<Booking> upcoming, List<Booking> past}) splitBookings(
  List<Booking> bookings,
  DateTime now,
) {
  final upcoming = bookings.where((b) => b.isActiveUpcoming(now)).toList()
    ..sort((a, b) => a.startAt.compareTo(b.startAt));
  final past = bookings.where((b) => !b.isActiveUpcoming(now)).toList()
    ..sort((a, b) => b.startAt.compareTo(a.startAt));
  return (upcoming: upcoming, past: past);
}
