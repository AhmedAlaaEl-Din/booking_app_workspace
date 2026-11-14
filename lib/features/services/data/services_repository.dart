import 'package:cloud_firestore/cloud_firestore.dart';

import 'service.dart';

/// Reads services from Firestore. Customers can't write services; they are
/// managed in the Firebase console.
class ServicesRepository {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  /// Active services sorted by name, updated live when they change.
  Stream<List<Service>> watchActiveServices() {
    return _firestore
        .collection('services')
        .where('active', isEqualTo: true)
        .snapshots()
        .map((snapshot) {
          final services = snapshot.docs
              .map((doc) => Service.fromMap(doc.id, doc.data()))
              .toList();
          // Sorted here instead of with orderBy(), which together with the
          // where() above would need a composite index in Firestore.
          services.sort((a, b) => a.name.compareTo(b.name));
          return services;
        });
  }
}
