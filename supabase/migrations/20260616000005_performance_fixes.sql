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
    COALESCE(SUM(b.quantity), 0)   AS total_books,
    COUNT(DISTINCT cs.clerk_id)     AS clerk_count,
    MAX(b.created_at)               AS last_entry
  FROM schools s
  LEFT JOIN books b         ON b.school_id = s.id
  LEFT JOIN clerk_schools cs ON cs.school_id = s.id
  WHERE s.active = true
  GROUP BY s.id;
$$ LANGUAGE sql STABLE;

-- 2. Create composite indexes
CREATE INDEX IF NOT EXISTS books_school_clerk_idx
  ON books (school_id, clerk_id);

CREATE INDEX IF NOT EXISTS books_school_created_idx
  ON books (school_id, created_at DESC);
