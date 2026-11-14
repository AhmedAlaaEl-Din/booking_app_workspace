import 'package:material_ui/material_ui.dart';
import 'package:provider/provider.dart';

import '../../../core/constants/app_spacing.dart';
import '../../../core/widgets/centered_scroll_body.dart';
import '../../auth/providers/auth_notifier.dart';

/// Placeholder home screen for Phase 1.
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final name = context.select<AuthNotifier, String>(
      (n) => n.user?.name ?? '',
    );
    final greeting = name.isEmpty ? 'Welcome!' : 'Welcome, $name';
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Home')),
      body: CenteredScrollBody(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: AppSpacing.lg,
          children: [
            Icon(
              Icons.account_circle,
              size: 72,
              color: theme.colorScheme.primary,
            ),
            Text(
              greeting,
              style: theme.textTheme.headlineSmall,
              textAlign: TextAlign.center,
            ),
            OutlinedButton.icon(
              onPressed: () => context.read<AuthNotifier>().signOut(),
              icon: const Icon(Icons.logout),
              label: const Text('Log out'),
            ),
          ],
        ),
      ),
    );
  }
}
