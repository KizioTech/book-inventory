import 'supabase_client.dart';

class BooksApi {
  Future<void> upsertBook(Map<String, dynamic> payload) async {
    await supabase.from('books').upsert(payload, onConflict: 'id');
  }

  Future<void> deleteBook(String id) async {
    await supabase.from('books').delete().eq('id', id);
  }

  Future<List<Map<String, dynamic>>> fetchBooksForSchool(
    String schoolId, {
    int limit = 50,
    int offset = 0,
    String? search,
  }) async {
    var query = supabase
        .from('books')
        .select('*')
        .eq('school_id', schoolId);

    if (search != null && search.trim().isNotEmpty) {
      final term = search.trim();
      query = query.or('title.ilike.%$term%,author.ilike.%$term%,isbn.ilike.%$term%');
    }

    final res = await query
        .order('created_at', ascending: false)
        .range(offset, offset + limit - 1);

    return List<Map<String, dynamic>>.from(res);
  }

  Future<Map<String, dynamic>?> lookupMetadataByIsbn(String cleanIsbn) async {
    final res = await supabase
        .from('book_metadata')
        .select('title, author, author_2, author_3, author_4, author_5, publisher, year, category, isbn')
        .eq('isbn', cleanIsbn)
        .maybeSingle();

    if (res == null) return null;
    return Map<String, dynamic>.from(res);
  }

  Future<List<Map<String, dynamic>>> searchMetadataByTitle(
    String query, {
    int limit = 6,
  }) async {
    if (query.trim().length < 2) return [];
    final res = await supabase
        .from('book_metadata')
        .select('title, author, author_2, author_3, author_4, author_5, publisher, year, category, isbn')
        .ilike('title', '%${query.trim()}%')
        .limit(limit);

    return List<Map<String, dynamic>>.from(res);
  }

  Future<void> cacheToSharedMetadata(Map<String, dynamic> metadata) async {
    try {
      await supabase.from('book_metadata').insert(metadata);
    } catch (_) {
      // Ignored if duplicate or non-staff
    }
  }

  Future<List<Map<String, dynamic>>> getDuplicateGroups([String? schoolId]) async {
    final res = await supabase.rpc(
      'get_duplicate_groups',
      params: schoolId != null ? {'p_school_id': schoolId} : {},
    );
    return List<Map<String, dynamic>>.from(res);
  }

  Future<List<Map<String, dynamic>>> getSchoolStats() async {
    final res = await supabase.rpc('get_school_stats');
    return List<Map<String, dynamic>>.from(res);
  }
}
