/// Utilities for splitting and joining multi-author strings.
class AuthorUtils {
  /// Splits author string by comma or semicolon, trims whitespace,
  /// filters empty strings, and returns up to 5 author slots.
  static List<String> splitAuthors(String? raw) {
    if (raw == null || raw.trim().isEmpty) return [];
    return raw
        .split(RegExp(r'[,;]'))
        .map((a) => a.trim())
        .where((a) => a.isNotEmpty)
        .take(5)
        .toList();
  }

  /// Combines up to 5 author strings into a comma-separated display string.
  static String joinAuthors(
    String? a1, [
    String? a2,
    String? a3,
    String? a4,
    String? a5,
  ]) {
    return [a1, a2, a3, a4, a5]
        .where((a) => a != null && a.trim().isNotEmpty)
        .map((a) => a!.trim())
        .join(', ');
  }
}
