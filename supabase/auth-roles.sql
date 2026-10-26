-- D&D Lore Portal: email/password authentication and initial global roles.
-- Run this once in Supabase Dashboard -> SQL Editor for project qfddxghiwzmtdoxcxrhy.
-- All new accounts start as "player". Promote trusted users to "master" manually below.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text not null default '',
  role text not null default 'player' check (role in ('master','player')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users can read only their own profile.
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

-- Users may change their display name, but not their role or email.
drop policy if exists "Users can update own display name" on public.profiles;
create policy "Users can update own display name"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

revoke all on public.profiles from anon, authenticated;
grant select (id, email, display_name, role, created_at, updated_at)
  on public.profiles to authenticated;
grant update (display_name, updated_at) on public.profiles to authenticated;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    'player'
  )
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

-- Optional: after the first account is registered and email is confirmed,
-- run this separately to grant the account Master role. Replace the email.
-- update public.profiles set role = 'master', updated_at = now()
-- where lower(email) = lower('your-email@example.com');

-- New accounts are Players by default. Role changes are deliberately admin-only
-- via the Supabase SQL Editor; do not add a client-side role selector.
