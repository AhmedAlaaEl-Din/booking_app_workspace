import 'package:material_ui/material_ui.dart';
import 'package:provider/provider.dart';

import 'core/navigation/snack_bar_dismisser.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/data/auth_repository.dart';
import 'features/auth/providers/auth_notifier.dart';
import 'features/auth/screens/auth_gate.dart';
import 'features/bookings/data/booking_reminders.dart';
import 'features/bookings/data/booking_repository.dart';
import 'features/services/data/services_repository.dart';

class BookingApp extends StatefulWidget {
  const BookingApp({super.key, required this.reminders});

  /// Created and initialized in main() before the app starts.
  final BookingReminders reminders;

  @override
  State<BookingApp> createState() => _BookingAppState();
}

class _BookingAppState extends State<BookingApp> {
  // Kept in State so it lives as long as the app (it owns a GlobalKey).
  final SnackBarDismisser _snackBarDismisser = SnackBarDismisser();

  @override
  Widget build(BuildContext context) {
    // Makes these objects available to every screen below, via
    // context.read<T>() / context.watch<T>().
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthNotifier(AuthRepository())),
        Provider(create: (_) => ServicesRepository()),
        Provider(create: (_) => BookingRepository()),
        Provider.value(value: widget.reminders),
      ],
      child: MaterialApp(
        title: 'Booking App',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light(),
        darkTheme: AppTheme.dark(),
        // Snackbars disappear whenever the user moves to another screen.
        scaffoldMessengerKey: _snackBarDismisser.messengerKey,
        navigatorObservers: [_snackBarDismisser],
        home: const AuthGate(),
      ),
    );
  }
}
