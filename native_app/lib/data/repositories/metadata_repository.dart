import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/validators.dart';
import '../../shared/utils/author_split.dart';
import '../local/app_database.dart';
import '../remote/books_api.dart';
import '../remote/google_books_api.dart';
import '../remote/supabase_client.dart';

class MetadataLookupResult {
  final String title;
  final String author;
  final List<String> authors;
  final String publisher;
  final String year;
  final String? category;
  final String isbn;
  final String source; // 'local_cache' | 'supabase_pool' | 'google_books'

  const MetadataLookupResult({
    required this.title,
    required this.author,
    required this.authors,
    required this.publisher,
    required this.year,
    this.category,
    required this.isbn,
    required this.source,
  });
}

class MetadataRepository {
  final AppDatabase _db;
  final BooksApi _booksApi;
  final GoogleBooksApi _googleBooksApi;

  MetadataRepository(this._db, this._booksApi, this._googleBooksApi);

  Future<MetadataLookupResult?> lookup(String rawIsbn) async {
    final clean = Validators.cleanIsbn(rawIsbn);
    if (clean.length < 10) return null;

    // 1. Check local SQLite cache first (instant & offline)
    final cached = await _db.getCachedMetadata(clean);
    if (cached != null && cached.title != null) {
      final combinedAuthors = AuthorUtils.joinAuthors(
        cached.author,
        cached.author2,
        cached.author3,
        cached.author4,
        cached.author5,
      );
      final list = [
        cached.author,
        cached.author2,
        cached.author3,
        cached.author4,
        cached.author5,
      ].whereType<String>().where((a) => a.trim().isNotEmpty).toList();

      return MetadataLookupResult(
        title: cached.title!,
        author: combinedAuthors,
        authors: list,
        publisher: cached.publisher ?? '',
        year: cached.year ?? '',
        category: cached.category,
        isbn: clean,
        source: 'local_cache',
      );
    }

    // 2. Check Supabase shared metadata pool
    try {
      final pool = await _booksApi.lookupMetadataByIsbn(clean);
      if (pool != null && pool['title'] != null) {
        final a1 = pool['author']?.toString();
        final a2 = pool['author_2']?.toString();
        final a3 = pool['author_3']?.toString();
        final a4 = pool['author_4']?.toString();
        final a5 = pool['author_5']?.toString();
        final combined = AuthorUtils.joinAuthors(a1, a2, a3, a4, a5);
        final list = [a1, a2, a3, a4, a5]
            .whereType<String>()
            .where((s) => s.trim().isNotEmpty)
            .toList();

        final result = MetadataLookupResult(
          title: pool['title'].toString(),
          author: combined,
          authors: list,
          publisher: pool['publisher']?.toString() ?? '',
          year: pool['year']?.toString() ?? '',
          category: pool['category']?.toString(),
          isbn: clean,
          source: 'supabase_pool',
        );

        // Cache into local SQLite
        await _cacheLocally(result);
        return result;
      }
    } catch (_) {
      // Supabase pool error or offline
    }

    // 3. Fallback to Google Books / OpenLibrary
    try {
      final ext = await _googleBooksApi.fetchMetadata(clean);
      if (ext != null) {
        final result = MetadataLookupResult(
          title: ext.title,
          author: ext.author,
          authors: ext.authors,
          publisher: ext.publisher,
          year: ext.year,
          category: ext.category,
          isbn: clean,
          source: 'google_books',
        );

        // Cache into local SQLite
        await _cacheLocally(result);

        // Optionally cache to Supabase shared pool in background
        _booksApi.cacheToSharedMetadata({
          'isbn': clean,
          'title': ext.title,
          'author': ext.authors.isNotEmpty ? ext.authors[0] : ext.author,
          'author_2': ext.authors.length > 1 ? ext.authors[1] : null,
          'author_3': ext.authors.length > 2 ? ext.authors[2] : null,
          'author_4': ext.authors.length > 3 ? ext.authors[3] : null,
          'author_5': ext.authors.length > 4 ? ext.authors[4] : null,
          'publisher': ext.publisher,
          'year': ext.year,
          'category': ext.category,
        });

        return result;
      }
    } catch (_) {
      // External API error or offline
    }

    return null;
  }

  Future<void> _cacheLocally(MetadataLookupResult res) async {
    await _db.cacheMetadata(
      MetadataCacheCompanion(
        isbn: Value(res.isbn),
        title: Value(res.title),
        author: Value(res.authors.isNotEmpty ? res.authors[0] : res.author),
        author2: Value(res.authors.length > 1 ? res.authors[1] : null),
        author3: Value(res.authors.length > 2 ? res.authors[2] : null),
        author4: Value(res.authors.length > 3 ? res.authors[3] : null),
        author5: Value(res.authors.length > 4 ? res.authors[4] : null),
        publisher: Value(res.publisher),
        year: Value(res.year),
        category: Value(res.category),
      ),
    );
  }
}

final metadataRepositoryProvider = Provider<MetadataRepository>((ref) {
  final db = ref.watch(databaseProvider);
  return MetadataRepository(db, BooksApi(), GoogleBooksApi());
});
