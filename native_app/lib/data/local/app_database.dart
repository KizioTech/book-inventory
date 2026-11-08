import 'dart:io';
import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;
import 'tables.dart';

part 'app_database.g.dart';

@DriftDatabase(tables: [Books, Outbox, MetadataCache, SchoolsTable])
class AppDatabase extends _$AppDatabase {
  AppDatabase([QueryExecutor? executor]) : super(executor ?? _openConnection());

  @override
  int get schemaVersion => 1;

  // --- Books operations ---
  Stream<List<Book>> watchAllBooks(String schoolId) {
    return (select(books)
          ..where((tbl) => tbl.schoolId.equals(schoolId))
          ..orderBy([(t) => OrderingTerm(expression: t.updatedAt, mode: OrderingMode.desc)]))
        .watch();
  }

  Future<List<Book>> getBooksForSchool(String schoolId) {
    return (select(books)
          ..where((tbl) => tbl.schoolId.equals(schoolId))
          ..orderBy([(t) => OrderingTerm(expression: t.updatedAt, mode: OrderingMode.desc)]))
        .get();
  }

  Future<Book?> getBookById(String id) {
    return (select(books)..where((tbl) => tbl.id.equals(id))).getSingleOrNull();
  }

  Future<void> upsertBook(BooksCompanion book) {
    return into(books).insertOnConflictUpdate(book);
  }

  Future<void> updateBookSyncState(String id, String state) {
    return (update(books)..where((t) => t.id.equals(id)))
        .write(BooksCompanion(syncState: Value(state)));
  }

  Future<int> deleteBookLocally(String id) {
    return (delete(books)..where((tbl) => tbl.id.equals(id))).go();
  }

  // --- Outbox operations ---
  Future<int> enqueueOutbox(OutboxCompanion entry) {
    return into(outbox).insert(entry);
  }

  Future<List<OutboxData>> pendingOutbox() {
    return (select(outbox)..orderBy([(t) => OrderingTerm(expression: t.seq)]))
        .get();
  }

  Future<int> markSynced(int seq) {
    return (delete(outbox)..where((tbl) => tbl.seq.equals(seq))).go();
  }

  Future<int> markFailed(int seq, String error) {
    return (update(outbox)..where((tbl) => tbl.seq.equals(seq))).write(
      OutboxCompanion(
        attempts: const Value.absent(), // Or increment
        lastError: Value(error),
      ),
    );
  }

  Future<List<OutboxData>> getFailedOutboxItems() {
    return (select(outbox)
          ..where((tbl) => tbl.lastError.isNotNull())
          ..orderBy([(t) => OrderingTerm(expression: t.seq)]))
        .get();
  }

  // --- Metadata cache operations ---
  Future<MetadataCacheData?> getCachedMetadata(String isbn) {
    return (select(metadataCache)..where((tbl) => tbl.isbn.equals(isbn)))
        .getSingleOrNull();
  }

  Future<List<MetadataCacheData>> searchCachedMetadataByTitle(
      String query, int limit) {
    return (select(metadataCache)
          ..where((tbl) => tbl.title.like('%$query%'))
          ..limit(limit))
        .get();
  }

  Future<void> cacheMetadata(MetadataCacheCompanion meta) {
    return into(metadataCache).insertOnConflictUpdate(meta);
  }

  // --- Schools operations ---
  Future<void> saveSchools(List<SchoolsTableCompanion> schoolEntries) async {
    await batch((b) {
      b.insertAllOnConflictUpdate(schoolsTable, schoolEntries);
    });
  }

  Future<List<SchoolsTableData>> getAllSchools() {
    return (select(schoolsTable)..where((t) => t.active.equals(true))).get();
  }
}

LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final dbFolder = await getApplicationDocumentsDirectory();
    final file = File(p.join(dbFolder.path, 'book_inventory.sqlite'));
    return NativeDatabase.createInBackground(file);
  });
}
