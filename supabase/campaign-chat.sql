-- DnD Lore Portal: private master/player messages and unread notifications.
-- Run once in Supabase Dashboard -> SQL Editor after the campaign characters/battle migration.

create table if not exists public.campaign_messages (
  id uuid primary key default gen_random_uuid(),
  campaign_slug text not null,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint campaign_messages_no_self_message check (sender_id <> recipient_id)
);

create index if not exists campaign_messages_campaign_created_idx
  on public.campaign_messages (campaign_slug, created_at desc);
create index if not exists campaign_messages_recipient_unread_idx
  on public.campaign_messages (recipient_id, read_at, created_at desc);

alter table public.campaign_messages enable row level security;

drop policy if exists "Campaign chat participants can read messages" on public.campaign_messages;
create policy "Campaign chat participants can read messages"
on public.campaign_messages for select to authenticated
using (
  sender_id = (select auth.uid())
  or recipient_id = (select auth.uid())
  or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'master')
);

drop policy if exists "Master and players can send private messages" on public.campaign_messages;
create policy "Master and players can send private messages"
on public.campaign_messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and (
    (
      exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'master')
      and exists (select 1 from public.campaign_members m
        where m.campaign_slug = campaign_messages.campaign_slug
          and m.user_id = campaign_messages.recipient_id)
    )
    or
    (
      exists (select 1 from public.campaign_members m
        where m.campaign_slug = campaign_messages.campaign_slug
          and m.user_id = (select auth.uid()))
      and exists (select 1 from public.profiles p
        where p.id = campaign_messages.recipient_id and p.role = 'master')
    )
  )
);

drop policy if exists "Recipients can mark messages as read" on public.campaign_messages;
create policy "Recipients can mark messages as read"
on public.campaign_messages for update to authenticated
using (recipient_id = (select auth.uid()))
with check (recipient_id = (select auth.uid()));

create or replace function public.get_campaign_master(p_campaign_slug text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_master_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if not exists (
    select 1 from public.campaign_members m
    where m.campaign_slug = p_campaign_slug and m.user_id = auth.uid()
  ) then
    if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'master') then
      raise exception 'not_campaign_member';
    end if;
  end if;

  select p.id into v_master_id
  from public.profiles p
  where p.role = 'master'
  order by p.id
  limit 1;

  return v_master_id;
end;
$$;
revoke all on function public.get_campaign_master(text) from public, anon;
grant execute on function public.get_campaign_master(text) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'campaign_messages'
  ) then
    alter publication supabase_realtime add table public.campaign_messages;
  end if;
exception when undefined_object then
  raise notice 'Publication supabase_realtime is not available; enable Realtime for campaign_messages in Supabase Dashboard.';
end $$;
