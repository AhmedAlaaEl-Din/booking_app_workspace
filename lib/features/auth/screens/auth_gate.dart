import 'package:material_ui/material_ui.dart';
import 'package:provider/provider.dart';

import '../../home/screens/home_screen.dart';
import '../providers/auth_notifier.dart';
import 'login_screen.dart';

/// The app's root screen: picks what to show from the current auth status.
/// Rebuilds automatically whenever the user signs in or out.
class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    final status = context.select<AuthNotifier, AuthStatus>((n) => n.status);

    return switch (status) {
      AuthStatus.unknown => const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      ),
      AuthStatus.signedOut => const LoginScreen(),
      AuthStatus.signedIn => const HomeScreen(),
    };
  }
}
