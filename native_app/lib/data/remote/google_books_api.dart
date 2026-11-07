import 'package:dio/dio.dart';
import '../../core/validators.dart';

class BookMetadataResult {
  final String title;
  final String author;
  final List<String> authors;
  final String publisher;
  final String year;
  final String? category;
  final String isbn;

  const BookMetadataResult({
    required this.title,
    required this.author,
    required this.authors,
    required this.publisher,
    required this.year,
    this.category,
    required this.isbn,
  });
}

class GoogleBooksApi {
  final Dio _dio;

  GoogleBooksApi([Dio? dio])
      : _dio = dio ??
            Dio(BaseOptions(
              connectTimeout: const Duration(milliseconds: 3000),
              receiveTimeout: const Duration(milliseconds: 3000),
            ));

  /// Attempts to fetch metadata from Google Books, with OpenLibrary fallback.
  Future<BookMetadataResult?> fetchMetadata(String rawIsbn) async {
    final clean = Validators.cleanIsbn(rawIsbn);
    if (clean.length < 10) return null;

    // 1. Try Google Books
    try {
      final res = await _dio.get(
        'https://www.googleapis.com/books/v1/volumes',
        queryParameters: {
          'q': 'isbn:$clean',
          'country': 'US',
          'maxResults': 1,
        },
      );

      if (res.statusCode == 200 && res.data is Map) {
        final items = res.data['items'] as List?;
        if (items != null && items.isNotEmpty) {
          final volumeInfo = items.first['volumeInfo'] as Map<String, dynamic>?;
          if (volumeInfo != null && volumeInfo['title'] != null) {
            final rawAuthors = (volumeInfo['authors'] as List?)
                    ?.map((e) => e.toString())
                    .toList() ??
                [];
            final publishedDate = volumeInfo['publishedDate']?.toString() ?? '';
            final year = publishedDate.length >= 4
                ? publishedDate.substring(0, 4)
                : '';
            final categories = (volumeInfo['categories'] as List?)
                    ?.map((e) => e.toString())
                    .toList() ??
                [];

            return BookMetadataResult(
              title: volumeInfo['title'].toString(),
              author: rawAuthors.join(', '),
              authors: rawAuthors.take(5).toList(),
              publisher: volumeInfo['publisher']?.toString() ?? '',
              year: year,
              category: categories.isNotEmpty ? categories.first : null,
              isbn: clean,
            );
          }
        }
      }
    } catch (_) {
      // Continue to OpenLibrary fallback
    }

    // 2. Fallback to OpenLibrary
    try {
      final res = await _dio.get(
        'https://openlibrary.org/api/books',
        queryParameters: {
          'bibkeys': 'ISBN:$clean',
          'jscmd': 'details',
          'format': 'json',
        },
      );

      if (res.statusCode == 200 && res.data is Map) {
        final key = 'ISBN:$clean';
        final entry = res.data[key] as Map<String, dynamic>?;
        final details = entry?['details'] as Map<String, dynamic>?;
        if (details != null && details['title'] != null) {
          final authorsList = (details['authors'] as List?)
                  ?.map((a) => (a is Map ? a['name']?.toString() : a.toString()))
                  .where((name) => name != null && name.isNotEmpty)
                  .map((e) => e!)
                  .toList() ??
              [];
          final publishersList = (details['publishers'] as List?)
                  ?.map((p) => (p is Map ? p['name']?.toString() : p.toString()))
                  .where((name) => name != null && name.isNotEmpty)
                  .map((e) => e!)
                  .toList() ??
              [];
          final publishDate = details['publish_date']?.toString() ?? '';
          final match = RegExp(r'\b\d{4}\b').firstMatch(publishDate);
          final year = match != null ? match.group(0)! : '';

          return BookMetadataResult(
            title: details['title'].toString(),
            author: authorsList.join(', '),
            authors: authorsList.take(5).toList(),
            publisher: publishersList.isNotEmpty ? publishersList.first : '',
            year: year,
            isbn: clean,
          );
        }
      }
    } catch (_) {
      // Both failed or offline
    }

    return null;
  }
}
