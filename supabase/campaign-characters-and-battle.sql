-- DnD Lore Portal: shared characters and tactical battle state.
-- Run once in Supabase Dashboard -> SQL Editor.
-- Supports the Storm King's Thunder campaign; extend campaign_slug as more campaigns are added.

create table if not exists public.campaign_members (
  campaign_slug text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (campaign_slug, user_id)
);

create table if not exists public.campaign_characters (
  id uuid primary key default gen_random_uuid(),
  campaign_slug text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  race text not null default '',
  character_class text not null default '',
  subclass text not null default '',
  armor_class text not null default '',
  max_hp integer,
  photo text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists campaign_characters_owner_idx
  on public.campaign_characters (campaign_slug, owner_id, created_at);
create index if not exists campaign_members_user_idx
  on public.campaign_members (user_id, campaign_slug);

create table if not exists public.campaign_battle_scenes (
  campaign_slug text primary key,
  scene jsonb not null default '{"gridSize":50,"combatants":[]}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.campaign_members enable row level security;
alter table public.campaign_characters enable row level security;
alter table public.campaign_battle_scenes enable row level security;

drop policy if exists "Members can read their own membership" on public.campaign_members;
create policy "Members can read their own membership"
on public.campaign_members for select to authenticated
using (user_id = (select auth.uid()) or exists (
  select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'master'
));

drop policy if exists "Users can join campaign" on public.campaign_members;
create policy "Users can join campaign"
on public.campaign_members for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "Owners and master can read campaign characters" on public.campaign_characters;
create policy "Owners and master can read campaign characters"
on public.campaign_characters for select to authenticated
using (
  owner_id = (select auth.uid())
  or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'master')
);

drop policy if exists "Players can create own campaign characters" on public.campaign_characters;
create policy "Players can create own campaign characters"
on public.campaign_characters for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and exists (select 1 from public.campaign_members m
    where m.campaign_slug = campaign_characters.campaign_slug and m.user_id = (select auth.uid()))
);

drop policy if exists "Owners and master can update campaign characters" on public.campaign_characters;
create policy "Owners and master can update campaign characters"
on public.campaign_characters for update to authenticated
using (
  owner_id = (select auth.uid())
  or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'master')
)
with check (
  owner_id = (select auth.uid())
  or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'master')
);

drop policy if exists "Owners and master can delete campaign characters" on public.campaign_characters;
create policy "Owners and master can delete campaign characters"
on public.campaign_characters for delete to authenticated
using (
  owner_id = (select auth.uid())
  or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'master')
);

drop policy if exists "Campaign members can read battle scene" on public.campaign_battle_scenes;
create policy "Campaign members can read battle scene"
on public.campaign_battle_scenes for select to authenticated
using (
  exists (select 1 from public.campaign_members m
    where m.campaign_slug = campaign_battle_scenes.campaign_slug and m.user_id = (select auth.uid()))
  or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'master')
);

drop policy if exists "Master can write battle scene" on public.campaign_battle_scenes;
create policy "Master can write battle scene"
on public.campaign_battle_scenes for all to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'master'))
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'master'));

create or replace function public.join_campaign(p_campaign_slug text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if trim(coalesce(p_campaign_slug,'')) = '' or char_length(p_campaign_slug) > 100 then
    raise exception 'invalid_campaign';
  end if;
  insert into public.campaign_members(campaign_slug,user_id)
  values (trim(p_campaign_slug), auth.uid())
  on conflict do nothing;
end;
$$;
revoke all on function public.join_campaign(text) from public, anon;
grant execute on function public.join_campaign(text) to authenticated;

-- Player token movement goes through this function, which changes only the token
-- whose linked character belongs to the current user. A player cannot move enemies
-- or another player's token by editing the scene JSON directly.
create or replace function public.move_owned_battle_token(
  p_campaign_slug text,
  p_combatant_id text,
  p_x numeric,
  p_y numeric
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_scene jsonb;
  v_combatants jsonb;
  v_item jsonb;
  v_found boolean := false;
  v_character_id text;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if p_x < 0 or p_x > 100 or p_y < 0 or p_y > 100 then raise exception 'invalid_coordinates'; end if;
  if not exists (
    select 1 from public.campaign_members m
    where m.campaign_slug = p_campaign_slug and m.user_id = auth.uid()
  ) then raise exception 'not_campaign_member'; end if;

  select scene into v_scene from public.campaign_battle_scenes where campaign_slug = p_campaign_slug for update;
  if v_scene is null then raise exception 'battle_scene_not_found'; end if;
  v_combatants := coalesce(v_scene->'combatants','[]'::jsonb);

  select c->>'characterId' into v_character_id
  from jsonb_array_elements(v_combatants) c
  where c->>'id' = p_combatant_id;

  if v_character_id is null or not exists (
    select 1 from public.campaign_characters ch
    where ch.id::text = v_character_id and ch.owner_id = auth.uid() and ch.campaign_slug = p_campaign_slug
  ) then raise exception 'token_not_owned'; end if;

  select jsonb_agg(
    case when c->>'id' = p_combatant_id
      then jsonb_set(jsonb_set(c, '{x}', to_jsonb(p_x)), '{y}', to_jsonb(p_y))
      else c end
    order by ord
  ) into v_combatants
  from jsonb_array_elements(v_combatants) with ordinality as t(c,ord);

  v_scene := jsonb_set(v_scene, '{combatants}', coalesce(v_combatants,'[]'::jsonb));
  update public.campaign_battle_scenes
  set scene = v_scene, updated_by = auth.uid(), updated_at = now()
  where campaign_slug = p_campaign_slug;
  return v_scene;
end;
$$;
revoke all on function public.move_owned_battle_token(text,text,numeric,numeric) from public, anon;
grant execute on function public.move_owned_battle_token(text,text,numeric,numeric) to authenticated;

-- Enable Realtime delivery for battle scene changes.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'campaign_battle_scenes'
  ) then
    alter publication supabase_realtime add table public.campaign_battle_scenes;
  end if;
exception when undefined_object then
  raise notice 'Publication supabase_realtime is not available; enable Realtime for campaign_battle_scenes in Supabase Dashboard.';
end $$;
