
create index if not exists books_isbn_school_idx
  on public.books(isbn, school_id)
  where isbn is not null;

create or replace function public.get_school_stats()
returns table(
  school_id uuid,
  total_books bigint,
  clerk_count bigint,
  last_entry timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id as school_id,
    coalesce((select sum(b.quantity) from public.books b where b.school_id = s.id), 0) as total_books,
    (select count(*) from public.clerk_schools cs where cs.school_id = s.id) as clerk_count,
    (select max(b.created_at) from public.books b where b.school_id = s.id) as last_entry
  from public.schools s
$$;

grant execute on function public.get_school_stats() to authenticated;
