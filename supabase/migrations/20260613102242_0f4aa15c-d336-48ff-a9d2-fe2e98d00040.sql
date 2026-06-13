
-- Enum
create type public.app_role as enum ('super_admin', 'admin', 'clerk');

-- Schools
create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  district text,
  region text,
  contact text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.schools to authenticated;
grant all on public.schools to service_role;
alter table public.schools enable row level security;

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- User roles (separate table; never on profiles)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

-- Clerk <-> Schools assignment
create table public.clerk_schools (
  clerk_id uuid not null references public.profiles(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  primary key (clerk_id, school_id)
);
grant select, insert, update, delete on public.clerk_schools to authenticated;
grant all on public.clerk_schools to service_role;
alter table public.clerk_schools enable row level security;

-- Books
create table public.books (
  id uuid primary key default gen_random_uuid(),
  isbn text,
  title text,
  author text,
  publisher text,
  year text,
  quantity integer not null default 1,
  condition text check (condition in ('Good','Fair','Poor')),
  notes text,
  school_id uuid not null references public.schools(id) on delete cascade,
  clerk_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.books to authenticated;
grant all on public.books to service_role;
alter table public.books enable row level security;

create index books_school_id_idx on public.books(school_id);
create index books_clerk_id_idx on public.books(clerk_id);
create index books_created_at_idx on public.books(created_at desc);

-- Role check function
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- Convenience: user is staff (admin or super_admin)
create or replace function public.is_staff(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role in ('admin','super_admin')
  )
$$;

-- Clerk assigned to school
create or replace function public.clerk_has_school(_user_id uuid, _school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.clerk_schools
    where clerk_id = _user_id and school_id = _school_id
  )
$$;

-- Auto-create profile + role on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_count int;
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.email
  )
  on conflict (id) do nothing;

  select count(*) into user_count from public.user_roles;
  if user_count = 0 then
    insert into public.user_roles (user_id, role) values (new.id, 'super_admin');
  else
    insert into public.user_roles (user_id, role)
    values (new.id, coalesce((new.raw_user_meta_data ->> 'role')::public.app_role, 'clerk'))
    on conflict do nothing;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- RLS Policies

-- profiles: users read own; staff read all; staff update all
create policy "profiles_select_own" on public.profiles for select
  to authenticated using (id = auth.uid() or public.is_staff(auth.uid()));
create policy "profiles_update_own_or_staff" on public.profiles for update
  to authenticated using (id = auth.uid() or public.is_staff(auth.uid()))
  with check (id = auth.uid() or public.is_staff(auth.uid()));
create policy "profiles_insert_staff" on public.profiles for insert
  to authenticated with check (public.is_staff(auth.uid()));
create policy "profiles_delete_super" on public.profiles for delete
  to authenticated using (public.has_role(auth.uid(), 'super_admin'));

-- user_roles: users read own; staff read all; only super_admin writes
create policy "user_roles_select" on public.user_roles for select
  to authenticated using (user_id = auth.uid() or public.is_staff(auth.uid()));
create policy "user_roles_write_super" on public.user_roles for all
  to authenticated using (public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'super_admin'));

-- schools: any authenticated user reads (clerks need to see their assigned ones); staff manage
create policy "schools_select_all" on public.schools for select
  to authenticated using (true);
create policy "schools_write_staff" on public.schools for all
  to authenticated using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

-- clerk_schools: clerks read own rows; staff manage all
create policy "clerk_schools_select" on public.clerk_schools for select
  to authenticated using (clerk_id = auth.uid() or public.is_staff(auth.uid()));
create policy "clerk_schools_write_staff" on public.clerk_schools for all
  to authenticated using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

-- books: clerks read/write own school rows; staff read/write all
create policy "books_select" on public.books for select
  to authenticated using (
    public.is_staff(auth.uid())
    or (clerk_id = auth.uid() and public.clerk_has_school(auth.uid(), school_id))
  );
create policy "books_insert" on public.books for insert
  to authenticated with check (
    public.is_staff(auth.uid())
    or (clerk_id = auth.uid() and public.clerk_has_school(auth.uid(), school_id))
  );
create policy "books_update" on public.books for update
  to authenticated using (
    public.is_staff(auth.uid())
    or (clerk_id = auth.uid() and public.clerk_has_school(auth.uid(), school_id))
  ) with check (
    public.is_staff(auth.uid())
    or (clerk_id = auth.uid() and public.clerk_has_school(auth.uid(), school_id))
  );
create policy "books_delete" on public.books for delete
  to authenticated using (
    public.is_staff(auth.uid())
    or (clerk_id = auth.uid())
  );
