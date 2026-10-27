-- DnD Lore Portal: private GM-to-player messages.
-- Run this file in Supabase Dashboard -> SQL Editor for project qfddxghiwzmtdoxcxrhy.
-- This creates a private inbox. The browser client cannot insert messages directly;
-- sending is done through a SECURITY DEFINER function that verifies the sender's role.

create table if not exists public.secret_player_notes (
  id uuid primary key default gen_random_uuid(),
  campaign_slug text not null default 'storm-kings-thunder',
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  recipient_email text not null,
  title text not null check (char_length(title) between 1 and 160),
  content text not null check (char_length(content) between 1 and 5000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists secret_player_notes_recipient_idx
  on public.secret_player_notes (recipient_id, created_at desc);
create index if not exists secret_player_notes_sender_idx
  on public.secret_player_notes (sender_id, created_at desc);

alter table public.secret_player_notes enable row level security;

drop policy if exists "Recipients and master senders can read private notes" on public.secret_player_notes;
create policy "Recipients and master senders can read private notes"
  on public.secret_player_notes
  for select to authenticated
  using (
    recipient_id = (select auth.uid())
    or (
      sender_id = (select auth.uid())
      and exists (
        select 1 from public.profiles p
        where p.id = (select auth.uid()) and p.role = 'master'
      )
    )
  );

drop policy if exists "Recipients can mark their own notes read" on public.secret_player_notes;
create policy "Recipients can mark their own notes read"
  on public.secret_player_notes
  for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

revoke all on public.secret_player_notes from anon, authenticated;
grant select on public.secret_player_notes to authenticated;
grant update (read_at) on public.secret_player_notes to authenticated;

create or replace function public.send_secret_player_note(
  p_recipient_email text,
  p_title text,
  p_content text,
  p_campaign_slug text default 'storm-kings-thunder'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender_id uuid := auth.uid();
  v_recipient_id uuid;
  v_email text := lower(trim(coalesce(p_recipient_email, '')));
  v_title text := trim(coalesce(p_title, ''));
  v_content text := trim(coalesce(p_content, ''));
  v_campaign_slug text := trim(coalesce(p_campaign_slug, ''));
  v_note_id uuid;
begin
  if v_sender_id is null then
    raise exception 'authentication_required';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = v_sender_id and p.role = 'master'
  ) then
    raise exception 'master_only';
  end if;

  if v_email = '' or v_title = '' or v_content = '' then
    raise exception 'required_fields_missing';
  end if;
  if char_length(v_title) > 160 or char_length(v_content) > 5000 then
    raise exception 'message_too_long';
  end if;
  if v_campaign_slug = '' or char_length(v_campaign_slug) > 100 then
    raise exception 'invalid_campaign';
  end if;

  select p.id into v_recipient_id
  from public.profiles p
  where lower(p.email) = v_email
  limit 1;

  if v_recipient_id is null then
    raise exception 'recipient_not_found';
  end if;

  if v_recipient_id = v_sender_id then
    raise exception 'cannot_send_to_self';
  end if;

  insert into public.secret_player_notes
    (campaign_slug, sender_id, recipient_id, recipient_email, title, content)
  values
    (v_campaign_slug, v_sender_id, v_recipient_id, v_email, v_title, v_content)
  returning id into v_note_id;

  return v_note_id;
end;
$$;

revoke all on function public.send_secret_player_note(text, text, text, text) from public, anon;
grant execute on function public.send_secret_player_note(text, text, text, text) to authenticated;
