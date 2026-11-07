import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:drift/drift.dart';
import '../local/app_database.dart';
import '../remote/supabase_client.dart';

class SyncService {
  final AppDatabase db;
  final SupabaseClient client;
  final ValueNotifier<bool> isSyncing = ValueNotifier<bool>(false);
  bool _running = false;

  SyncService(this.db, this.client);

  bool get isRunning => _running;

  /// Flushes all pending outbox actions to Supabase.
  Future<void> flush() async {
    if (_running) return;
    _running = true;
    isSyncing.value = true;

    try {
      final items = await db.pendingOutbox();
      for (final item in items) {
        try {
          final data = jsonDecode(item.payload) as Map<String, dynamic>;
          if (item.op == 'upsert') {
            await client.from('books').upsert(data, onConflict: 'id');
            await db.updateBookSyncState(item.entityId, 'synced');
          } else if (item.op == 'delete') {
            await client.from('books').delete().eq('id', item.entityId);
          }
          await db.markSynced(item.seq);
        } on PostgrestException catch (e) {
          // Server rejected: constraint or RLS violation
          await db.markFailed(item.seq, e.message);
          await db.updateBookSyncState(item.entityId, 'failed');
        } catch (_) {
          // Network connection dropped or unreachable: stop batch, retry later
          break;
        }
      }
    } finally {
      _running = false;
      isSyncing.value = false;
    }
  }

  /// Pulls books for the school from Supabase and populates local SQLite database.
  Future<void> pullBooksForSchool(String schoolId) async {
    try {
      final res = await client
          .from('books')
          .select('*')
          .eq('school_id', schoolId)
          .order('created_at', ascending: false);

      final List<Map<String, dynamic>> remoteList =
          List<Map<String, dynamic>>.from(res);

      for (final r in remoteList) {
        final id = r['id'] as String;
        // Don't overwrite locally pending/failed changes
        final local = await db.getBookById(id);
        if (local != null && local.syncState != 'synced') {
          continue;
        }

        await db.upsertBook(
          BooksCompanion(
            id: Value(id),
            isbn: Value(r['isbn']),
            title: Value(r['title']),
            author: Value(r['author']),
            author2: Value(r['author_2']),
            author3: Value(r['author_3']),
            author4: Value(r['author_4']),
            author5: Value(r['author_5']),
            publisher: Value(r['publisher']),
            year: Value(r['year']),
            quantity: Value(r['quantity'] ?? 1),
            condition: Value(r['condition']),
            category: Value(r['category']),
            shelfLocation: Value(r['shelf_location']),
            notes: Value(r['notes']),
            schoolId: Value(r['school_id']),
            clerkId: Value(r['clerk_id']),
            flaggedAsDuplicate: Value(r['flagged_as_duplicate'] ?? false),
            syncState: const Value('synced'),
            updatedAt: Value(
              r['created_at'] != null
                  ? DateTime.tryParse(r['created_at']) ?? DateTime.now()
                  : DateTime.now(),
            ),
          ),
        );
      }
    } catch (_) {
      // Offline pull fails gracefully
    }
  }
}

final syncServiceProvider = Provider<SyncService>((ref) {
  final db = ref.watch(databaseProvider);
  return SyncService(db, supabase);
});
