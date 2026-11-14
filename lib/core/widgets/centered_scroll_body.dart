import 'package:material_ui/material_ui.dart';

import '../constants/app_spacing.dart';

/// Page body for forms: centered, width-limited, and scrollable, so it
/// still works on small phones and when the keyboard is open.
class CenteredScrollBody extends StatelessWidget {
  const CenteredScrollBody({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: ConstrainedBox(
            constraints: const BoxConstraints(
              maxWidth: AppSpacing.formMaxWidth,
            ),
            child: child,
          ),
        ),
      ),
    );
  }
}
