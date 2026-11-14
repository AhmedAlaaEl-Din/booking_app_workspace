import 'package:material_ui/material_ui.dart';
import 'package:provider/provider.dart';

import '../../../core/constants/app_spacing.dart';
import '../../../core/utils/firebase_error_messages.dart';
import '../../../core/widgets/state_views.dart';
import '../../auth/providers/auth_notifier.dart';
import '../data/booking.dart';
import '../data/booking_repository.dart';
import '../widgets/booking_card.dart';

/// Second tab: the user's bookings, split into upcoming and past.
class MyBookingsScreen extends StatefulWidget {
  const MyBookingsScreen({super.key});

  @override
  State<MyBookingsScreen> createState() => _MyBookingsScreenState();
}

class _MyBookingsScreenState extends State<MyBookingsScreen> {
  late final Stream<List<Booking>> _bookings = context
      .read<BookingRepository>()
      .watchUserBookings(context.read<AuthNotifier>().user!.uid);

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('My bookings'),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Upcoming'),
              Tab(text: 'Past'),
            ],
          ),
        ),
        body: StreamBuilder<List<Booking>>(
          stream: _bookings,
          builder: (context, snapshot) {
            if (snapshot.hasError) {
              return ErrorView(message: firebaseErrorMessage(snapshot.error!));
            }
            if (!snapshot.hasData) {
              return const LoadingView();
            }
            final bookings = snapshot.data!;
            final now = DateTime.now();
            // Sorted here rather than with orderBy() to avoid needing a
            // composite index (where userId == ... + orderBy startAt).
            final upcoming = bookings.where((b) => b.isUpcoming(now)).toList()
              ..sort((a, b) => a.startAt.compareTo(b.startAt));
            final past = bookings.where((b) => !b.isUpcoming(now)).toList()
              ..sort((a, b) => b.startAt.compareTo(a.startAt));

            return TabBarView(
              children: [
                _BookingList(
                  bookings: upcoming,
                  emptyMessage: bookings.isEmpty
                      ? 'No bookings yet.\nPick a service in the Services tab.'
                      : 'No upcoming bookings.',
                ),
                _BookingList(bookings: past, emptyMessage: 'No past bookings.'),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _BookingList extends StatelessWidget {
  const _BookingList({required this.bookings, required this.emptyMessage});

  final List<Booking> bookings;
  final String emptyMessage;

  @override
  Widget build(BuildContext context) {
    if (bookings.isEmpty) {
      return EmptyView(icon: Icons.event_note, message: emptyMessage);
    }
    return ListView.separated(
      padding: const EdgeInsets.all(AppSpacing.md),
      itemCount: bookings.length,
      separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
      itemBuilder: (context, index) {
        final booking = bookings[index];
        // The key keeps each card's state (e.g. "cancelling...") attached to
        // the right booking when the list changes.
        return BookingCard(key: ValueKey(booking.id), booking: booking);
      },
    );
  }
}
