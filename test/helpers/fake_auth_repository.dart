import 'package:booking_app/features/auth/data/app_user.dart';
import 'package:booking_app/features/auth/data/auth_repository.dart';
import 'package:firebase_auth/firebase_auth.dart';

/// Stand-in for [AuthRepository] so widget tests never touch Firebase.
/// Always starts signed out.
class FakeAuthRepository implements AuthRepository {
  FakeAuthRepository({this.signInError});

  /// If set, [signIn] throws this.
  final Object? signInError;

  int signInCalls = 0;

  @override
  Stream<User?> authStateChanges() => Stream.value(null);

  @override
  Future<void> signIn({required String email, required String password}) async {
    signInCalls++;
    if (signInError != null) throw signInError!;
  }

  @override
  Future<AppUser> register({
    required String name,
    required String email,
    required String password,
  }) => throw UnimplementedError();

  @override
  Future<AppUser> fetchProfile(User user) => throw UnimplementedError();

  @override
  Future<void> signOut() async {}
}
