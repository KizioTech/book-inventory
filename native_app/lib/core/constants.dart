/// Shared lists used by the scan form, edit dialog and filters.
/// Must stay identical to the web app's BOOK_CATEGORIES so data is consistent.
const List<String> kBookCategories = [
  'Arts',
  'History',
  'Fiction',
  'Non-Fiction',
  'Mathematics',
  'Literature',
  'Science',
  'Technology',
];

const List<String> kConditions = ['Good', 'Fair', 'Poor'];

/// Returns the matching entry from [kBookCategories] (case-insensitive),
/// or null when the raw value (e.g. from Google Books) is not one of them.
String? matchCategory(String? raw) {
  if (raw == null) return null;
  final v = raw.trim().toLowerCase();
  if (v.isEmpty) return null;
  for (final c in kBookCategories) {
    if (c.toLowerCase() == v) return c;
  }
  return null;
}

/// Year range used by the web app: 1450 .. current year.
String? validateYearRange(String? year, {bool required = false}) {
  final v = year?.trim() ?? '';
  if (v.isEmpty) return required ? 'Year is required.' : null;
  final y = int.tryParse(v);
  final current = DateTime.now().year;
  if (y == null || y < 1450 || y > current) {
    return 'Enter a year between 1450 and $current.';
  }
  return null;
}
