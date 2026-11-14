import 'package:booking_app/features/auth/providers/auth_notifier.dart';
import 'package:booking_app/features/auth/screens/auth_gate.dart';
import 'package:booking_app/features/auth/screens/login_screen.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:provider/provider.dart';

import '../../helpers/fake_auth_repository.dart';

/// Builds the app's gate with a fake repository instead of Firebase.
Widget buildTestApp(FakeAuthRepository repository) {
  return ChangeNotifierProvider(
    create: (_) => AuthNotifier(repository),
    child: const MaterialApp(home: AuthGate()),
  );
}

void main() {
  testWidgets('shows a spinner, then the login screen when signed out', (
    tester,
  ) async {
    await tester.pumpWidget(buildTestApp(FakeAuthRepository()));
    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    await tester.pumpAndSettle(); // Let the auth stream emit "signed out".
    expect(find.byType(LoginScreen), findsOneWidget);
  });

  testWidgets('shows validation errors and does not call Firebase', (
    tester,
  ) async {
    final repository = FakeAuthRepository();
    await tester.pumpWidget(buildTestApp(repository));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Log in'));
    await tester.pump();

    expect(find.text('Please enter your email'), findsOneWidget);
    expect(find.text('Please enter a password'), findsOneWidget);
    expect(repository.signInCalls, 0);
  });

  testWidgets('shows a friendly message when the password is wrong', (
    tester,
  ) async {
    final repository = FakeAuthRepository(
      signInError: FirebaseAuthException(code: 'invalid-credential'),
    );
    await tester.pumpWidget(buildTestApp(repository));
    await tester.pumpAndSettle();

    await tester.enterText(
      find.widgetWithText(TextFormField, 'Email'),
      'ahmed@example.com',
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Password'),
      'wrong-password',
    );
    await tester.tap(find.text('Log in'));
    await tester.pumpAndSettle();

    expect(repository.signInCalls, 1);
    expect(find.text('Incorrect email or password.'), findsOneWidget);
    expect(find.byType(LoginScreen), findsOneWidget); // Still on login.
  });
}
