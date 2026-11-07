import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../local/app_database.dart';
import '../remote/schools_api.dart';
import '../remote/supabase_client.dart';

class SchoolItem {
  final String id;
  final String name;
  final String? district;
  final String? region;

  const SchoolItem({
    required this.id,
    required this.name,
    this.district,
    this.region,
  });

  factory SchoolItem.fromMap(Map<String, dynamic> map) {
    return SchoolItem(
      id: map['id'] as String,
      name: map['name'] as String,
      district: map['district'] as String?,
      region: map['region'] as String?,
    );
  }

  factory SchoolItem.fromLocal(SchoolsTableData data) {
    return SchoolItem(
      id: data.id,
      name: data.name,
      district: data.district,
      region: data.region,
    );
  }
}

class SchoolRepository {
  final AppDatabase _db;
  final SchoolsApi _api;

  SchoolRepository(this._db, this._api);

  Future<List<SchoolItem>> getSchoolsForUser(String userId, String? role) async {
    // 1. Try remote fetch
    try {
      final List<Map<String, dynamic>> rawSchools;
      if (role == 'admin' || role == 'super_admin') {
        rawSchools = await _api.getSchools();
      } else {
        rawSchools = await _api.getClerkSchools(userId);
      }

      if (rawSchools.isNotEmpty) {
        // Cache locally
        final companions = rawSchools.map((s) {
          return SchoolsTableCompanion(
            id: Value(s['id'] as String),
            name: Value(s['name'] as String),
            district: Value(s['district'] as String?),
            region: Value(s['region'] as String?),
            active: Value(s['active'] ?? true),
          );
        }).toList();

        await _db.saveSchools(companions);
        return rawSchools.map(SchoolItem.fromMap).toList();
      }
    } catch (_) {
      // Offline fallback: read from local SQLite
    }

    final local = await _db.getAllSchools();
    return local.map(SchoolItem.fromLocal).toList();
  }
}

final schoolRepositoryProvider = Provider<SchoolRepository>((ref) {
  final db = ref.watch(databaseProvider);
  return SchoolRepository(db, SchoolsApi());
});

/// Notifier managing currently active school selection.
class ActiveSchoolNotifier extends Notifier<SchoolItem?> {
  @override
  SchoolItem? build() => null;

  void select(SchoolItem? school) => state = school;
}

final activeSchoolProvider =
    NotifierProvider<ActiveSchoolNotifier, SchoolItem?>(ActiveSchoolNotifier.new);
