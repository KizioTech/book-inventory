-- The original migration only granted SELECT to authenticated.
-- Grant the remaining DML privileges so RLS can then filter by role.
grant insert, update, delete on public.book_metadata to authenticated;
