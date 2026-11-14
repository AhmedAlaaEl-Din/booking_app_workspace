import 'package:material_ui/material_ui.dart';
import 'package:provider/provider.dart';

import '../../../core/constants/app_spacing.dart';
import '../../../core/utils/firebase_error_messages.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/state_views.dart';
import '../../services/data/service.dart';
import '../data/booking_repository.dart';
import '../utils/slot_calculator.dart';
import 'confirm_booking_screen.dart';

/// Booking step 2 and 3: pick a date, then a free time slot.
class ChooseTimeScreen extends StatefulWidget {
  const ChooseTimeScreen({super.key, required this.service});

  final Service service;

  @override
  State<ChooseTimeScreen> createState() => _ChooseTimeScreenState();
}

class _ChooseTimeScreenState extends State<ChooseTimeScreen> {
  late final List<DateTime> _days = SlotCalculator.bookableDays(DateTime.now());
  late DateTime _selectedDay = _days.first;
  DateTime? _selectedSlot;
  late Stream<Set<DateTime>> _takenSlots = _watchTakenSlots();

  Stream<Set<DateTime>> _watchTakenSlots() {
    return context.read<BookingRepository>().watchTakenSlots(
      serviceId: widget.service.id,
      day: _selectedDay,
    );
  }

  void _selectDay(DateTime day) {
    setState(() {
      _selectedDay = day;
      _selectedSlot = null;
      _takenSlots = _watchTakenSlots(); // Listen to the new day's slots.
    });
  }

  void _continue(DateTime slot) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) =>
            ConfirmBookingScreen(service: widget.service, startAt: slot),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(widget.service.name)),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const _SectionTitle('Choose a date'),
          SizedBox(
            height: 72,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
              itemCount: _days.length,
              separatorBuilder: (_, _) => const SizedBox(width: AppSpacing.sm),
              itemBuilder: (context, index) {
                final day = _days[index];
                return ChoiceChip(
                  label: Text(
                    '${Formatters.weekday(day)}\n${Formatters.dayMonth(day)}',
                    textAlign: TextAlign.center,
                  ),
                  showCheckmark: false,
                  selected: day == _selectedDay,
                  onSelected: (_) => _selectDay(day),
                );
              },
            ),
          ),
          const _SectionTitle('Choose a time'),
          Expanded(
            child: StreamBuilder<Set<DateTime>>(
              stream: _takenSlots,
              builder: (context, snapshot) {
                if (snapshot.hasError) {
                  return ErrorView(
                    message: firebaseErrorMessage(snapshot.error!),
                  );
                }
                if (!snapshot.hasData) {
                  return const LoadingView();
                }
                final taken = snapshot.data!;
                final slots = SlotCalculator.slotsForDay(
                  day: _selectedDay,
                  durationMinutes: widget.service.durationMinutes,
                  now: DateTime.now(),
                );
                if (slots.isEmpty) {
                  return const EmptyView(
                    icon: Icons.event_busy,
                    message: 'No times left on this day.\nPlease choose another date.',
                  );
                }
                // If someone else just took the selected slot, unselect it.
                final selected = taken.contains(_selectedSlot)
                    ? null
                    : _selectedSlot;

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Expanded(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.md,
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          spacing: AppSpacing.sm,
                          children: [
                            Wrap(
                              spacing: AppSpacing.sm,
                              runSpacing: AppSpacing.sm,
                              children: [
                                for (final slot in slots)
                                  ChoiceChip(
                                    label: Text(Formatters.time(slot)),
                                    selected: slot == selected,
                                    // null = disabled: shown greyed out.
                                    onSelected: taken.contains(slot)
                                        ? null
                                        : (_) => setState(
                                            () => _selectedSlot = slot,
                                          ),
                                  ),
                              ],
                            ),
                            Text(
                              'Greyed-out times are already booked.',
                              style: theme.textTheme.bodySmall,
                            ),
                          ],
                        ),
                      ),
                    ),
                    SafeArea(
                      top: false,
                      child: Padding(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        child: FilledButton(
                          onPressed: selected == null
                              ? null
                              : () => _continue(selected),
                          child: Text(
                            selected == null
                                ? 'Choose a time'
                                : 'Continue with ${Formatters.time(selected)}',
                          ),
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.md,
        AppSpacing.md,
        AppSpacing.md,
        AppSpacing.sm,
      ),
      child: Text(text, style: Theme.of(context).textTheme.titleMedium),
    );
  }
}
