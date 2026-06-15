create extension if not exists pg_trgm;

create index if not exists books_title_trgm_idx
  on public.books using gin(title gin_trgm_ops)
  where title is not null;
