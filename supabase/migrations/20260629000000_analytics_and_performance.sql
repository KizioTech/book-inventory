-- ============================================================================
-- MIGRATION: 20260629000000_analytics_and_performance.sql
-- DESCRIPTION: Applies performance indexes and fixes analytics accuracy
-- ============================================================================

-- 1. Create pg_trgm extension for ILIKE optimization
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Create trigram indexes for metadata and books
CREATE INDEX IF NOT EXISTS idx_book_metadata_title_trgm ON public.book_metadata USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_books_title_trgm ON public.books USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_books_author_trgm ON public.books USING gin (author gin_trgm_ops);

-- 3. Create index for school_id scoping on books table
CREATE INDEX IF NOT EXISTS idx_books_school_id ON public.books (school_id);

-- 4. Update get_school_stats to properly exclude flagged duplicates from aggregates
CREATE OR REPLACE FUNCTION get_school_stats()
RETURNS TABLE(
  school_id uuid,
  total_books bigint,
  clerk_count bigint,
  last_entry timestamptz
) AS $$
  SELECT
    s.id AS school_id,
    COALESCE(
      (SELECT SUM(b.quantity) 
       FROM books b 
       WHERE b.school_id = s.id 
         AND COALESCE(b.flagged_as_duplicate, false) = false), 
      0
    ) AS total_books,
    (SELECT COUNT(*) FROM clerk_schools cs WHERE cs.school_id = s.id) AS clerk_count,
    (SELECT MAX(b.created_at) 
     FROM books b 
     WHERE b.school_id = s.id 
       AND COALESCE(b.flagged_as_duplicate, false) = false) AS last_entry
  FROM schools s
  WHERE s.active = true;
$$ LANGUAGE sql STABLE;
