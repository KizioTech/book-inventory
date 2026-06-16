-- 1. Rewrite get_school_stats to use single pass with aggregation instead of N+1
CREATE OR REPLACE FUNCTION get_school_stats()
RETURNS TABLE(
  school_id uuid,
  total_books bigint,
  clerk_count bigint,
  last_entry timestamptz
) AS $$
  SELECT
    s.id AS school_id,
    COALESCE((SELECT SUM(b.quantity) FROM books b WHERE b.school_id = s.id), 0) AS total_books,
    (SELECT COUNT(*) FROM clerk_schools cs WHERE cs.school_id = s.id) AS clerk_count,
    (SELECT MAX(b.created_at) FROM books b WHERE b.school_id = s.id) AS last_entry
  FROM schools s
  WHERE s.active = true;
$$ LANGUAGE sql STABLE;

-- 2. Create composite indexes
CREATE INDEX IF NOT EXISTS books_school_clerk_idx
  ON books (school_id, clerk_id);

CREATE INDEX IF NOT EXISTS books_school_created_idx
  ON books (school_id, created_at DESC);
