-- Allow any authenticated user to INSERT into book_metadata (contribute new discoveries),
-- while keeping UPDATE/DELETE restricted to admins only.
drop policy if exists "book_metadata_write_staff" on public.book_metadata;

-- Any authenticated user may contribute a new entry
create policy "book_metadata_insert_authenticated" on public.book_metadata
  for insert to authenticated
  with check (true);

-- Only admins/super_admins may edit or remove entries
create policy "book_metadata_modify_admin" on public.book_metadata
  for all to authenticated
  using  ((auth.jwt() ->> 'app_role') in ('admin', 'super_admin'))
  with check ((auth.jwt() ->> 'app_role') in ('admin', 'super_admin'));
