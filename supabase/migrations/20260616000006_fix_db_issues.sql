-- 1. Redefine get_school_stats to use subqueries to prevent cartesian duplicate counts
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

-- 2. Drop existing problematic RLS policies for book_metadata
DROP POLICY IF EXISTS "book_metadata_insert_authenticated" ON public.book_metadata;
DROP POLICY IF EXISTS "book_metadata_modify_admin" ON public.book_metadata;
DROP POLICY IF EXISTS "book_metadata_select_all" ON public.book_metadata;
DROP POLICY IF EXISTS "book_metadata_insert_all" ON public.book_metadata;
DROP POLICY IF EXISTS "book_metadata_update_admin" ON public.book_metadata;
DROP POLICY IF EXISTS "book_metadata_delete_admin" ON public.book_metadata;

-- 3. Create explicit, clean policies
-- All authenticated users can read metadata (Fixes clerk auto-save check)
CREATE POLICY "book_metadata_select_all" ON public.book_metadata
  FOR SELECT TO authenticated
  USING (true);

-- All authenticated users can insert new metadata (Fixes clerk auto-save insert)
CREATE POLICY "book_metadata_insert_all" ON public.book_metadata
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Only admins and super admins can update existing metadata (Fixes admin CSV overwrite)
CREATE POLICY "book_metadata_update_admin" ON public.book_metadata
  FOR UPDATE TO authenticated
  USING ((auth.jwt() ->> 'app_role') IN ('admin', 'super_admin'));

-- Only admins and super admins can delete metadata
CREATE POLICY "book_metadata_delete_admin" ON public.book_metadata
  FOR DELETE TO authenticated
  USING ((auth.jwt() ->> 'app_role') IN ('admin', 'super_admin'));
