/// A bookable service, stored in Firestore at `services/{id}`.
class Service {
  const Service({
    required this.id,
    required this.name,
    required this.description,
    required this.durationMinutes,
    required this.price,
    required this.active,
  });

  final String id;
  final String name;
  final String description;
  final int durationMinutes;
  final double price;

  /// Inactive services are hidden from customers.
  final bool active;

  factory Service.fromMap(String id, Map<String, dynamic> data) {
    return Service(
      id: id,
      name: data['name'] as String? ?? '',
      description: data['description'] as String? ?? '',
      // Firestore numbers can come back as int or double, so go through num.
      durationMinutes: (data['durationMinutes'] as num?)?.toInt() ?? 0,
      price: (data['price'] as num?)?.toDouble() ?? 0,
      active: data['active'] as bool? ?? false,
    );
  }
}
