-- Drop the duplicate trigram index (keep idx_book_metadata_title_trgm, the
-- more recently created / consistently-named one)
DROP INDEX IF EXISTS public.book_metadata_title_trgm_idx;

-- Refresh planner statistics after bulk loads so the trigram index is
-- reliably chosen over a sequential scan
ANALYZE public.book_metadata;
