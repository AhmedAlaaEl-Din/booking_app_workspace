import 'package:material_ui/material_ui.dart';

/// Removes any visible or queued snackbar whenever the screen changes.
///
/// Register it once on the MaterialApp:
/// ```dart
/// MaterialApp(
///   scaffoldMessengerKey: dismisser.messengerKey,
///   navigatorObservers: [dismisser],
/// )
/// ```
/// It's a [NavigatorObserver], so it's told about every push and pop
/// (dialogs are routes too). Tab changes and the Login/Home switch don't use
/// the navigator; they call [dismissSnackBars] themselves.
class SnackBarDismisser extends NavigatorObserver {
  /// Gives access to the app-wide ScaffoldMessenger, which shows snackbars.
  final GlobalKey<ScaffoldMessengerState> messengerKey =
      GlobalKey<ScaffoldMessengerState>();

  void _clear() => messengerKey.currentState?.clearSnackBars();

  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) => _clear();

  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) => _clear();

  @override
  void didRemove(Route<dynamic> route, Route<dynamic>? previousRoute) =>
      _clear();

  @override
  void didReplace({Route<dynamic>? newRoute, Route<dynamic>? oldRoute}) =>
      _clear();
}

/// Removes any visible or queued snackbar. For screen changes that don't go
/// through the navigator, such as switching tabs.
void dismissSnackBars(BuildContext context) {
  ScaffoldMessenger.of(context).clearSnackBars();
}
