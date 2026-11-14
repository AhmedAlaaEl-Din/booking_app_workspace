/// Spacing values used across the app, so padding and gaps stay consistent.
class AppSpacing {
  AppSpacing._(); // Not meant to be instantiated.

  static const double xs = 4;
  static const double sm = 8;
  static const double md = 16;
  static const double lg = 24;
  static const double xl = 32;

  /// Forms never get wider than this, so they look good on tablets too.
  static const double formMaxWidth = 420;
}
