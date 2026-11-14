import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';

import '../data/app_user.dart';
import '../data/auth_error_messages.dart';
import '../data/auth_repository.dart';

enum AuthStatus { unknown, signedOut, signedIn }

/// Holds the auth state the UI needs and exposes the auth actions.
///
/// Screens call the actions and rebuild when [notifyListeners] is called.
class AuthNotifier extends ChangeNotifier {
  AuthNotifier(this._repository) {
    _subscription = _repository.authStateChanges().listen(_onAuthStateChanged);
  }

  final AuthRepository _repository;
  late final StreamSubscription<User?> _subscription;

  AuthStatus _status = AuthStatus.unknown;
  AppUser? _user;
  bool _isLoading = false;

  /// `unknown` until Firebase reports the initial state at app start.
  AuthStatus get status => _status;

  /// The signed-in user's profile, or null when signed out.
  AppUser? get user => _user;

  /// True while a sign-in or register request is running.
  bool get isLoading => _isLoading;

  Future<void> _onAuthStateChanged(User? firebaseUser) async {
    if (firebaseUser == null) {
      _user = null;
      _status = AuthStatus.signedOut;
      notifyListeners();
      return;
    }
    // Skip the fetch if we already have this profile (e.g. right after register).
    if (_user?.uid != firebaseUser.uid) {
      final profile = await _repository.fetchProfile(firebaseUser);
      // register() may have set the full profile while we were waiting.
      if (_user?.uid != firebaseUser.uid) {
        _user = profile;
      }
    }
    _status = AuthStatus.signedIn;
    notifyListeners();
  }

  /// Returns null on success, or a user-friendly error message.
  Future<String?> signIn({required String email, required String password}) {
    return _run(
      () => _repository.signIn(email: email.trim(), password: password),
    );
  }

  /// Returns null on success, or a user-friendly error message.
  Future<String?> register({
    required String name,
    required String email,
    required String password,
  }) {
    return _run(() async {
      _user = await _repository.register(
        name: name.trim(),
        email: email.trim(),
        password: password,
      );
    });
  }

  Future<void> signOut() => _repository.signOut();

  /// Runs [action] with [isLoading] set, converting errors to messages.
  Future<String?> _run(Future<void> Function() action) async {
    _isLoading = true;
    notifyListeners();
    try {
      await action();
      return null;
    } catch (error) {
      return authErrorMessage(error);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}
