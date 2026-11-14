import 'package:material_ui/material_ui.dart';

/// Shows [message] in a red snackbar, replacing any snackbar already visible.
void showErrorSnackBar(BuildContext context, String message) {
  final colors = Theme.of(context).colorScheme;
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        content: Text(message, style: TextStyle(color: colors.onError)),
        backgroundColor: colors.error,
      ),
    );
}
