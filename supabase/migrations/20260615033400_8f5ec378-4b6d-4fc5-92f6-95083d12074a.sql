
create or replace function public.get_school_stats()
returns table(
  school_id uuid,
  total_books bigint,
  clerk_count bigint,
  last_entry timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_staff(auth.uid()) then
    raise exception 'not authorized';
  end if;
  return query
  select
    s.id as school_id,
    coalesce((select sum(b.quantity) from public.books b where b.school_id = s.id), 0)::bigint as total_books,
    (select count(*) from public.clerk_schools cs where cs.school_id = s.id)::bigint as clerk_count,
    (select max(b.created_at) from public.books b where b.school_id = s.id) as last_entry
  from public.schools s;
end;
$$;
