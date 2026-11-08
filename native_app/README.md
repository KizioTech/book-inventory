# FutecAI Book Inventory - Native Android (APK) & Windows (EXE)

A truly native multi-platform client for the FutecAI Book Inventory system, built with **Flutter**, **Drift (SQLite)**, and the existing **Supabase** backend. 

- **Android (APK)**: Optimized for field data collectors with native camera barcode scanning, multi-tier ISBN auto-lookup, and an offline-first outbox synchronization engine.
- **Windows (EXE)**: Optimized for managers and administrators with keyboard/hardware scanner support, deep inventory exploration, user/school management via Edge Functions, duplicate resolution, and visual analytics.

---

## Architecture Overview

```
┌─────────────────────────────────┐      ┌─────────────────────────────────┐
│        Android App (APK)        │      │        Windows App (EXE)        │
│    Data Collectors / Field      │      │       Managers / Admins         │
│  Barcode Scan + Offline SQLite  │      │   Admin, Records & Analytics    │
└────────────────┬────────────────┘      └────────────────┬────────────────┘
                 │                                        │
                 └───────────────────┬────────────────────┘
                                     │ HTTPS
                                     ▼
                       ┌───────────────────────────┐
                       │     Supabase Backend      │
                       │   Postgres + RLS + Auth   │
                       │   Edge Functions + RPCs   │
                       └───────────────────────────┘
```

### Local Client Architecture
```
UI Layer (Flutter Widgets + Material 3)
   │
State Management (Riverpod 3.0 Notifiers & Providers)
   │
Repository Layer (BookRepository, SchoolRepository, MetadataRepository)
   ├── Local SQLite DB (Drift)  <── Single source of truth for UI
   └── Sync Service (Outbox)   <── Background worker synced with Supabase
```

---

## Directory Structure

```
native_app/
├── android/                   # Native Android host project (NDK 28, Gradle 9)
├── windows/                   # Native Windows C++ host project
├── assets/                    # Branding assets & logos
├── docs/
│   └── FEATURE_PARITY.md      # Web vs Native feature parity matrix
├── lib/
│   ├── main.dart              # Entrypoint; initializes Supabase & ProviderScope
│   ├── app.dart               # MaterialApp.router configuration
│   ├── core/
│   │   ├── config.dart        # Supabase URL & keys via String.fromEnvironment
│   │   ├── constants.dart     # Book categories & application constants
│   │   ├── router.dart        # GoRouter with JWT app_role role guards
│   │   ├── theme.dart         # Material 3 light theme (FutecAI Blue & Slate)
│   │   └── validators.dart    # ISBN-10, ISBN-13 checksums & field validators
│   ├── data/
│   │   ├── local/
│   │   │   ├── tables.dart    # Drift table definitions (Books, Outbox, Metadata, Schools)
│   │   │   └── app_database.dart # SQLite database & query executors
│   │   ├── remote/
│   │   │   ├── supabase_client.dart # Supabase client & Auth stream
│   │   │   ├── books_api.dart       # Supabase books queries & RPC callers
│   │   │   ├── schools_api.dart     # Schools CRUD operations
│   │   │   ├── admin_api.dart       # Supabase Edge Functions invoker
│   │   │   └── google_books_api.dart# External ISBN metadata lookup
│   │   ├── repositories/
│   │   │   ├── book_repository.dart
│   │   │   ├── metadata_repository.dart
│   │   │   └── school_repository.dart
│   │   └── sync/
│   │       ├── sync_service.dart     # Outbox queue flusher & pull engine
│   │       └── connectivity_watcher.dart # Network change listener
│   ├── features/
│   │   ├── account/           # Profile photo upload, full name, password update
│   │   ├── admin/             # Manager admin portal (Schools, Users, Explore, Analytics)
│   │   ├── auth/              # Sign in, forgot password, recovery callback
│   │   ├── clerk/             # Clerk dashboard, school selector, CSV export, recovery
│   │   └── scan/              # Collector camera scan workflow, undo stack, duplicate warnings
│   └── shared/
│       ├── utils/
│       │   ├── author_split.dart # Multi-author (1 to 5) parsing utilities
│       │   └── csv.dart          # Shared 14-column CSV schema encoder/decoder
│       └── widgets/
│           └── book_widgets.dart # Badges, stat cards & shared UI components
└── test/
    └── widget_test.dart       # Unit test suite (Validators, Authors, CSV schema)
```

---

## Prerequisites

- **Flutter SDK**: `3.47.9` (stable channel) with **Dart** `3.13.7`
- **For Android Builds**:
  - Android Studio with Android SDK Platform 36 & 35
  - Android NDK `28.2.13676358`
  - Java JDK 17 / 21
- **For Windows Builds**:
  - Windows 10/11 64-bit
  - Visual Studio 2022 (with *Desktop development with C++* workload)
  - Developer Mode enabled in Windows Settings (`ms-settings:developers`)

---

## Development & Build Commands

> **Important**: Always change directory to `native_app` before executing Flutter commands:
> ```powershell
> cd native_app
> ```

### 1. Run Tests and Static Analysis
```powershell
flutter test
flutter analyze
```

### 2. Code Generation (Drift SQLite Tables)
When modifying tables in `lib/data/local/tables.dart`, re-run code generation:
```powershell
dart run build_runner build --delete-conflicting-outputs
```

### 3. Run Locally on Windows Desktop
```powershell
flutter run -d windows
```

### 4. Build Android Release APK
Build universal APK or targeted per-architecture APK:
```powershell
# Targeted build for modern 64-bit Android devices (recommended, faster & smaller)
flutter build apk --release --target-platform android-arm64

# Split per ABI (generates separate APKs for arm64, arm32, x86_64)
flutter build apk --release --split-per-abi

# Google Play App Bundle (for Play Store publishing)
flutter build appbundle --release
```
**Output location**: `build/app/outputs/flutter-apk/app-release.apk`

### 5. Build Windows Release Executable
```powershell
flutter build windows --release
```
**Output directory**: `build/windows/x64/runner/Release/`
*(Contains `book_inventory.exe`, required Flutter engine DLLs, and application data folder).*

---

## Production Security Notes

1. **Credentials Injection**:
   Do not hardcode production credentials in source code. Inject them at build time via `--dart-define`:
   ```powershell
   flutter build apk --release \
     --dart-define=SUPABASE_URL=https://xxxx.supabase.co \
     --dart-define=SUPABASE_ANON_KEY=your-publishable-key
   ```
2. **Key Security**: Only the publishable/anon key is shipped with the client. The `service_role` key must **never** be included in the mobile or desktop binary.
3. **Privileged Operations**: Sensitive actions (creating users, revoking sessions, deleting accounts) run strictly through the Supabase Edge Functions (`create-user`, `update-user`, `delete-user`, `revoke-all-sessions`), which enforce permissions on the server.
