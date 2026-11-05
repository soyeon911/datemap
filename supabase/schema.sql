-- Run this once in the Supabase SQL Editor for a new project.
-- Mirrors the local SQLite schema (app/src/db/migrations.ts) with a
-- (user_id, id) composite key, since ids are client-generated strings
-- (e.g. `entry_20260626`, `place_1735...`) that are only unique per user.
--
-- For a project that already ran an earlier version of this file, apply the
-- files in migrations/ it is missing instead of re-running this one.

create table couples (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id),
  partner_user_id uuid references auth.users(id),
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

create table date_entries (
  id text not null,
  user_id uuid not null default auth.uid() references auth.users(id),
  couple_id uuid references couples(id),
  date date not null,
  year int not null,
  month int not null,
  week_of_year int not null,
  year_month text not null,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table date_places (
  id text not null,
  user_id uuid not null default auth.uid() references auth.users(id),
  couple_id uuid references couples(id),
  date_entry_id text not null,
  place_id text,
  place_name text not null,
  address text,
  latitude double precision not null,
  longitude double precision not null,
  one_line_diary text,
  hashtags jsonb not null default '[]',
  cover_photo_path text,
  normalized_search_text text,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, date_entry_id) references date_entries(user_id, id) on delete cascade
);

create table date_photos (
  id text not null,
  user_id uuid not null default auth.uid() references auth.users(id),
  couple_id uuid references couples(id),
  date_place_id text not null,
  storage_path text not null,
  sort_order int not null,
  created_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, date_place_id) references date_places(user_id, id) on delete cascade
);

alter table couples enable row level security;
alter table date_entries enable row level security;
alter table date_places enable row level security;
alter table date_photos enable row level security;

create policy "members can view" on couples for select
  using (auth.uid() = owner_user_id or auth.uid() = partner_user_id);
create policy "owner can create" on couples for insert
  with check (auth.uid() = owner_user_id and partner_user_id is null);
create policy "members can delete" on couples for delete
  using (auth.uid() = owner_user_id or auth.uid() = partner_user_id);

-- Joining by code updates a row the joiner doesn't own, so it goes through a
-- narrow SECURITY DEFINER function instead of an open UPDATE policy.
create or replace function join_couple(code text)
returns couples
language plpgsql
security definer
set search_path = public
as $$
declare
  result couples;
begin
  update couples
  set partner_user_id = auth.uid()
  where invite_code = code
    and partner_user_id is null
    and owner_user_id <> auth.uid()
  returning * into result;

  if result.id is null then
    raise exception 'INVALID_OR_USED_CODE';
  end if;

  return result;
end;
$$;

grant execute on function join_couple(text) to authenticated;

-- Lets a device detect that another device saved first. See
-- migrations/0003_date_place_versions.sql for why these columns.
create function bump_date_place_version()
returns trigger
language plpgsql
as $$
begin
  new.version := old.version + 1;
  return new;
end;
$$;

create trigger date_places_bump_version
  before update on date_places
  for each row
  when (
    (old.date_entry_id, old.place_id, old.place_name, old.address, old.latitude, old.longitude, old.one_line_diary, old.hashtags)
    is distinct from
    (new.date_entry_id, new.place_id, new.place_name, new.address, new.latitude, new.longitude, new.one_line_diary, new.hashtags)
  )
  execute function bump_date_place_version();

create policy "select own or couple" on date_entries for select using (
  auth.uid() = user_id or couple_id in (
    select id from couples where owner_user_id = auth.uid() or partner_user_id = auth.uid()
  )
);
create policy "write own" on date_entries for insert with check (auth.uid() = user_id);
create policy "update own" on date_entries for update using (auth.uid() = user_id);
create policy "delete own" on date_entries for delete using (auth.uid() = user_id);

create policy "select own or couple" on date_places for select using (
  auth.uid() = user_id or couple_id in (
    select id from couples where owner_user_id = auth.uid() or partner_user_id = auth.uid()
  )
);
create policy "write own" on date_places for insert with check (auth.uid() = user_id);
create policy "update own" on date_places for update using (auth.uid() = user_id);
create policy "delete own" on date_places for delete using (auth.uid() = user_id);

create policy "select own or couple" on date_photos for select using (
  auth.uid() = user_id or couple_id in (
    select id from couples where owner_user_id = auth.uid() or partner_user_id = auth.uid()
  )
);
create policy "write own" on date_photos for insert with check (auth.uid() = user_id);
create policy "update own" on date_photos for update using (auth.uid() = user_id);
create policy "delete own" on date_photos for delete using (auth.uid() = user_id);

insert into storage.buckets (id, name, public) values ('date-photos', 'date-photos', false)
  on conflict (id) do nothing;

-- storage: read own or partner's photos, write only to own folder
create policy "select own or partner storage" on storage.objects for select using (
  bucket_id = 'date-photos' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1 from couples
      where (owner_user_id = auth.uid() and partner_user_id::text = (storage.foldername(name))[1])
         or (partner_user_id = auth.uid() and owner_user_id::text = (storage.foldername(name))[1])
    )
  )
);
create policy "write own storage" on storage.objects for insert with check (
  bucket_id = 'date-photos' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "update own storage" on storage.objects for update using (
  bucket_id = 'date-photos' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "delete own storage" on storage.objects for delete using (
  bucket_id = 'date-photos' and (storage.foldername(name))[1] = auth.uid()::text
);
