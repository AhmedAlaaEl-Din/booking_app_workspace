import 'package:material_ui/material_ui.dart';
import 'package:provider/provider.dart';

import '../../../core/constants/app_spacing.dart';
import '../../../core/utils/firebase_error_messages.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/state_views.dart';
import '../../bookings/screens/choose_time_screen.dart';
import '../data/service.dart';
import '../data/services_repository.dart';

/// First tab: the list of services. Tapping one starts the booking flow.
class ServicesScreen extends StatefulWidget {
  const ServicesScreen({super.key});

  @override
  State<ServicesScreen> createState() => _ServicesScreenState();
}

class _ServicesScreenState extends State<ServicesScreen> {
  // Created once, so rebuilds don't open a new Firestore listener each time.
  late final Stream<List<Service>> _services = context
      .read<ServicesRepository>()
      .watchActiveServices();

  // True while the booking flow is being opened, so a double tap on a card
  // doesn't open it twice.
  bool _isOpening = false;

  Future<void> _open(Service service) async {
    if (_isOpening) return;
    _isOpening = true;
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => ChooseTimeScreen(service: service),
      ),
    );
    _isOpening = false;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Services')),
      body: StreamBuilder<List<Service>>(
        stream: _services,
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return ErrorView(message: firebaseErrorMessage(snapshot.error!));
          }
          if (!snapshot.hasData) {
            return const LoadingView();
          }
          final services = snapshot.data!;
          if (services.isEmpty) {
            return const EmptyView(
              icon: Icons.content_cut,
              message: 'No services available yet.',
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(AppSpacing.md),
            itemCount: services.length,
            separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
            itemBuilder: (context, index) => _ServiceCard(
              service: services[index],
              onTap: () => _open(services[index]),
            ),
          );
        },
      ),
    );
  }
}

class _ServiceCard extends StatelessWidget {
  const _ServiceCard({required this.service, required this.onTap});

  final Service service;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      clipBehavior: Clip.antiAlias, // Keeps the tap ripple inside the corners.
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Row(
            spacing: AppSpacing.md,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  spacing: AppSpacing.xs,
                  children: [
                    Text(service.name, style: theme.textTheme.titleMedium),
                    if (service.description.isNotEmpty)
                      Text(
                        service.description,
                        style: theme.textTheme.bodyMedium,
                      ),
                    Text(
                      '${Formatters.duration(service.durationMinutes)}'
                      '  ·  ${Formatters.price(service.price)}',
                      style: theme.textTheme.labelLarge?.copyWith(
                        color: theme.colorScheme.primary,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right),
            ],
          ),
        ),
      ),
    );
  }
}
