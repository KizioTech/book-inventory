import 'supabase_client.dart';

class AdminApi {
  Future<void> createUser({
    required String fullName,
    required String email,
    String? password,
    required String role, // 'admin' | 'clerk'
    List<String>? schoolIds,
  }) async {
    final payload = <String, dynamic>{
      'full_name': fullName,
      'email': email,
      'role': role,
      if (password != null && password.isNotEmpty) 'password': password,
      ...?schoolIds != null ? {'school_ids': schoolIds} : null,
    };

    final res = await supabase.functions.invoke('create-user', body: payload);
    if (res.status != 200) {
      final msg = res.data is Map ? res.data['error'] : res.data?.toString();
      throw Exception(msg ?? 'Failed to create user (${res.status})');
    }
  }

  Future<void> updateUser({
    required String userId,
    required String role,
    List<String>? schoolIds,
  }) async {
    final payload = <String, dynamic>{
      'user_id': userId,
      'role': role,
      ...?schoolIds != null ? {'school_ids': schoolIds} : null,
    };

    final res = await supabase.functions.invoke('update-user', body: payload);
    if (res.status != 200) {
      final msg = res.data is Map ? res.data['error'] : res.data?.toString();
      throw Exception(msg ?? 'Failed to update user (${res.status})');
    }
  }

  Future<void> deleteUser(String userId) async {
    final res = await supabase.functions.invoke(
      'delete-user',
      body: {'user_id': userId},
    );
    if (res.status != 200) {
      final msg = res.data is Map ? res.data['error'] : res.data?.toString();
      throw Exception(msg ?? 'Failed to delete user (${res.status})');
    }
  }

  Future<void> revokeAllSessions(String userId) async {
    final res = await supabase.functions.invoke(
      'revoke-all-sessions',
      body: {'user_id': userId},
    );
    if (res.status != 200) {
      final msg = res.data is Map ? res.data['error'] : res.data?.toString();
      throw Exception(msg ?? 'Failed to revoke sessions (${res.status})');
    }
  }

  Future<List<Map<String, dynamic>>> getUsers() async {
    final res = await supabase
        .from('profiles')
        .select('id, full_name, email, active, created_at, avatar_url, user_roles(role), clerk_schools(school_id, schools(name))')
        .order('created_at', ascending: false);
    return List<Map<String, dynamic>>.from(res);
  }
}
