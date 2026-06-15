create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
security definer
as $$
  declare
    claims jsonb;
    user_role public.app_role;
  begin
    -- Check if the user has a role in the user_roles table
    select role into user_role from public.user_roles where user_id = (event->>'user_id')::uuid;

    claims := event->'claims';

    if user_role is not null then
      -- Set the claim
      claims := jsonb_set(claims, '{app_role}', to_jsonb(user_role));
    else
      claims := claims - 'app_role';
    end if;

    -- Update the 'claims' object in the original event
    event := jsonb_set(event, '{claims}', claims);

    -- Return the modified or original event
    return event;
  end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;

-- Update existing functions to read from the JWT
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (current_setting('request.jwt.claims', true)::jsonb ->> 'app_role')::public.app_role = _role,
    false
  )
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (current_setting('request.jwt.claims', true)::jsonb ->> 'app_role') in ('admin', 'super_admin'),
    false
  )
$$;
