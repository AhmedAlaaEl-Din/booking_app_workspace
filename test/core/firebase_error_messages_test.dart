import 'package:booking_app/core/utils/firebase_error_messages.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('maps auth error codes to friendly messages', () {
    expect(
      firebaseErrorMessage(FirebaseAuthException(code: 'invalid-credential')),
      'Incorrect email or password.',
    );
    expect(
      firebaseErrorMessage(FirebaseAuthException(code: 'email-already-in-use')),
      contains('already exists'),
    );
    expect(
      firebaseErrorMessage(
        FirebaseAuthException(code: 'network-request-failed'),
      ),
      contains('No internet connection'),
    );
  });

  test('maps Firestore errors too', () {
    expect(
      firebaseErrorMessage(
        FirebaseException(plugin: 'cloud_firestore', code: 'unavailable'),
      ),
      contains('No internet connection'),
    );
  });

  test('falls back to a generic message', () {
    expect(
      firebaseErrorMessage(FirebaseAuthException(code: 'something-new')),
      genericErrorMessage,
    );
    expect(firebaseErrorMessage(Exception('boom')), genericErrorMessage);
  });
}
