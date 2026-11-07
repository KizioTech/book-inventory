/// Application configuration injected at build time or using defaults.
class AppConfig {
  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://puhovsjixikktsarozho.supabase.co',
  );

  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: 'sb_publishable_wXzt3aWU5ue7ed0AZ5ithg_zj8Gku1b',
  );

  static const String appTitle = 'FutecAI Book Inventory';
  static const String appVersion = '1.0.0';
}
