import 'package:booking_app/core/utils/validators.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Validators.name', () {
    test('rejects empty or blank names', () {
      expect(Validators.name(null), isNotNull);
      expect(Validators.name('   '), isNotNull);
    });

    test('accepts a name', () {
      expect(Validators.name('Ahmed'), isNull);
    });
  });

  group('Validators.email', () {
    test('rejects empty and malformed emails', () {
      expect(Validators.email(''), isNotNull);
      expect(Validators.email('ahmed'), isNotNull);
      expect(Validators.email('ahmed@'), isNotNull);
      expect(Validators.email('ahmed@mail'), isNotNull);
      expect(Validators.email('a b@mail.com'), isNotNull);
    });

    test('accepts a valid email, ignoring surrounding spaces', () {
      expect(Validators.email('ahmed@example.com'), isNull);
      expect(Validators.email('  ahmed@example.com  '), isNull);
    });
  });

  group('Validators.password', () {
    test('rejects empty and short passwords', () {
      expect(Validators.password(''), isNotNull);
      expect(Validators.password('12345'), isNotNull);
    });

    test('accepts 6 or more characters', () {
      expect(Validators.password('123456'), isNull);
    });
  });

  group('Validators.confirmPassword', () {
    test('rejects empty or different values', () {
      expect(Validators.confirmPassword('', 'secret1'), isNotNull);
      expect(Validators.confirmPassword('secret2', 'secret1'), isNotNull);
    });

    test('accepts a matching value', () {
      expect(Validators.confirmPassword('secret1', 'secret1'), isNull);
    });
  });
}
