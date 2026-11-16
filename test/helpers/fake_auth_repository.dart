import 'package:booking_app/features/auth/data/app_user.dart';
import 'package:booking_app/features/auth/data/auth_repository.dart';
import 'package:firebase_auth/firebase_auth.dart';

/// Just enough of a Firebase [User] for the app: only `uid` is used.
class FakeUser implements User {
  FakeUser(this.uid);

  @override
  final String uid;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

/// Stand-in for [AuthRepository] so widget tests never touch Firebase.
/// Starts signed out, or signed in as [signedInAs].
class FakeAuthRepository implements AuthRepository {
  FakeAuthRepository({this.signInError, this.signedInAs});

  /// If set, [signIn] throws this.
  final Object? signInError;

  /// If set, the app starts signed in with this profile.
  final AppUser? signedInAs;

  int signInCalls = 0;

  @override
  Stream<User?> authStateChanges() =>
      Stream.value(signedInAs == null ? null : FakeUser(signedInAs!.uid));

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
  Future<AppUser> fetchProfile(User user) async =>
      signedInAs ?? (throw UnimplementedError());

  @override
  Future<void> signOut() async {}
}
