import 'package:material_ui/material_ui.dart';
import 'package:provider/provider.dart';

import '../../../core/constants/app_spacing.dart';
import '../../../core/utils/firebase_error_messages.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/centered_scroll_body.dart';
import '../../../core/widgets/error_snackbar.dart';
import '../../../core/widgets/loading_button.dart';
import '../../auth/providers/auth_notifier.dart';
import '../../services/data/service.dart';
import '../data/booking_reminders.dart';
import '../data/booking_repository.dart';

/// Booking step 4: review and save.
class ConfirmBookingScreen extends StatefulWidget {
  const ConfirmBookingScreen({
    super.key,
    required this.service,
    required this.startAt,
  });

  final Service service;
  final DateTime startAt;

  @override
  State<ConfirmBookingScreen> createState() => _ConfirmBookingScreenState();
}

class _ConfirmBookingScreenState extends State<ConfirmBookingScreen> {
  bool _isSaving = false;

  Future<void> _confirm() async {
    // Read everything that needs `context` before the first await.
    final repository = context.read<BookingRepository>();
    final reminders = context.read<BookingReminders>();
    final userId = context.read<AuthNotifier>().user!.uid;
    final navigator = Navigator.of(context);
    final messenger = ScaffoldMessenger.of(context);

    setState(() => _isSaving = true);
    try {
      final booking = await repository.createBooking(
        userId: userId,
        service: widget.service,
        startAt: widget.startAt,
      );

      // The booking is saved; a reminder problem must never undo that.
      ReminderResult reminder;
      try {
        reminder = await reminders.scheduleFor(booking);
      } catch (_) {
        reminder = ReminderResult.notAllowed;
      }

      navigator.popUntil((route) => route.isFirst); // Back to the tabs.
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            'Booked ${booking.serviceName} on '
            '${Formatters.date(booking.startAt)} at '
            '${Formatters.time(booking.startAt)}.'
            '${reminder == ReminderResult.notAllowed ? ' Notifications are off, so there will be no reminder.' : ''}',
          ),
        ),
      );
    } on SlotTakenException {
      if (!mounted) return;
      showErrorSnackBar(
        context,
        'Sorry, that time was just booked by someone else. '
        'Please go back and choose another time.',
      );
    } catch (error) {
      if (!mounted) return;
      showErrorSnackBar(context, firebaseErrorMessage(error));
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final service = widget.service;

    return Scaffold(
      appBar: AppBar(title: const Text('Confirm booking')),
      body: CenteredScrollBody(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: AppSpacing.md,
          children: [
            Card(
              child: Column(
                children: [
                  _DetailRow(
                    icon: Icons.content_cut,
                    label: 'Service',
                    value: service.name,
                  ),
                  _DetailRow(
                    icon: Icons.calendar_today,
                    label: 'Date',
                    value: Formatters.date(widget.startAt),
                  ),
                  _DetailRow(
                    icon: Icons.schedule,
                    label: 'Time',
                    value: Formatters.timeRange(
                      widget.startAt,
                      service.durationMinutes,
                    ),
                  ),
                  _DetailRow(
                    icon: Icons.payments_outlined,
                    label: 'Price',
                    value: Formatters.price(service.price),
                  ),
                ],
              ),
            ),
            Text(
              "You'll get a reminder on this phone one hour before.",
              style: theme.textTheme.bodySmall,
              textAlign: TextAlign.center,
            ),
            LoadingButton(
              label: 'Confirm booking',
              isLoading: _isSaving,
              onPressed: _confirm,
            ),
          ],
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon),
      title: Text(label),
      subtitle: Text(value, style: Theme.of(context).textTheme.bodyLarge),
    );
  }
}
