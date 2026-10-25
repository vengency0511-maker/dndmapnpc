-- D&D Map NPC: isolated online test session
-- Run in Supabase SQL Editor in a NEW test project.
-- Then enable Authentication -> Providers -> Anonymous Sign-Ins.
create extension if not exists pgcrypto;

create table if not exists public.dnd_test_rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique,
  master_user_id uuid not null,
  master_name text not null default 'Мастер',
  state jsonb not null default '{"encounter_name":"Тестовое столкновение","round_number":1,"notes":""}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.dnd_test_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.dnd_test_rooms(id) on delete cascade,
  user_id uuid not null,
  display_name text not null,
  role text not null check (role in ('master','player')),
  created_at timestamptz not null default now(),
  unique(room_id,user_id)
);
create table if not exists public.dnd_test_tokens (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.dnd_test_rooms(id) on delete cascade,
  user_id uuid,
  character_name text not null,
  current_hp integer not null default 20 check (current_hp >= 0),
  max_hp integer not null default 20 check (max_hp > 0),
  armor_class integer not null default 10 check (armor_class between 0 and 40),
  x numeric not null default 50 check (x between 0 and 100),
  y numeric not null default 50 check (y between 0 and 100),
  created_at timestamptz not null default now()
);

alter table public.dnd_test_rooms enable row level security;
alter table public.dnd_test_members enable row level security;
alter table public.dnd_test_tokens enable row level security;

-- SECURITY DEFINER helper avoids recursive RLS when membership policies query the roster.
create or replace function public.dnd_test_is_member(p_room_id uuid)
returns boolean language sql stable security definer set search_path=public,auth as $
  select exists(select 1 from public.dnd_test_members m where m.room_id=p_room_id and m.user_id=auth.uid());
$;
revoke all on function public.dnd_test_is_member(uuid) from public;
grant execute on function public.dnd_test_is_member(uuid) to authenticated;

drop policy if exists "room members can read room" on public.dnd_test_rooms;
create policy "room members can read room" on public.dnd_test_rooms for select to authenticated
using (public.dnd_test_is_member(id));
drop policy if exists "only room master updates room" on public.dnd_test_rooms;
create policy "only room master updates room" on public.dnd_test_rooms for update to authenticated
using (master_user_id=auth.uid()) with check (master_user_id=auth.uid());

drop policy if exists "members can see their room roster" on public.dnd_test_members;
create policy "members can see their room roster" on public.dnd_test_members for select to authenticated
using (public.dnd_test_is_member(room_id));
drop policy if exists "members can see tokens" on public.dnd_test_tokens;
create policy "members can see tokens" on public.dnd_test_tokens for select to authenticated
using (public.dnd_test_is_member(room_id));

grant select on public.dnd_test_rooms, public.dnd_test_members, public.dnd_test_tokens to authenticated;
grant update(state) on public.dnd_test_rooms to authenticated;

create or replace function public.dnd_test_create_room(p_master_name text default 'Мастер')
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_uid uuid:=auth.uid(); v_room public.dnd_test_rooms%rowtype; v_code text;
begin
  if v_uid is null then raise exception 'Нужно войти в систему'; end if;
  loop
    v_code:=upper(substr(encode(gen_random_bytes(5),'hex'),1,6));
    exit when not exists(select 1 from public.dnd_test_rooms where room_code=v_code);
  end loop;
  insert into public.dnd_test_rooms(room_code,master_user_id,master_name,state)
  values(v_code,v_uid,left(coalesce(nullif(trim(p_master_name),''),'Мастер'),40),
  '{"encounter_name":"Тестовое столкновение","round_number":1,"notes":""}'::jsonb) returning * into v_room;
  insert into public.dnd_test_members(room_id,user_id,display_name,role)
  values(v_room.id,v_uid,v_room.master_name,'master');
  return jsonb_build_object('room_id',v_room.id,'room_code',v_room.room_code);
end; $$;

create or replace function public.dnd_test_join_room(p_room_code text,p_character_name text default 'Игрок',p_max_hp integer default 20,p_armor_class integer default 10)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_uid uuid:=auth.uid(); v_room public.dnd_test_rooms%rowtype; v_token public.dnd_test_tokens%rowtype; v_name text;
begin
  if v_uid is null then raise exception 'Нужно войти в систему'; end if;
  select * into v_room from public.dnd_test_rooms where room_code=upper(trim(p_room_code));
  if not found then raise exception 'Комната не найдена. Проверьте код.'; end if;
  if exists(select 1 from public.dnd_test_members where room_id=v_room.id and user_id=v_uid) then
    select * into v_token from public.dnd_test_tokens where room_id=v_room.id and user_id=v_uid limit 1;
    return jsonb_build_object('room_id',v_room.id,'token_id',v_token.id);
  end if;
  v_name:=left(coalesce(nullif(trim(p_character_name),''),'Игрок'),40);
  insert into public.dnd_test_members(room_id,user_id,display_name,role) values(v_room.id,v_uid,v_name,'player');
  insert into public.dnd_test_tokens(room_id,user_id,character_name,current_hp,max_hp,armor_class,x,y)
  values(v_room.id,v_uid,v_name,greatest(0,least(999,coalesce(p_max_hp,20))),greatest(1,least(999,coalesce(p_max_hp,20))),greatest(0,least(40,coalesce(p_armor_class,10))),20+random()*60,20+random()*60)
  returning * into v_token;
  return jsonb_build_object('room_id',v_room.id,'token_id',v_token.id);
end; $$;

create or replace function public.dnd_test_move_token(p_token_id uuid,p_x numeric,p_y numeric)
returns void language plpgsql security definer set search_path=public,auth as $$
declare v_token public.dnd_test_tokens%rowtype; v_master uuid;
begin
  if auth.uid() is null then raise exception 'Нужно войти в систему'; end if;
  select * into v_token from public.dnd_test_tokens where id=p_token_id;
  if not found then raise exception 'Фишка не найдена'; end if;
  select master_user_id into v_master from public.dnd_test_rooms where id=v_token.room_id;
  if auth.uid()<>v_master and auth.uid() is distinct from v_token.user_id then raise exception 'Можно двигать только свою фишку'; end if;
  if not exists(select 1 from public.dnd_test_members where room_id=v_token.room_id and user_id=auth.uid()) then raise exception 'Нет доступа к комнате'; end if;
  update public.dnd_test_tokens set x=greatest(0,least(100,p_x)),y=greatest(0,least(100,p_y)) where id=p_token_id;
end; $$;

create or replace function public.dnd_test_master_update_token(p_token_id uuid,p_current_hp integer,p_armor_class integer)
returns void language plpgsql security definer set search_path=public,auth as $$
declare v_token public.dnd_test_tokens%rowtype; v_master uuid;
begin
  if auth.uid() is null then raise exception 'Нужно войти в систему'; end if;
  select * into v_token from public.dnd_test_tokens where id=p_token_id;
  if not found then raise exception 'Фишка не найдена'; end if;
  select master_user_id into v_master from public.dnd_test_rooms where id=v_token.room_id;
  if auth.uid() is distinct from v_master then raise exception 'Изменять HP и КД может только мастер'; end if;
  update public.dnd_test_tokens set current_hp=greatest(0,least(max_hp,coalesce(p_current_hp,0))),armor_class=greatest(0,least(40,coalesce(p_armor_class,10))) where id=p_token_id;
end; $$;

revoke all on function public.dnd_test_create_room(text) from public;
revoke all on function public.dnd_test_join_room(text,text,integer,integer) from public;
revoke all on function public.dnd_test_move_token(uuid,numeric,numeric) from public;
revoke all on function public.dnd_test_master_update_token(uuid,integer,integer) from public;
grant execute on function public.dnd_test_create_room(text) to authenticated;
grant execute on function public.dnd_test_join_room(text,text,integer,integer) to authenticated;
grant execute on function public.dnd_test_move_token(uuid,numeric,numeric) to authenticated;
grant execute on function public.dnd_test_master_update_token(uuid,integer,integer) to authenticated;

-- Enable realtime for these tables. Duplicate entries are ignored.
do $$ begin
  alter publication supabase_realtime add table public.dnd_test_rooms;
exception when duplicate_object then null; when others then
  if sqlstate <> '42710' then raise; end if;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.dnd_test_tokens;
exception when duplicate_object then null; when others then
  if sqlstate <> '42710' then raise; end if;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.dnd_test_members;
exception when duplicate_object then null; when others then
  if sqlstate <> '42710' then raise; end if;
end $$;
