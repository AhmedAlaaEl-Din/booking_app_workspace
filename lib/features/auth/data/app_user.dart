/// The signed-in user's profile, as stored in Firestore at `users/{uid}`.
class AppUser {
  const AppUser({
    required this.uid,
    required this.name,
    required this.email,
    required this.role,
  });

  static const String roleCustomer = 'customer';

  final String uid;
  final String name;
  final String email;
  final String role;

  /// Builds an [AppUser] from a Firestore document's fields.
  factory AppUser.fromMap(String uid, Map<String, dynamic> data) {
    return AppUser(
      uid: uid,
      name: data['name'] as String? ?? '',
      email: data['email'] as String? ?? '',
      role: data['role'] as String? ?? roleCustomer,
    );
  }
}
