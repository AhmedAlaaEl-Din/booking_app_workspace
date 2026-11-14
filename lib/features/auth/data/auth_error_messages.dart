import 'package:firebase_core/firebase_core.dart';

const String genericErrorMessage = 'Something went wrong. Please try again.';

/// Turns an error thrown by Firebase into a message a user can understand.
///
/// [FirebaseAuthException] (Auth) and Firestore errors are both
/// [FirebaseException]s with a string `code`, so one switch covers both.
String authErrorMessage(Object error) {
  if (error is! FirebaseException) {
    return genericErrorMessage;
  }
  switch (error.code) {
    case 'invalid-email':
      return 'That email address is not valid.';
    case 'user-not-found':
    case 'wrong-password':
    case 'invalid-credential': // Newer projects report both cases with this code.
      return 'Incorrect email or password.';
    case 'user-disabled':
      return 'This account has been disabled.';
    case 'email-already-in-use':
      return 'An account with this email already exists. Try logging in.';
    case 'weak-password':
      return 'That password is too weak. Please choose a stronger one.';
    case 'too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'network-request-failed':
    case 'unavailable':
      return 'No internet connection. Check your network and try again.';
    case 'operation-not-allowed':
      return 'Email sign-in is not enabled for this app.';
    case 'permission-denied':
      return 'You do not have permission to do that.';
    default:
      return genericErrorMessage;
  }
}
