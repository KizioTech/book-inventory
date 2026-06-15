-- Replace the is_staff() write policy with a direct JWT claim check
-- (consistent with how other RLS policies work in this project)
drop policy if exists "book_metadata_write_staff" on public.book_metadata;

create policy "book_metadata_write_staff" on public.book_metadata
  for all to authenticated
  using  ((auth.jwt() ->> 'app_role') in ('admin', 'super_admin'))
  with check ((auth.jwt() ->> 'app_role') in ('admin', 'super_admin'));
