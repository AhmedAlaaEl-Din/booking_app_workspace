import 'package:booking_app/features/services/data/service.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Service.fromMap reads int and double numbers', () {
    final service = Service.fromMap('coloring', {
      'name': 'Coloring',
      'description': 'Full color',
      'durationMinutes': 90.0, // Console may store numbers as doubles.
      'price': 60, // ...or as ints.
      'active': true,
    });

    expect(service.id, 'coloring');
    expect(service.name, 'Coloring');
    expect(service.durationMinutes, 90);
    expect(service.price, 60.0);
    expect(service.active, isTrue);
  });

  test('Service.fromMap uses safe defaults for missing fields', () {
    final service = Service.fromMap('x', {});

    expect(service.name, '');
    expect(service.durationMinutes, 0);
    expect(service.active, isFalse);
  });
}
