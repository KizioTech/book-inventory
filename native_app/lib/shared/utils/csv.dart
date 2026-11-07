import 'package:csv/csv.dart';

/// Shared CSV schema and conversion utilities for book inventory exports and imports.
class CsvUtils {
  static const List<String> csvHeaders = [
    'book_title',
    'author',
    'author_2',
    'author_3',
    'author_4',
    'author_5',
    'isbn',
    'publisher_name',
    'copyright_year',
    'category_name',
    'book_copies',
    'status',
    'shelf_location',
    'remarks',
  ];

  /// Converts a list of book row maps into CSV text with UTF-8 BOM.
  static String exportToCsv(List<Map<String, dynamic>> records) {
    final List<List<dynamic>> rows = [csvHeaders];

    for (final r in records) {
      rows.add([
        r['title'] ?? '',
        r['author'] ?? '',
        r['author_2'] ?? '',
        r['author_3'] ?? '',
        r['author_4'] ?? '',
        r['author_5'] ?? '',
        r['isbn'] ?? '',
        r['publisher'] ?? '',
        r['year'] ?? '',
        r['category'] ?? '',
        r['quantity'] ?? 1,
        r['condition'] ?? 'Good',
        r['shelf_location'] ?? '',
        r['notes'] ?? '',
      ]);
    }

    // Prepend UTF-8 BOM so Excel opens non-ASCII characters correctly
    return '\uFEFF${csv.encode(rows)}';
  }

  /// Parses CSV text into row maps based on header positions.
  static List<Map<String, dynamic>> parseCsv(String csvContent) {
    final cleanContent = csvContent.replaceFirst('\uFEFF', '');
    final rows = csv.decode(cleanContent);
    if (rows.isEmpty) return [];

    final headers = rows.first.map((e) => e.toString().trim().toLowerCase()).toList();
    final results = <Map<String, dynamic>>[];

    for (var i = 1; i < rows.length; i++) {
      final row = rows[i];
      if (row.isEmpty) continue;
      final map = <String, dynamic>{};

      for (var col = 0; col < headers.length && col < row.length; col++) {
        final key = headers[col];
        final val = row[col]?.toString().trim() ?? '';
        map[key] = val;
      }
      results.add(map);
    }

    return results;
  }
}
