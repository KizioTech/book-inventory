import 'dart:convert';
import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../../core/validators.dart';
import '../../shared/utils/author_split.dart';
import '../local/app_database.dart';
import '../remote/supabase_client.dart';
import '../sync/sync_service.dart';
import 'school_repository.dart';

class BookRecord {
  final String id;
  final String? isbn;
  final String? title;
  final String? author;
  final String? author2;
  final String? author3;
  final String? author4;
  final String? author5;
  final String? publisher;
  final String? year;
  final int quantity;
  final String? condition;
  final String? category;
  final String? shelfLocation;
  final String? notes;
  final String schoolId;
  final String clerkId;
  final bool flaggedAsDuplicate;
  final String syncState;
  final DateTime updatedAt;

  const BookRecord({
    required this.id,
    this.isbn,
    this.title,
    this.author,
    this.author2,
    this.author3,
    this.author4,
    this.author5,
    this.publisher,
    this.year,
    this.quantity = 1,
    this.condition,
    this.category,
    this.shelfLocation,
    this.notes,
    required this.schoolId,
    required this.clerkId,
    this.flaggedAsDuplicate = false,
    this.syncState = 'pending',
    required this.updatedAt,
  });

  /// All authors joined for display, e.g. "A, B, C".
  String get authorsDisplay =>
      AuthorUtils.joinAuthors(author, author2, author3, author4, author5);

  factory BookRecord.fromDrift(Book b) {
    return BookRecord(
      id: b.id,
      isbn: b.isbn,
      title: b.title,
      author: b.author,
      author2: b.author2,
      author3: b.author3,
      author4: b.author4,
      author5: b.author5,
      publisher: b.publisher,
      year: b.year,
      quantity: b.quantity,
      condition: b.condition,
      category: b.category,
      shelfLocation: b.shelfLocation,
      notes: b.notes,
      schoolId: b.schoolId,
      clerkId: b.clerkId,
      flaggedAsDuplicate: b.flaggedAsDuplicate,
      syncState: b.syncState,
      updatedAt: b.updatedAt,
    );
  }
}

class BookRepository {
  final AppDatabase _db;
  final SyncService _syncService;

  BookRepository(this._db, this._syncService);

  Stream<List<BookRecord>> watchBooks(String schoolId) {
    return _db.watchAllBooks(schoolId).map((list) {
      return list.map(BookRecord.fromDrift).toList();
    });
  }

  Future<List<BookRecord>> getBooks(String schoolId) async {
    final list = await _db.getBooksForSchool(schoolId);
    return list.map(BookRecord.fromDrift).toList();
  }

  /// Saves (creates or updates) a book locally, queues it for sync and
  /// returns the record id.
  Future<String> saveBook({
    String? id,
    String? isbn,
    String? title,
    String? author,
    String? author2,
    String? author3,
    String? author4,
    String? author5,
    String? publisher,
    String? year,
    int quantity = 1,
    String? condition,
    String? category,
    String? shelfLocation,
    String? notes,
    required String schoolId,
    required String clerkId,
    bool flaggedAsDuplicate = false,
  }) async {
    final bookId = id != null && id.isNotEmpty ? id : const Uuid().v4();
    final now = DateTime.now();

    // 1. Write to local SQLite database (Immediate UI feedback)
    await _db.upsertBook(
      BooksCompanion(
        id: Value(bookId),
        isbn: Value(isbn),
        title: Value(title),
        author: Value(author),
        author2: Value(author2),
        author3: Value(author3),
        author4: Value(author4),
        author5: Value(author5),
        publisher: Value(publisher),
        year: Value(year),
        quantity: Value(quantity),
        condition: Value(condition),
        category: Value(category),
        shelfLocation: Value(shelfLocation),
        notes: Value(notes),
        schoolId: Value(schoolId),
        clerkId: Value(clerkId),
        flaggedAsDuplicate: Value(flaggedAsDuplicate),
        syncState: const Value('pending'),
        updatedAt: Value(now),
      ),
    );

    // 2. Map payload matching exact Supabase column names
    final payload = {
      'id': bookId,
      'isbn': isbn,
      'title': title,
      'author': author,
      'author_2': author2,
      'author_3': author3,
      'author_4': author4,
      'author_5': author5,
      'publisher': publisher,
      'year': year,
      'quantity': quantity,
      'condition': condition,
      'category': category,
      'shelf_location': shelfLocation,
      'notes': notes,
      'school_id': schoolId,
      'clerk_id': clerkId,
      'flagged_as_duplicate': flaggedAsDuplicate,
    };

    // 3. Add to Outbox
    await _db.enqueueOutbox(
      OutboxCompanion(
        entity: const Value('book'),
        entityId: Value(bookId),
        op: const Value('upsert'),
        payload: Value(jsonEncode(payload)),
        createdAt: Value(now),
      ),
    );

    // 4. Trigger background sync without blocking
    _syncService.flush();
    return bookId;
  }

  /// Existing records at [schoolId] whose ISBN matches [isbn] (digits only).
  Future<List<BookRecord>> findByIsbn(String schoolId, String isbn) async {
    final clean = Validators.cleanIsbn(isbn).toUpperCase();
    if (clean.isEmpty) return [];
    final all = await getBooks(schoolId);
    return all.where((b) {
      final other = b.isbn;
      if (other == null || other.isEmpty) return false;
      return Validators.cleanIsbn(other).toUpperCase() == clean;
    }).toList();
  }

  /// Changes only the copy count of an existing record (minimum 1).
  Future<void> setQuantity(BookRecord b, int quantity) {
    return saveBook(
      id: b.id,
      isbn: b.isbn,
      title: b.title,
      author: b.author,
      author2: b.author2,
      author3: b.author3,
      author4: b.author4,
      author5: b.author5,
      publisher: b.publisher,
      year: b.year,
      quantity: quantity < 1 ? 1 : quantity,
      condition: b.condition,
      category: b.category,
      shelfLocation: b.shelfLocation,
      notes: b.notes,
      schoolId: b.schoolId,
      clerkId: b.clerkId,
      flaggedAsDuplicate: b.flaggedAsDuplicate,
    );
  }

  Future<void> deleteBook(String bookId) async {
    await _db.deleteBookLocally(bookId);

    await _db.enqueueOutbox(
      OutboxCompanion(
        entity: const Value('book'),
        entityId: Value(bookId),
        op: const Value('delete'),
        payload: Value(jsonEncode({'id': bookId})),
      ),
    );

    _syncService.flush();
  }

  Future<List<OutboxData>> getFailedSyncItems() {
    return _db.getFailedOutboxItems();
  }

  Future<void> retryFailedItem(int seq) async {
    await _db.markFailed(seq, '');
    _syncService.flush();
  }

  Future<void> discardFailedItem(int seq) async {
    await _db.markSynced(seq);
  }
}

final bookRepositoryProvider = Provider<BookRepository>((ref) {
  final db = ref.watch(databaseProvider);
  final syncService = ref.watch(syncServiceProvider);
  return BookRepository(db, syncService);
});

/// Stream of books for the currently active school.
final schoolBooksStreamProvider = StreamProvider<List<BookRecord>>((ref) {
  final activeSchool = ref.watch(activeSchoolProvider);
  if (activeSchool == null) return Stream.value([]);
  final repo = ref.watch(bookRepositoryProvider);
  return repo.watchBooks(activeSchool.id);
});
