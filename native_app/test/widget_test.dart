import 'package:flutter_test/flutter_test.dart';
import 'package:book_inventory/core/validators.dart';
import 'package:book_inventory/shared/utils/author_split.dart';
import 'package:book_inventory/shared/utils/csv.dart';

void main() {
  group('Validators Test', () {
    test('ISBN 13 validation', () {
      expect(Validators.isValidIsbn('978-0-306-40615-7'), isTrue);
      expect(Validators.isValidIsbn('9780306406157'), isTrue);
      expect(Validators.isValidIsbn('9780306406158'), isFalse);
    });

    test('Year validation', () {
      expect(Validators.isValidYear('2024'), isTrue);
      expect(Validators.isValidYear('1998'), isTrue);
      expect(Validators.isValidYear('abcd'), isFalse);
      expect(Validators.isValidYear('1200'), isFalse);
    });
  });

  group('AuthorUtils Test', () {
    test('Splits comma and semicolon authors up to 5', () {
      final list = AuthorUtils.splitAuthors('Alice Smith; Bob Jones, Charlie Brown');
      expect(list.length, equals(3));
      expect(list[0], equals('Alice Smith'));
      expect(list[1], equals('Bob Jones'));
      expect(list[2], equals('Charlie Brown'));
    });

    test('Joins authors for display', () {
      final str = AuthorUtils.joinAuthors('Author 1', 'Author 2', null, 'Author 4');
      expect(str, equals('Author 1, Author 2, Author 4'));
    });
  });

  group('CsvUtils Test', () {
    test('Exports and parses CSV according to shared schema', () {
      final records = [
        {
          'title': 'Test Book',
          'author': 'Jane Doe',
          'author_2': 'John Smith',
          'isbn': '9780306406157',
          'publisher': 'Futec Publishing',
          'year': '2023',
          'category': 'Academic',
          'quantity': 3,
          'condition': 'Good',
          'shelf_location': 'Shelf B',
          'notes': 'Sample note',
        }
      ];

      final csvText = CsvUtils.exportToCsv(records);
      expect(csvText.contains('book_title'), isTrue);
      expect(csvText.contains('Test Book'), isTrue);

      final parsed = CsvUtils.parseCsv(csvText);
      expect(parsed.length, equals(1));
      expect(parsed.first['book_title'], equals('Test Book'));
      expect(parsed.first['isbn'], equals('9780306406157'));
    });
  });
}
