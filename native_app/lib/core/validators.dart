/// Common validation functions for book inventory data.
class Validators {
  /// Strips formatting characters from ISBN (keeps digits and 'X'/'x').
  static String cleanIsbn(String raw) {
    return raw.replaceAll(RegExp(r'[^0-9Xx]'), '');
  }

  /// Validates ISBN-10 or ISBN-13 checksum.
  static bool isValidIsbn(String raw) {
    final clean = cleanIsbn(raw);
    if (clean.length == 10) {
      return _isValidIsbn10(clean);
    } else if (clean.length == 13) {
      return _isValidIsbn13(clean);
    }
    return false;
  }

  static bool _isValidIsbn10(String isbn) {
    var sum = 0;
    for (var i = 0; i < 9; i++) {
      final digit = int.tryParse(isbn[i]);
      if (digit == null) return false;
      sum += digit * (10 - i);
    }
    final lastChar = isbn[9].toUpperCase();
    if (lastChar == 'X') {
      sum += 10;
    } else {
      final lastDigit = int.tryParse(lastChar);
      if (lastDigit == null) return false;
      sum += lastDigit;
    }
    return sum % 11 == 0;
  }

  static bool _isValidIsbn13(String isbn) {
    var sum = 0;
    for (var i = 0; i < 12; i++) {
      final digit = int.tryParse(isbn[i]);
      if (digit == null) return false;
      sum += (i % 2 == 0) ? digit : digit * 3;
    }
    final lastDigit = int.tryParse(isbn[12]);
    if (lastDigit == null) return false;
    final check = (10 - (sum % 10)) % 10;
    return check == lastDigit;
  }

  /// Validates 4-digit copyright year.
  static bool isValidYear(String? year) {
    if (year == null || year.trim().isEmpty) return true; // optional
    final y = int.tryParse(year.trim());
    if (y == null) return false;
    final currentYear = DateTime.now().year;
    return y >= 1500 && y <= currentYear + 1;
  }

  /// Checks if value is non-empty.
  static String? required(String? val, [String fieldName = 'Field']) {
    if (val == null || val.trim().isEmpty) {
      return '$fieldName is required';
    }
    return null;
  }
}
