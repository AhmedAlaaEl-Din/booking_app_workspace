import 'package:material_ui/material_ui.dart';

/// Material 3 theme for the whole app. Every color is derived from one seed color.
class AppTheme {
  AppTheme._();

  // Teal: a calm, "clinic" feel.
  static const Color _seedColor = Color(0xFF00897B);

  static ThemeData light() => _build(Brightness.light);
  static ThemeData dark() => _build(Brightness.dark);

  static ThemeData _build(Brightness brightness) {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: _seedColor,
      brightness: brightness,
    );
    const buttonSize = Size(64, 48); // 48dp = comfortable touch target.

    return ThemeData(
      colorScheme: colorScheme,
      inputDecorationTheme: const InputDecorationThemeData(
        border: OutlineInputBorder(),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(minimumSize: buttonSize),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(minimumSize: buttonSize),
      ),
      snackBarTheme: const SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}
