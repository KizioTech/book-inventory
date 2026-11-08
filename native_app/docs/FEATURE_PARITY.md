# Feature Parity & Architecture Audit: Web (`src/`) vs Native (`native_app/`)

This document tracks complete functional equivalence between the legacy React/TypeScript web client (`src/`) and the Flutter native client (`native_app/`) for Android and Windows.

---

## 1. High-Level Architecture Comparison

| Architectural Concern | Web Client (`src/`) | Native Client (`native_app/`) |
| :--- | :--- | :--- |
| **Framework / Language** | React 19, TypeScript, Vite | Flutter 3.47+, Dart 3.13+ |
| **State Management** | TanStack Query + React Context | Flutter Riverpod 3.0 Notifiers & Providers |
| **Local Storage / Offline** | `localStorage` (volatile, evicted by OS) | **Drift (SQLite)** persistent database + Outbox table |
| **Barcode Scanning** | `@zxing/browser` (browser camera API) | `mobile_scanner` (Native Android camera & viewfinder; USB keyboard scanner on Windows) |
| **Backend Integration** | Supabase JS SDK + Edge Functions | `supabase_flutter` + Edge Functions |
| **Routing & Role Guarding** | TanStack Router (file-based) | `go_router` with JWT `app_role` claim guard |
| **Data Visualization** | Recharts | Native `fl_chart` vector rendering |
| **CSV Handling** | Browser Blob download | Streaming `csv` parser/encoder + `file_picker` / `share_plus` |

---

## 2. Feature-by-Feature Parity Status

### A. Authentication & User Profile
- [x] **Sign In**: Email & password authentication against Supabase Auth.
- [x] **Forgot Password**: Triggers Supabase password recovery email.
- [x] **Reset Password Flow**: Deep link intent handler (`com.futecai.bookinventory://reset-callback`) and password update screen.
- [x] **Session Persistence**: Secure session storage with automatic refresh tokens.
- [x] **Account Settings (`/account`)**:
  - Full name modification in Supabase `profiles`.
  - Avatar image upload (JPG, PNG, WEBP, GIF up to 5 MB) directly to the Supabase Storage `avatars` bucket.
  - Password update with validation.

### B. Collector Scan Workflow (`/scan`)
- [x] **Native Barcode Scanning**:
  - Continuous EAN-13, EAN-8, UPC-A detection on Android with camera switch and torch toggle.
  - Hardware USB barcode scanner and manual entry support on Windows.
- [x] **ISBN Checksum Validation**: Strict checksum calculation for both ISBN-10 and ISBN-13.
- [x] **4-Tier Metadata Lookup**:
  1. Local SQLite cache (instant and 100% offline).
  2. Supabase `book_metadata` shared reference pool.
  3. Google Books API via Dio.
  4. OpenLibrary API fallback.
  5. Automatic local cache persistence for subsequent offline scans.
- [x] **Multi-Author Splitting**: Automatic parsing of semicolon/comma delimited strings into `author`, `author_2`, `author_3`, `author_4`, `author_5`.
- [x] **Book Metadata Fields**: Title, authors, publisher, copyright year, category dropdown, condition chips (`Good`, `Fair`, `Poor`), quantity stepper, shelf location, and remarks.
- [x] **Duplicate Detection**: Real-time scan check against existing books for the active school with duplicate warning banner.
- [x] **Fast Save & Next**: Immediate local SQLite persistence with non-blocking background sync queue.
- [x] **Session Scan List**: Expandable list showing recent scans with copies, shelf location, and 1-tap **Undo**.
- [x] **Title Typeahead Suggestions**: Live debounce title search against `book_metadata` for books without barcodes.
- [x] **School Lock Toggle**: Lock switch preventing accidental school switching during active scanning.
- [x] **Camera Pause / Resume**: Freeze camera preview while editing form fields.
- [x] **Direct Item Edit from Session List**: Tap recent scan to open detail/edit dialog.

### C. Clerk Dashboard (`/clerk`)
- [x] **Assigned Schools Dropdown**: Queries `clerk_schools` to only list assigned schools.
- [x] **Sync Status Badges**: Real-time indicators for `synced` (green), `pending` (amber), and `failed` (red).
- [x] **Manual Sync Trigger**: Single-tap cloud sync button.
- [x] **Offline Recovery Dialog**: Surfaces server-rejected outbox rows with specific error reasons, with options to retry or discard.
- [x] **Search & Filter**: Client-side instant filtering by title, author, or ISBN.
- [x] **CSV Export**: Shared 14-column standard format with UTF-8 BOM.
- [x] **Summary Statistics Cards**: Total books, scanned today, and assigned schools metrics.
- [x] **Book Detail Modal (`BookDetailSheet`)**: Full record inspection modal.
- [x] **Edit Record Dialog (`EditBookDialog`)**: Inline editor for existing records.

### D. Manager Admin Portal (`/admin`)
- [x] **Responsive Desktop Layout**: NavigationRail / Sidebar on Windows, adaptively switching to bottom navigation on smaller screens.
- [x] **School Management**:
  - List all schools with active/paused status.
  - Create new school dialog (name, district, region, contact info).
  - Edit existing school metadata and toggle active/paused status.
  - Export full inventory per school to CSV.
- [x] **User Administration**:
  - List all users with profile avatar, email, full name, and role badges.
  - Create user dialog calling Edge Function `create-user` (immediate password or invite email flow).
  - Edit user dialog calling Edge Function `update-user` (role update and assigned schools).
  - Revoke all user sessions calling Edge Function `revoke-all-sessions`.
  - Delete user calling Edge Function `delete-user`.
- [x] **Inventory Exploration**: Per-school searchable inventory with category filtering, total copy metrics, and record inspection dialog.
- [x] **Duplicate Resolution**: Invokes `get_duplicate_groups` RPC to view ISBN duplicate clusters with direct navigation to the Duplicate Resolution Manager.
- [x] **Shared Metadata Catalogue**:
  - Search and browse global reference books pool in `book_metadata`.
  - Batch CSV metadata importer with real-time progress bar.
- [x] **Analytics Dashboard**: Summary metrics and `fl_chart` bar chart of collected books by school.

### E. Duplicate Resolution Engine (`/resolve-duplicates`)
- [x] Group duplicates by ISBN and school via database RPC.
- [x] Filter duplicates by school or view all schools.
- [x] **Completeness Scoring Algorithm**: Ranks candidates based on non-empty values across 7 tracked fields (`title`, `author`, `publisher`, `isbn`, `year`, `category`, `condition`).
- [x] **Automated "Merge All" Action**: Identifies master records by completeness score, sums total copy counts, marks `flagged_as_duplicate = false`, and purges duplicate rows.
- [x] **Interactive Group Merge**: Expandable group cards inspecting individual records with "Master" vs "Copy" badges, field completeness count, and single-click group merge.

---

## 3. Implementation Plan for Remaining Features

```
Phase 1: Shared Components
├── BookDetailSheet (rich bottom sheet for record inspection)
└── EditBookDialog (validated dialog for modifying existing records)

Phase 2: Scanning & Clerk Enhancements
├── Title typeahead dropdown in scan_screen.dart
├── School lock switch in scan_screen.dart
└── Summary cards & pagination in clerk_dashboard_screen.dart

Phase 3: Duplicate Resolution Engine
├── School filter selector
├── Completeness scoring calculator
└── "Merge All" & individual group merge handlers

Phase 4: Admin Records & Bulk Metadata Importer
├── Cross-school records table with filters
├── Edit school & Edit user modals
└── Batched CSV catalogue importer using Dart Isolate / compute()
```
