# Book Inventory Management

A full-stack web application for cataloguing physical book collections across multiple schools or sites. Field staff ("clerks") scan barcodes or search a shared metadata pool to log books on-site, while administrators manage schools, users, and reference data, and review analytics across the whole network. The app works offline-first during scanning sessions and ships as both a web app and a Capacitor-wrapped Android app.

Built by **FutecAI Limited Company**.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture & Directory Structure](#architecture--directory-structure)
- [Data Model Overview](#data-model-overview)
- [Database Migrations](#database-migrations)
- [Roles & Access Control](#roles--access-control)
- [Routes](#routes)
- [Core Features](#core-features)
  - [Authentication](#authentication)
  - [Scanning Workflow (Clerk)](#scanning-workflow-clerk)
  - [Clerk Dashboard](#clerk-dashboard)
  - [Admin Panel](#admin-panel)
  - [Explore / Search](#explore--search)
  - [Reference Data & Bulk Metadata Import](#reference-data--bulk-metadata-import)
  - [CSV Export](#csv-export)
  - [Offline Support & Recovery](#offline-support--recovery)
- [Setup & Local Development](#setup--local-development)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Mobile (Capacitor) Build](#mobile-capacitor-build)
- [Routing Conventions](#routing-conventions)
- [Contributing](#contributing)

## Tech Stack

| Concern | Library / Service |
| --- | --- |
| UI framework | React 19 + TypeScript, built with Vite |
| Routing | `@tanstack/react-router` — file-based, type-safe routes |
| Server state / caching | `@tanstack/react-query` — queries, mutations, cache invalidation |
| Styling | Tailwind CSS v4 + a customized Shadcn UI component set (Radix UI primitives) |
| Icons | `lucide-react` |
| Backend / BaaS | Supabase — Postgres database, Auth, Row Level Security, Edge Functions, Realtime |
| Forms / validation | Manual `FormData`-based forms with hand-rolled validators (ISBN checksum, year range); `react-hook-form` + `zod` available for more complex forms |
| Barcode scanning | `@zxing/browser` / `@zxing/library` via a custom `BarcodeScanner` component |
| Background processing | Web Workers (`metadataWorker.ts`) for parsing large CSV imports off the main thread |
| External metadata | Google Books API (`lib/google-books.ts`) for ISBN lookups |
| Notifications | `sonner` toast library |
| Mobile shell | `@capacitor/core` + `@capacitor/android` |

## Architecture & Directory Structure

```text
├── src/
│   ├── components/             # Domain components
│   │   ├── ui/                 # Shadcn UI primitives (Button, Input, Dialog, GlassCard, etc.)
│   │   ├── barcode-scanner.tsx # Camera-based ISBN/barcode scanner (ZXing)
│   │   ├── BookDetailSheet.tsx # Read-only detail view for a book record
│   │   ├── EditBookDialog.tsx  # Edit form for an existing book record
│   │   ├── RecoveryDialog.tsx  # Resurfaces a failed offline save for retry
│   │   ├── status-badge.tsx    # School activity status pill (active/slow/idle/paused)
│   │   ├── analytics-tab.tsx   # Charts/aggregates for the admin Analytics tab
│   │   ├── account-settings.tsx# Self-service profile/password settings
│   │   └── dashboard-layout.tsx# Shared sidebar/tab shell for clerk & admin dashboards
│   ├── hooks/                  # Custom hooks (e.g. use-mobile for responsive breakpoints)
│   ├── integrations/
│   │   └── supabase/           # Supabase client instance + generated DB types
│   ├── lib/
│   │   ├── auth-context.tsx    # AuthProvider — session, profile, and role resolution
│   │   ├── queries.ts          # All TanStack Query hooks + shared row types
│   │   ├── google-books.ts     # Google Books API client for ISBN → metadata lookup
│   │   ├── book-metadata.ts    # Shared metadata pool search/typeahead + author splitting
│   │   ├── bookQueue.ts        # Background save queue with offline recovery
│   │   └── csv.ts              # Generic CSV serialization + browser download helper
│   ├── routes/                 # One file per route (see Routes below)
│   │   ├── __root.tsx          # App shell: providers, 404, and error boundary
│   │   ├── index.tsx           # `/` — auth/role redirector
│   │   ├── auth.tsx            # `/auth` — sign in + forgot password
│   │   ├── reset-password.tsx  # `/reset-password` — Supabase recovery flow
│   │   ├── scan.tsx             # `/scan` — clerk scanning workflow
│   │   ├── clerk.tsx            # `/clerk` — clerk dashboard (records, account)
│   │   ├── admin.tsx            # `/admin` — admin/super admin control panel
│   │   ├── explore.$schoolId.tsx# `/explore/:schoolId` — searchable per-school inventory
│   │   └── metadataWorker.ts    # Web Worker used by the admin CSV metadata importer
│   ├── styles.css              # Global CSS + Tailwind directives
│   └── main.tsx                # Application entry point (router + query client bootstrap)
├── supabase/
│   └── migrations/             # Database schema, RLS policies, functions, triggers
├── android/                    # Capacitor Android native project
└── package.json
```

## Data Model Overview

The schema lives in `supabase/migrations` and is built up incrementally — see [Database Migrations](#database-migrations) for the full history. The tables, as they stand after the latest migration, are:

- **`schools`** — `id`, `name`, `district`, `region`, `contact`, `notes`, `active`, `created_at`. Represents a cataloguing site.
- **`books`** — the per-scan inventory record. Started as `id`, `isbn`, `title`, `author`, `publisher`, `year`, `quantity`, `condition` (`Good` / `Fair` / `Poor`), `notes`, `school_id`, `clerk_id`, `created_at`, and has since grown:
  - `category`, `shelf_location` (added once clerks needed to record where a book lives on the shelf)
  - `author_2` through `author_5` (added to support multi-author books — see the multi-author migration below)
  - `flagged_as_duplicate boolean not null default false` (set when a clerk explicitly saves a record despite a duplicate warning)
- **`book_metadata`** — a shared, cross-school reference catalogue used to power ISBN lookups, title typeahead, and bulk CSV import: `id`, `isbn` (unique), `title` (required), `author` through `author_5`, `publisher`, `year`, `category`, `created_at`. Pre-populated with a large seed dataset of Malawian school textbook metadata (see [Database Migrations](#database-migrations)).
- **`profiles`** — one row per `auth.users` entry: `id` (FK to `auth.users`), `full_name`, `email`, `active`, `avatar_url`, `created_at`. Auto-created by a trigger on signup.
- **`user_roles`** — `id`, `user_id`, `role` (`app_role` enum: `super_admin` / `admin` / `clerk`), unique on `(user_id, role)`. Deliberately kept separate from `profiles` rather than storing the role as a column, so role checks can be locked down independently.
- **`clerk_schools`** — composite primary key `(clerk_id, school_id)` mapping which schools a clerk is allowed to scan for. (Referred to elsewhere as "clerk school assignments" — the actual table name is `clerk_schools`.)

### Roles, RLS, and JWT claims

Role-aware access control evolved across several migrations rather than being designed in one pass:

- Initially, `has_role()`, `is_staff()`, and `clerk_has_school()` were `security definer` SQL functions that queried `user_roles` / `clerk_schools` directly on every check.
- A **custom access token hook** (`custom_access_token_hook`) was later added so Supabase Auth embeds the user's role directly into the JWT as an `app_role` claim at token-issue time. `has_role()` and `is_staff()` were then rewritten to read `request.jwt.claims` / `auth.jwt()` instead of hitting the `user_roles` table on every request — this avoids a DB round-trip per row-level check and is why some RLS policies in later migrations compare `(auth.jwt() ->> 'app_role')` directly instead of calling `is_staff()`.
- Because the role now lives in the JWT, **a user must sign in again (or otherwise refresh their token) after their role changes** for the new permissions to take effect.

### Search & performance indexes

- `pg_trgm` (trigram) GIN indexes on `books.title` and `book_metadata.title` enable fast fuzzy/partial title search (used by typeahead and the Explore search box).
- A partial unique index on `books(isbn, school_id)` (where `isbn is not null`) supports the duplicate-ISBN check during scanning.
- Composite indexes on `books(school_id, clerk_id)` and `books(school_id, created_at desc)`, plus single-column indexes on `clerk_schools(school_id)` and `user_roles(user_id)`, were added specifically to speed up the dashboard stats and per-request role lookups.
- `book_metadata.isbn` has a `unique` constraint (not just a partial unique index) specifically so that `upsert(..., { onConflict: "isbn" })` calls from the app work correctly.

### Storage

A public `avatars` Supabase Storage bucket backs the `profiles.avatar_url` field, with policies allowing public read access and letting each user manage only files under their own `auth.uid()`-prefixed folder.

## Database Migrations

Migrations are timestamp-ordered SQL files in `supabase/migrations/`. Run them in order against a fresh Supabase project to reconstruct the schema. In chronological order:

| Migration | What it does |
| --- | --- |
| `20260613102242_…` | Initial schema: `app_role` enum, `schools`, `profiles`, `user_roles`, `clerk_schools`, `books`; `has_role` / `is_staff` / `clerk_has_school` helper functions; `handle_new_user` trigger (first signed-up user becomes `super_admin`, everyone else defaults to `clerk`); full RLS policy set. |
| `20260613102255_…` | Locks down `execute` privileges on the helper functions and trigger function so only `authenticated` (not `public`/`anon`) can call them. |
| `20260614044742_…` | Adds `category` and `shelf_location` columns to `books`. |
| `20260615033349_…` | Adds a partial index on `books(isbn, school_id)`; introduces `get_school_stats()` (SQL function) for the admin Schools tab. |
| `20260615033400_…` | Rewrites `get_school_stats()` in PL/pgSQL with an explicit `is_staff()` authorization check (raises an exception if the caller isn't staff). |
| `20260615034032_…` | Enables `pg_trgm` and adds a trigram GIN index on `books.title` for fuzzy search. |
| `20260615040800_…` | Adds `custom_access_token_hook` to embed the user's role as an `app_role` claim in the JWT at token issuance, and rewrites `has_role()` / `is_staff()` to read that claim instead of querying `user_roles`. |
| `20260616000001_…` | Creates `book_metadata` (the shared reference catalogue) with a unique partial index on `isbn` and a trigram index on `title`; RLS allows all authenticated reads, staff-only writes. |
| `20260616000002_…` | Replaces the `is_staff()`-based write policy on `book_metadata` with a direct JWT claim check, for consistency with other policies. |
| `20260616000003_…` | Grants the `insert`/`update`/`delete` privileges on `book_metadata` to `authenticated` that the original migration missed (RLS still filters by role). |
| `20260616000004_…` | Loosens `book_metadata` so **any** authenticated user can `insert` (clerks contributing new ISBN data while scanning), while `update`/`delete` stay admin-only. |
| `20260616000005_…` | Performance pass: rewrites `get_school_stats()` to avoid an N+1 query pattern and only return active schools; adds composite indexes `books(school_id, clerk_id)` and `books(school_id, created_at desc)`. |
| `20260616000006_…` | Bug-fix pass: re-adds the `active = true` filter dropped from an intermediate `get_school_stats()` edit; drops and recreates a clean, non-overlapping set of `book_metadata` RLS policies (open select/insert for all authenticated users, admin-only update/delete) after earlier policies had drifted. |
| `20260616000007_…` | Replaces the partial unique **index** on `book_metadata.isbn` with a proper unique **constraint**, since `ON CONFLICT (isbn)` upserts require a constraint (not just an index) to target. |
| `20260617000001_…` | Adds `clerk_schools(school_id)` and `user_roles(user_id)` indexes to speed up the clerk-count subquery in `get_school_stats()` and per-request role lookups. |
| `20260620000000_…` | Adds `profiles.avatar_url`; creates the public `avatars` storage bucket and its access policies (public read, owner-only write/update/delete keyed off the first path segment matching `auth.uid()`). |
| `20260624000001_…` | Adds `books.flagged_as_duplicate` (default `false`) plus a partial index for quickly listing flagged records in the admin records view. |
| `20260628143600_…` (multi-author) | Adds `author_2`–`author_5` to both `books` and `book_metadata`; backfills existing rows by splitting the legacy single `author` column on `;` into up to five separate author fields. |
| `20260628160000_…` (seed metadata) | Truncates and repopulates `book_metadata` with a large pre-existing catalogue of book records (titles, authors, publishers, years — largely Malawian school textbooks), seeding the reference pool so ISBN/title lookups have useful results from day one. |

> **Note on naming:** migrations after `20260616000006_…` use upper-case SQL keywords and Postgres's default unqualified function syntax, while earlier ones are lower-case and schema-qualified (`public.books`, etc.) — both are valid, just stylistically inconsistent, since several migrations were iterative bug fixes layered on top of each other rather than a single planned schema.

## Roles & Access Control

The app implements three roles, resolved in `lib/auth-context.tsx` and checked in nearly every route:

| Role | Landing route | Capabilities |
| --- | --- | --- |
| `clerk` | `/clerk` (dashboard) / `/scan` (scanning) | Scan books into assigned schools, edit/delete their own records, view a personal dashboard, export their own session as CSV. |
| `admin` | `/admin` | Everything a clerk can do, plus: manage schools, manage users/clerk assignments (except cannot promote/demote to `super_admin` or delete a super admin), browse/edit all records, manage the shared metadata pool, bulk export across schools. |
| `super_admin` | `/admin` | Everything an admin can do, plus: assign or change the `admin` / `super_admin` role on user accounts. |

Each route guards itself with a `useEffect` that redirects based on `loading`, `user`, and `role` — e.g. `admin.tsx` redirects non-admins to `/clerk`, and `clerk.tsx` redirects admins to `/admin`. The root index route (`/`) acts purely as a splash-screen redirector to the correct destination once the session resolves.

## Routes

| Path | File | Purpose |
| --- | --- | --- |
| `/` | `index.tsx` | Waits for auth state, then redirects to `/auth`, `/admin`, or `/clerk`. |
| `/auth` | `auth.tsx` | Email/password sign-in and "forgot password" trigger. |
| `/reset-password` | `reset-password.tsx` | Handles the Supabase recovery-link flow and lets the user set a new password. |
| `/scan` | `scan.tsx` | The primary clerk workflow: pick a school, scan/search books, fill in details, save. |
| `/clerk` | `clerk.tsx` | Clerk dashboard — personal stats, assigned schools, recent scans, and a full records table with delete. |
| `/admin` | `admin.tsx` | Tabbed admin panel: Analytics, Schools, Users, Records, Reference Data, Export, Account. |
| `/explore/$schoolId` | `explore.$schoolId.tsx` | Searchable, paginated table of every book recorded at one school, with inline quantity editing, delete, and CSV export. |
| *(root layout)* | `__root.tsx` | Wraps every route with `QueryClientProvider` and `AuthProvider`, renders the toaster, and supplies the 404 and runtime-error boundary components. |

## Core Features

### Authentication

- Email/password sign-in via Supabase Auth (`auth.tsx`).
- "Forgot password" sends a reset email (`supabase.auth.resetPasswordForEmail`) redirecting to `/reset-password`.
- `/reset-password` listens for the `PASSWORD_RECOVERY` auth event (or an existing recovery session) before allowing the user to set a new password, then signs them out and sends them back to `/auth` to log in fresh.
- Already-authenticated users hitting `/auth` are bounced straight to `/`.

### Scanning Workflow (Clerk)

The `/scan` route is the heart of the app and runs as a small state machine (`step`: `"scan" → "review" → "specifics"`):

1. **School selection** — the clerk picks from their assigned schools (`useAssignedSchoolsQuery`) before a session "locks in." Locking loads up to 200 of the clerk's most recent records for that school and attempts to flush any books stuck in the offline save queue from a previous session.
2. **Scan or search** — a barcode is read via the camera (`BarcodeScanner`, ZXing-based) or entered manually. On detection:
   - The current school's `books` table is checked first for an existing row with that ISBN (to avoid duplicate entries) — if found, the existing record opens in the edit dialog instead of creating a new one.
   - Otherwise, the ISBN is looked up against the **Google Books API** (`lookupIsbn`) to auto-fill title, author, publisher, year, and category.
   - If neither source has data, the clerk is dropped into manual entry with a warning toast.
3. **Review / specifics** — the clerk confirms or edits title, author(s), publisher, year, category, condition, quantity, and shelf location. Title input is also typeahead-searched against the shared `book_metadata` pool (`searchMetadataByTitle`) as an alternative to ISBN lookup.
4. **Validation** — before saving:
   - Title and author are the only hard-required fields.
   - ISBN, if present, is checksum-validated for both ISBN-10 and ISBN-13.
   - Publication year, if present, must fall between 1450 and the current year.
5. **Duplicate detection** — once both title and author are filled, a debounced check (`checkDuplicateExists`) looks for likely-duplicate titles already logged at that school. If a match is found the clerk can:
   - **Add to copy count** on the existing record instead of creating a new one, or
   - **Save as a separate record anyway** (the new row is flagged `flagged_as_duplicate`).
6. **Save** — the record is added to the in-memory session list optimistically, then persisted in the background via `saveBookInBackground` (see [Offline Support](#offline-support--recovery)). Books saved with both a title and an ISBN are also best-effort upserted into the shared `book_metadata` pool, growing the lookup database for future scans.
7. **Session records panel** — a collapsible, searchable table of everything scanned in the current session, with inline quantity +/- controls, per-row delete (with confirmation), a detail sheet, and an edit dialog. A running scan count and total-copies count are derived directly from this list so they survive a page refresh.
8. **Session CSV export** — exports the current session with an audit header (school, clerk, export timestamp, record/quantity totals) prepended to the CSV body.

### Clerk Dashboard

`/clerk` gives each clerk a personal overview, separate from the active scanning session:

- **Dashboard tab** — summary cards for total scans, scans logged today, and number of assigned schools; a list of assigned schools with a quick "Explore" link into that school's full inventory; and a feed of the 5 most recent scans.
- **My Records tab** — a paginated (20/page), full table of every book the clerk has personally logged, with delete support.
- **Account tab** — shared `AccountSettings` component for profile/password management.

### Admin Panel

`/admin` is organized into tabs via a shared `DashboardLayout`:

- **Analytics** — network-wide charts and aggregates (`AnalyticsTab`).
- **Schools** — card grid of every school showing book count, clerk count, a computed activity status (`active` / `slow` / `idle` / `paused`, derived from time since last entry and the school's `active` flag), and "time since last entry." Supports create, edit, pause/unpause, and delete (with confirmation), plus a one-click jump into that school's `/explore` view.
- **Users** — list of all profiles with role badges (Clerk / Admin / Super Admin), assigned-schools summary for clerks, enable/disable toggle, and delete (self-deletion and deleting a super admin are blocked in the UI). Includes:
  - **Create user dialog** — invokes a `create-user` Supabase Edge Function with name, email, optional password (omit it to trigger an email invite flow instead), role, and school assignments. Only a `super_admin` can create another `admin`.
  - **Manage user dialog** — edit an existing user's role (role changes restricted to `super_admin`) and school assignments.
- **Records** — admin-wide view across all schools/clerks (full table, not session-scoped).
- **Reference Data** *(metadata tab)* — see [Reference Data & Bulk Metadata Import](#reference-data--bulk-metadata-import) below.
- **Export** — network-wide CSV export with filters for a specific school (or all schools) and a date range, plus a live row-count estimate before downloading.
- **Account** — same `AccountSettings` component used in the clerk dashboard.

### Explore / Search

`/explore/$schoolId` is the canonical "browse everything for one school" view, available to both clerks (for their assigned schools) and admins:

- Debounced (300ms) live search across title, author, and ISBN.
- Paginated table (50 rows/page) with inline quantity +/- controls that persist immediately via mutation.
- Row click opens a read-only `BookDetailSheet`; from there, "Edit" opens the full `EditBookDialog`.
- Per-row delete with a confirmation dialog.
- "Export" downloads the currently filtered/visible page set as CSV with the same normalized column set used everywhere else in the app (`book_title`, `author` through `author_5`, `isbn`, `publisher_name`, `copyright_year`, `category_name`, `book_copies`, `status`, `shelf_location`, `remarks`).

### Reference Data & Bulk Metadata Import

The admin "Reference Data" tab manages the shared `book_metadata` pool independently of any school's live inventory:

- **Browse / verify** — debounced title search against the pool, returning title, author, ISBN, publisher, and year.
- **Bulk CSV import** — accepts a CSV with columns `book_title, author, isbn, publisher, year_published, category_name` (multiple authors in a single cell are semicolon-separated). Parsing is offloaded to a **Web Worker** (`metadataWorker.ts`) so large files don't block the UI thread:
  1. The worker reads the file, splits it into rows, and batches them (default batch size 50).
  2. Each batch is posted back to the main thread, which `upsert`s it into `book_metadata` keyed on `isbn` (existing ISBN matches are updated in place).
  3. Progress is reported as a percentage and rendered as a progress bar; the import can be cancelled mid-flight via an `AbortController`.
  4. ISBNs are sanitized (`[^0-9Xx]` stripped) and rows with no title are silently dropped.

### CSV Export

All CSV export surfaces in the app (`/scan`, `/explore/$schoolId`, admin Export tab) write the **same normalized column schema** — `book_title`, `author`, `author_2`–`author_5`, `isbn`, `publisher_name`, `copyright_year`, `category_name`, `book_copies`, `status`, `shelf_location`, `remarks` — using the shared `toCsv` / `downloadCsv` helpers in `lib/csv.ts`. This keeps exports interchangeable regardless of where in the app they were generated, and matches the same column shape the metadata importer expects on the way back in.

### Offline Support & Recovery

Because clerks scan in places with unreliable connectivity, saves are designed to degrade gracefully:

- `saveBookInBackground` (in `lib/bookQueue.ts`) persists a scanned book asynchronously without blocking the scan-next flow. New records appear in the session list immediately (optimistic UI), independent of whether the network write has completed.
- If a save fails (e.g. the device goes offline mid-write), the failed payload is queued and surfaced via a `RecoveryDialog`, letting the clerk retry or discard it without losing the data they already entered.
- The app listens for the browser's `online` event and automatically attempts to flush any queued, previously-failed saves as soon as connectivity returns — also re-attempted whenever a new scanning session is started.

## Setup & Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables** — see [Environment Variables](#environment-variables) below.

3. **Run the dev server**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

5. **Lint and format**
   ```bash
   npm run lint
   npm run format
   ```

## Environment Variables

Create a `.env` or `.env.local` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

The Supabase project must also have:
- The schema in `supabase/migrations` applied (tables, RLS policies, and any triggers/functions).
- A `create-user` Edge Function deployed (used by the admin "Create user" dialog to provision auth users + profile + role + school assignments in one call).
- Email delivery configured for password reset and (optionally) invite-based account creation.

## Available Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite dev server with hot reload. |
| `npm run build` | Type-check and bundle for production. |
| `npm run lint` | Run ESLint across the project. |
| `npm run format` | Run the configured formatter. |

## Mobile (Capacitor) Build

The `android/` directory contains a Capacitor-wrapped native shell so the same web app can run as an installable Android app (useful for clerks scanning with a device camera in the field). After building the web assets, sync and open the native project with the standard Capacitor CLI workflow (`npx cap sync android`, then open/build via Android Studio or `npx cap run android`).

## Routing Conventions

This project uses **TanStack Start's file-based routing**. Every `.tsx` file under `src/routes/` is a route — do not introduce `src/pages/`, Next.js-style `app/` directories, or similar conventions from other frameworks. There is exactly one root layout: `src/routes/__root.tsx`.

| File | URL |
| --- | --- |
| `index.tsx` | `/` |
| `about.tsx` | `/about` |
| `users/index.tsx` | `/users` |
| `users/$id.tsx` | `/users/:id` (dynamic segment — bare `$`, no curly braces) |
| `posts/{-$category}.tsx` | `/posts/:category?` (optional segment) |
| `files/$.tsx` | `/files/*` (splat segment — read via the `_splat` param, never `*`) |
| `_layout.tsx` | Layout route (renders children via `<Outlet />`) |
| `__root.tsx` | App shell — wraps every page; preserves `<Outlet />`, providers, 404, and error boundary |

`routeTree.gen.ts` is auto-generated by the router plugin. **Never edit it by hand** — it's regenerated from the contents of `src/routes/`.

## Contributing

- Reuse the existing `components/ui` library (Shadcn/Radix-based) before introducing new UI primitives.
- Keep business logic in `src/lib` as small, pure, well-typed functions — document inputs, outputs, and side effects (especially anything touching Supabase or the offline queue).
- New routes should follow the existing pattern: define the route with `createFileRoute`, guard access in a `useEffect` based on `useAuth()`'s `user`/`role`/`loading`, and render a loading state until auth resolves.
- When adding a new exportable data view, reuse the shared CSV column schema in `lib/csv.ts` rather than inventing a new one, so exports stay interchangeable across the app.
- Any new bulk-import or bulk-processing feature that parses large files should follow the `metadataWorker.ts` pattern (off-main-thread Web Worker, batched messages, progress reporting, and a cancel/abort path).