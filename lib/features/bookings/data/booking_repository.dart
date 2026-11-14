import 'package:cloud_firestore/cloud_firestore.dart';

import '../../services/data/service.dart';
import '../utils/slot_calculator.dart';
import 'booking.dart';

/// Thrown when the chosen time was booked by someone else first.
class SlotTakenException implements Exception {}

/// All Firestore access for bookings.
///
/// Two collections are involved:
/// - `bookings/{autoId}`: the full booking, readable only by its owner.
/// - `slots/{serviceId}_{startMillis}`: one document per taken time, with no
///   personal data, readable by every signed-in user. Its ID is
///   deterministic, so a second booking for the same service and time would
///   need the same document, which Firestore and the security rules refuse.
class BookingRepository {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  CollectionReference<Map<String, dynamic>> get _bookings =>
      _firestore.collection('bookings');
  CollectionReference<Map<String, dynamic>> get _slots =>
      _firestore.collection('slots');

  /// Start times already taken for [serviceId] on [day], updated live.
  Stream<Set<DateTime>> watchTakenSlots({
    required String serviceId,
    required DateTime day,
  }) {
    final dayStart = DateTime(day.year, day.month, day.day);
    final dayEnd = DateTime(day.year, day.month, day.day + 1);
    return _slots
        .where('startAt', isGreaterThanOrEqualTo: Timestamp.fromDate(dayStart))
        .where('startAt', isLessThan: Timestamp.fromDate(dayEnd))
        .snapshots()
        .map(
          (snapshot) => snapshot.docs
              // Filtered here, not in the query: a where() on serviceId plus a
              // range on startAt would need a composite index. One day holds
              // only a few dozen slots, so this is cheap.
              .where((doc) => doc.data()['serviceId'] == serviceId)
              .map((doc) => (doc.data()['startAt'] as Timestamp).toDate())
              .toSet(),
        );
  }

  /// The user's bookings, updated live. The `userId` filter is required:
  /// the security rules only allow queries limited to your own bookings.
  Stream<List<Booking>> watchUserBookings(String userId) {
    return _bookings
        .where('userId', isEqualTo: userId)
        .snapshots()
        .map(
          (snapshot) => snapshot.docs
              .map((doc) => Booking.fromMap(doc.id, doc.data()))
              .toList(),
        );
  }

  /// Creates the booking and claims its slot in one transaction.
  /// Throws [SlotTakenException] if the slot is already taken.
  Future<Booking> createBooking({
    required String userId,
    required Service service,
    required DateTime startAt,
  }) async {
    final bookingRef = _bookings.doc(); // New auto-generated ID.
    final slotRef = _slots.doc(SlotCalculator.slotId(service.id, startAt));
    final booking = Booking(
      id: bookingRef.id,
      userId: userId,
      serviceId: service.id,
      serviceName: service.name,
      startAt: startAt,
      durationMinutes: service.durationMinutes,
      status: BookingStatus.confirmed,
    );

    // If another customer claims the slot between our read and our write,
    // Firestore re-runs this function; the second run then sees the slot as
    // taken. Returning a bool (instead of throwing inside) keeps it simple.
    final booked = await _firestore.runTransaction<bool>((transaction) async {
      final slot = await transaction.get(slotRef);
      if (slot.exists) return false;

      transaction.set(bookingRef, {
        ...booking.toMap(),
        'createdAt': FieldValue.serverTimestamp(),
      });
      transaction.set(slotRef, {
        'serviceId': service.id,
        'startAt': Timestamp.fromDate(startAt),
        'bookingId': bookingRef.id,
      });
      return true;
    });

    if (!booked) throw SlotTakenException();
    return booking;
  }

  /// Marks the booking cancelled and frees its slot, in one transaction.
  Future<void> cancelBooking(Booking booking) async {
    final bookingRef = _bookings.doc(booking.id);
    final slotRef = _slots.doc(booking.slotId);

    await _firestore.runTransaction<void>((transaction) async {
      final current = await transaction.get(bookingRef);
      if (current.data()?['status'] != BookingStatus.confirmed.name) {
        return; // Already cancelled (e.g. on another device): nothing to do.
      }
      final slot = await transaction.get(slotRef);

      transaction.update(bookingRef, {'status': BookingStatus.cancelled.name});
      if (slot.exists && slot.data()?['bookingId'] == booking.id) {
        transaction.delete(slotRef);
      }
    });
  }
}
