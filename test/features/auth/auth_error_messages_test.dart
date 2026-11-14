import 'package:booking_app/features/auth/data/auth_error_messages.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('maps auth error codes to friendly messages', () {
    expect(
      authErrorMessage(FirebaseAuthException(code: 'invalid-credential')),
      'Incorrect email or password.',
    );
    expect(
      authErrorMessage(FirebaseAuthException(code: 'email-already-in-use')),
      contains('already exists'),
    );
    expect(
      authErrorMessage(FirebaseAuthException(code: 'network-request-failed')),
      contains('No internet connection'),
    );
  });

  test('maps Firestore errors too', () {
    expect(
      authErrorMessage(
        FirebaseException(plugin: 'cloud_firestore', code: 'unavailable'),
      ),
      contains('No internet connection'),
    );
  });

  test('falls back to a generic message', () {
    expect(
      authErrorMessage(FirebaseAuthException(code: 'something-new')),
      genericErrorMessage,
    );
    expect(authErrorMessage(Exception('boom')), genericErrorMessage);
  });
}
