import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';

import 'app_user.dart';

/// The only class that talks to Firebase Auth and Firestore for auth.
///
/// Methods throw [FirebaseException]s on failure; the caller decides how to
/// present them (see `core/utils/firebase_error_messages.dart`).
class AuthRepository {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  CollectionReference<Map<String, dynamic>> get _users =>
      _firestore.collection('users');

  /// Emits the current user on start, then again on every sign-in / sign-out.
  /// Emits `null` when nobody is signed in.
  Stream<User?> authStateChanges() => _auth.authStateChanges();

  Future<void> signIn({required String email, required String password}) {
    return _auth.signInWithEmailAndPassword(email: email, password: password);
  }

  /// Creates the Firebase Auth account, then the `users/{uid}` profile document.
  Future<AppUser> register({
    required String name,
    required String email,
    required String password,
  }) async {
    final credential = await _auth.createUserWithEmailAndPassword(
      email: email,
      password: password,
    );
    final user = credential.user!;
    // Also stored on the Auth account, used as a fallback in fetchProfile.
    await user.updateDisplayName(name);

    await _users.doc(user.uid).set({
      'name': name,
      'email': email,
      'role': AppUser.roleCustomer,
      'createdAt': FieldValue.serverTimestamp(), // Set by the server's clock.
    });

    return AppUser(
      uid: user.uid,
      name: name,
      email: email,
      role: AppUser.roleCustomer,
    );
  }

  /// Loads the profile document for [user]. If it can't be read (offline,
  /// or not created yet), falls back to what Firebase Auth already knows.
  Future<AppUser> fetchProfile(User user) async {
    try {
      final snapshot = await _users.doc(user.uid).get();
      final data = snapshot.data();
      if (data != null) {
        return AppUser.fromMap(user.uid, data);
      }
    } on FirebaseException catch (error) {
      // Use the fallback below.
      debugPrint('Profile fetch failed, using the Auth fallback: ${error.code}');
    }
    return AppUser(
      uid: user.uid,
      name: user.displayName ?? '',
      email: user.email ?? '',
      role: AppUser.roleCustomer,
    );
  }

  Future<void> signOut() => _auth.signOut();
}
