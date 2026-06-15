-- Enable trigram extension if not already present (needed for title search)
create extension if not exists pg_trgm;

-- Reference catalogue: shared across all schools
create table public.book_metadata (
  id          uuid    primary key default gen_random_uuid(),
  isbn        text,                        -- nullable; some books have no barcode
  title       text    not null,
  author      text,
  publisher   text,
  year        text,
  category    text,
  created_at  timestamptz not null default now()
);

-- Fast ISBN lookup (the primary scan path)
create unique index book_metadata_isbn_idx
  on public.book_metadata (isbn)
  where isbn is not null;

-- Fast fuzzy title search (for books without barcodes)
create index book_metadata_title_trgm_idx
  on public.book_metadata using gin (title gin_trgm_ops)
  where title is not null;

-- RLS: everyone can read; only staff can write
alter table public.book_metadata enable row level security;

create policy "book_metadata_select_all" on public.book_metadata
  for select to authenticated using (true);

create policy "book_metadata_write_staff" on public.book_metadata
  for all to authenticated
  using  (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

-- Permissions
grant select on public.book_metadata to authenticated;
grant all    on public.book_metadata to service_role;
