import 'package:material_ui/material_ui.dart';
import 'package:provider/provider.dart';

import '../../../core/navigation/snack_bar_dismisser.dart';
import '../../home/screens/home_screen.dart';
import '../providers/auth_notifier.dart';
import 'login_screen.dart';

/// The app's root screen: picks what to show from the current auth status.
/// Rebuilds automatically whenever the user signs in or out.
class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  AuthNotifier? _notifier;
  AuthStatus? _lastStatus;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final notifier = context.read<AuthNotifier>();
    if (notifier != _notifier) {
      _notifier?.removeListener(_onAuthChanged);
      _notifier = notifier..addListener(_onAuthChanged);
      _lastStatus = notifier.status;
    }
  }

  /// Switching between Login and Home is a screen change, but not a
  /// navigation, so the SnackBarDismisser doesn't see it: clear here.
  void _onAuthChanged() {
    final status = _notifier!.status;
    if (status != _lastStatus) {
      _lastStatus = status;
      dismissSnackBars(context);
    }
  }

  @override
  void dispose() {
    _notifier?.removeListener(_onAuthChanged);
    super.dispose();
  }

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
