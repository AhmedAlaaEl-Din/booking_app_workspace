import 'package:material_ui/material_ui.dart';
import 'package:provider/provider.dart';

import '../../../core/constants/app_spacing.dart';
import '../../../core/utils/firebase_error_messages.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/error_snackbar.dart';
import '../data/booking.dart';
import '../data/booking_reminders.dart';
import '../data/booking_repository.dart';

/// One booking in "My bookings", with a Cancel button when allowed.
class BookingCard extends StatefulWidget {
  const BookingCard({super.key, required this.booking});

  final Booking booking;

  @override
  State<BookingCard> createState() => _BookingCardState();
}

class _BookingCardState extends State<BookingCard> {
  bool _isCancelling = false;

  Future<void> _cancel() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel booking?'),
        content: Text(
          '${widget.booking.serviceName} on '
          '${Formatters.date(widget.booking.startAt)} at '
          '${Formatters.time(widget.booking.startAt)} will be cancelled '
          'and the time becomes available to others.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Keep it'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Cancel booking'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    final repository = context.read<BookingRepository>();
    final reminders = context.read<BookingReminders>();
    final messenger = ScaffoldMessenger.of(context);

    setState(() => _isCancelling = true);
    try {
      await repository.cancelBooking(widget.booking);
      try {
        await reminders.cancelFor(widget.booking.id);
      } catch (_) {
        // The booking is cancelled; a leftover reminder is not worth an error.
      }
      messenger.showSnackBar(
        const SnackBar(content: Text('Booking cancelled.')),
      );
    } catch (error) {
      if (mounted) showErrorSnackBar(context, firebaseErrorMessage(error));
    } finally {
      if (mounted) setState(() => _isCancelling = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final booking = widget.booking;
    final theme = Theme.of(context);
    final canCancel = booking.canCancel(DateTime.now());

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          spacing: AppSpacing.xs,
          children: [
            Row(
              spacing: AppSpacing.sm,
              children: [
                Expanded(
                  child: Text(
                    booking.serviceName,
                    style: theme.textTheme.titleMedium,
                  ),
                ),
                _StatusChip(status: booking.status),
              ],
            ),
            Text(Formatters.date(booking.startAt)),
            Text(
              Formatters.timeRange(booking.startAt, booking.durationMinutes),
            ),
            if (canCancel)
              Align(
                alignment: Alignment.centerRight,
                child: _isCancelling
                    ? const Padding(
                        padding: EdgeInsets.all(AppSpacing.sm),
                        child: SizedBox.square(
                          dimension: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                      )
                    : TextButton(
                        onPressed: _cancel,
                        child: const Text('Cancel booking'),
                      ),
              ),
          ],
        ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});

  final BookingStatus status;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final isConfirmed = status == BookingStatus.confirmed;
    return Chip(
      label: Text(isConfirmed ? 'Confirmed' : 'Cancelled'),
      backgroundColor: isConfirmed
          ? colors.primaryContainer
          : colors.surfaceContainerHighest,
      labelStyle: TextStyle(
        color: isConfirmed
            ? colors.onPrimaryContainer
            : colors.onSurfaceVariant,
      ),
      side: BorderSide.none,
      visualDensity: VisualDensity.compact,
    );
  }
}
