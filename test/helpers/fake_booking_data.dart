import 'dart:async';

import 'package:booking_app/features/auth/data/app_user.dart';
import 'package:booking_app/features/auth/providers/auth_notifier.dart';
import 'package:booking_app/features/bookings/data/booking.dart';
import 'package:booking_app/features/bookings/data/booking_reminders.dart';
import 'package:booking_app/features/bookings/data/booking_repository.dart';
import 'package:booking_app/features/services/data/service.dart';
import 'package:booking_app/features/services/data/services_repository.dart';
import 'package:material_ui/material_ui.dart';
import 'package:provider/provider.dart';

import 'fake_auth_repository.dart';

const demoCustomer = AppUser(
  uid: 'lina',
  name: 'Lina Youssef',
  email: 'lina.youssef@example.com',
  role: AppUser.roleCustomer,
);

const haircut = Service(
  id: 'haircut',
  name: 'Haircut',
  description: 'Classic cut and style',
  durationMinutes: 30,
  price: 150,
  active: true,
);

const manicure = Service(
  id: 'manicure',
  name: 'Manicure',
  description: 'Shape, cuticle care and polish',
  durationMinutes: 40,
  price: 120,
  active: true,
);

class FakeServicesRepository implements ServicesRepository {
  FakeServicesRepository(this._stream);

  factory FakeServicesRepository.withServices(List<Service> services) =>
      FakeServicesRepository(Stream.value(services));

  final Stream<List<Service>> _stream;

  @override
  Stream<List<Service>> watchActiveServices() => _stream;
}

/// In-memory bookings. [createBooking] waits for [release] when
/// [holdCreate] is set, so a test can tap again while it is "saving".
class FakeBookingRepository implements BookingRepository {
  FakeBookingRepository({this.taken = const {}, this.createError});

  final Set<DateTime> taken;
  final Object? createError;
  final List<Booking> created = [];
  final List<Booking> cancelled = [];
  final _bookings = StreamController<List<Booking>>.broadcast();
  final List<Booking> _all = [];

  Completer<void>? holdCreate;

  @override
  Stream<Set<DateTime>> watchTakenSlots({
    required String serviceId,
    required DateTime day,
  }) => Stream.value(taken);

  @override
  Stream<List<Booking>> watchUserBookings(String userId) async* {
    yield List.of(_all);
    yield* _bookings.stream;
  }

  @override
  Future<Booking> createBooking({
    required String userId,
    required Service service,
    required DateTime startAt,
  }) async {
    final booking = Booking(
      id: 'b${created.length + 1}',
      userId: userId,
      serviceId: service.id,
      serviceName: service.name,
      startAt: startAt,
      durationMinutes: service.durationMinutes,
      status: BookingStatus.confirmed,
    );
    created.add(booking);
    await holdCreate?.future;
    if (createError != null) throw createError!;
    _all.add(booking);
    _bookings.add(List.of(_all));
    return booking;
  }

  @override
  Future<void> cancelBooking(Booking booking) async {
    cancelled.add(booking);
    final i = _all.indexWhere((b) => b.id == booking.id);
    _all[i] = Booking(
      id: booking.id,
      userId: booking.userId,
      serviceId: booking.serviceId,
      serviceName: booking.serviceName,
      startAt: booking.startAt,
      durationMinutes: booking.durationMinutes,
      status: BookingStatus.cancelled,
    );
    _bookings.add(List.of(_all));
  }
}

class FakeReminders implements BookingReminders {
  final List<String> scheduled = [];

  @override
  Future<void> init() async {}

  @override
  Future<ReminderResult> scheduleFor(Booking booking) async {
    scheduled.add(booking.id);
    return ReminderResult.scheduled;
  }

  @override
  Future<void> cancelFor(String bookingId) async {}
}

/// The app's providers with fakes, around [home].
Widget buildSignedInApp({
  required Widget home,
  ServicesRepository? services,
  BookingRepository? bookings,
  BookingReminders? reminders,
  ThemeData? theme,
  double textScale = 1.0,
}) {
  return MultiProvider(
    providers: [
      ChangeNotifierProvider(
        create: (_) =>
            AuthNotifier(FakeAuthRepository(signedInAs: demoCustomer)),
      ),
      Provider<ServicesRepository>.value(
        value: services ?? FakeServicesRepository.withServices([haircut]),
      ),
      Provider<BookingRepository>.value(
        value: bookings ?? FakeBookingRepository(),
      ),
      Provider<BookingReminders>.value(value: reminders ?? FakeReminders()),
    ],
    child: MaterialApp(
      theme: theme,
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(context)
            .copyWith(textScaler: TextScaler.linear(textScale)),
        child: child!,
      ),
      home: home,
    ),
  );
}
