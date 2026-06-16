-- Replace the partial unique index with a standard unique constraint
-- so that 'ON CONFLICT (isbn)' can properly trigger for upsert operations.

DROP INDEX IF EXISTS public.book_metadata_isbn_idx;
ALTER TABLE public.book_metadata ADD CONSTRAINT book_metadata_isbn_key UNIQUE (isbn);
