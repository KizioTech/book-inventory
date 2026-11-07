import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:jwt_decoder/jwt_decoder.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../local/app_database.dart';

/// Single Supabase client instance.
SupabaseClient get supabase => Supabase.instance.client;

/// Provider for the local Drift database.
final databaseProvider = Provider<AppDatabase>((ref) {
  final db = AppDatabase();
  ref.onDispose(() => db.close());
  return db;
});

/// State for the current user's authentication and app role.
class AuthStateData {
  final Session? session;
  final User? user;
  final String? role; // 'clerk', 'admin', 'super_admin'

  const AuthStateData({this.session, this.user, this.role});

  bool get isAuthenticated => session != null;
  bool get isClerk => role == 'clerk';
  bool get isAdmin => role == 'admin' || role == 'super_admin';
  bool get isSuperAdmin => role == 'super_admin';
}

/// Provider watching Supabase auth state changes and decoding role from JWT.
final authStateProvider = StreamProvider<AuthStateData>((ref) {
  return supabase.auth.onAuthStateChange.map((data) {
    final session = data.session;
    String? role;

    if (session != null) {
      try {
        final claims = JwtDecoder.decode(session.accessToken);
        // Migration embed_jwt_role_claim embeds 'app_role'
        role = (claims['app_role'] ?? claims['user_role']) as String?;
      } catch (_) {
        role = null;
      }
    }

    return AuthStateData(
      session: session,
      user: session?.user,
      role: role,
    );
  });
});
