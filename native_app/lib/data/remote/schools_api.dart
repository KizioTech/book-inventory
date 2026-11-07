import 'supabase_client.dart';

class SchoolsApi {
  Future<List<Map<String, dynamic>>> getSchools() async {
    final res = await supabase
        .from('schools')
        .select('*')
        .order('name', ascending: true);
    return List<Map<String, dynamic>>.from(res);
  }

  Future<List<Map<String, dynamic>>> getClerkSchools(String clerkId) async {
    final res = await supabase
        .from('clerk_schools')
        .select('school_id, schools(*)')
        .eq('clerk_id', clerkId);

    final List<Map<String, dynamic>> list = [];
    for (final item in res) {
      if (item['schools'] != null) {
        list.add(Map<String, dynamic>.from(item['schools'] as Map));
      }
    }
    return list;
  }

  Future<void> createSchool(Map<String, dynamic> data) async {
    await supabase.from('schools').insert(data);
  }

  Future<void> updateSchool(String schoolId, Map<String, dynamic> data) async {
    await supabase.from('schools').update(data).eq('id', schoolId);
  }
}
