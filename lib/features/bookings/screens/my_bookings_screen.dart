import 'package:material_ui/material_ui.dart';
import 'package:provider/provider.dart';

import '../../../core/constants/app_spacing.dart';
import '../../../core/navigation/snack_bar_dismisser.dart';
import '../../../core/utils/firebase_error_messages.dart';
import '../../../core/widgets/state_views.dart';
import '../../auth/providers/auth_notifier.dart';
import '../data/booking.dart';
import '../data/booking_repository.dart';
import '../widgets/booking_card.dart';

/// Second tab: the user's bookings, split into upcoming and past/cancelled.
class MyBookingsScreen extends StatefulWidget {
  const MyBookingsScreen({super.key});

  @override
  State<MyBookingsScreen> createState() => _MyBookingsScreenState();
}

// SingleTickerProviderStateMixin supplies the animation clock the
// TabController needs for the sliding tab indicator.
class _MyBookingsScreenState extends State<MyBookingsScreen>
    with SingleTickerProviderStateMixin {
  late final Stream<List<Booking>> _bookings = context
      .read<BookingRepository>()
      .watchUserBookings(context.read<AuthNotifier>().user!.uid);

  // An explicit controller (instead of DefaultTabController) so we can react
  // to tab changes, by tapping or by swiping.
  late final TabController _tabController = TabController(
    length: 2,
    vsync: this,
  )..addListener(_onTabChanged);
  int _lastTabIndex = 0;

  void _onTabChanged() {
    if (_tabController.index != _lastTabIndex) {
      _lastTabIndex = _tabController.index;
      dismissSnackBars(context);
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My bookings'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
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
          // Upcoming = confirmed and not started; Past = the rest,
          // including cancelled bookings.
          final split = splitBookings(bookings, DateTime.now());

          return TabBarView(
            controller: _tabController,
            children: [
              _BookingList(
                bookings: split.upcoming,
                emptyMessage: bookings.isEmpty
                    ? 'No bookings yet.\nPick a service in the Services tab.'
                    : 'No upcoming bookings.',
              ),
              _BookingList(
                bookings: split.past,
                emptyMessage: 'No past or cancelled bookings.',
              ),
            ],
          );
        },
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
