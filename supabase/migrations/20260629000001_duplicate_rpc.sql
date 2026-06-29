-- ============================================================================
-- MIGRATION: 20260629000001_duplicate_rpc.sql
-- DESCRIPTION: Adds RPC for finding ISBN duplicate groups efficiently
-- ============================================================================

CREATE OR REPLACE FUNCTION get_duplicate_groups(p_school_id uuid DEFAULT NULL)
RETURNS TABLE (
  isbn text,
  title text,
  author text,
  school_id uuid,
  duplicate_count bigint
) AS $$
  SELECT 
    b.isbn,
    MAX(b.title) as title,
    MAX(b.author) as author,
    b.school_id,
    COUNT(*) as duplicate_count
  FROM public.books b
  WHERE b.isbn IS NOT NULL 
    AND b.isbn != ''
    AND (p_school_id IS NULL OR b.school_id = p_school_id)
  GROUP BY b.isbn, b.school_id
  HAVING COUNT(*) > 1
  ORDER BY duplicate_count DESC;
$$ LANGUAGE sql STABLE;
