import 'package:flutter_test/flutter_test.dart';
import 'package:book_inventory/core/validators.dart';
import 'package:book_inventory/features/duplicates/resolve_duplicates_screen.dart';
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

  group('Duplicate Resolution Completeness Score Test', () {
    test('Calculates completeness score accurately across 7 tracked fields', () {
      final recordA = {
        'title': 'Mathematics Grade 10',
        'author': 'Jane Doe',
        'publisher': 'Futec',
        'isbn': '9780306406157',
        'year': '2022',
        'category': 'Mathematics',
        'condition': 'Good',
      };
      final recordB = {
        'title': 'Mathematics Grade 10',
        'author': 'Jane Doe',
        'isbn': '9780306406157',
        'publisher': '',
        'year': null,
      };

      expect(completenessScore(recordA), equals(7));
      expect(completenessScore(recordB), equals(3));
    });

    test('Correctly identifies master record from list by highest completeness', () {
      final records = [
        {
          'id': 'rec-1',
          'title': 'Physics Vol 1',
          'author': 'Isaac Newton',
          'isbn': '9780306406157',
          'quantity': 2,
        },
        {
          'id': 'rec-2',
          'title': 'Physics Vol 1',
          'author': 'Isaac Newton',
          'publisher': 'Royal Society',
          'year': '1687',
          'category': 'Science',
          'condition': 'Fair',
          'isbn': '9780306406157',
          'quantity': 1,
        },
      ];

      records.sort((a, b) => completenessScore(b).compareTo(completenessScore(a)));

      expect(records.first['id'], equals('rec-2'));
      final totalQuantity = records.fold<int>(0, (sum, r) => sum + ((r['quantity'] as num?)?.toInt() ?? 1));
      expect(totalQuantity, equals(3));
    });
  });
}
