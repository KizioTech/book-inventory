-- ============================================================================
-- MIGRATION: 20260617000001_performance_indexes.sql
-- DESCRIPTION: Creates performance optimization indexes for frequently queried
-- tables. These indexes are crucial for reducing latency on the dashboard
-- and during user authentication routing.
-- ============================================================================

-- Fix 1: Speed up get_school_stats() clerk count subquery
CREATE INDEX IF NOT EXISTS clerk_schools_school_id_idx
  ON public.clerk_schools (school_id);

-- Fix 2: Speed up per-request role lookup
CREATE INDEX IF NOT EXISTS user_roles_user_id_idx
  ON public.user_roles (user_id);
