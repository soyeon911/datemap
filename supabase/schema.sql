-- Run this once in the Supabase SQL Editor for a new project.
-- Mirrors the local SQLite schema (app/src/db/migrations.ts) with a
-- (user_id, id) composite key, since ids are client-generated strings
-- (e.g. `entry_20260626`, `place_1735...`) that are only unique per user.

create table date_entries (
  id text not null,
  user_id uuid not null default auth.uid() references auth.users(id),
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, date_entry_id) references date_entries(user_id, id) on delete cascade
);

create table date_photos (
  id text not null,
  user_id uuid not null default auth.uid() references auth.users(id),
  date_place_id text not null,
  storage_path text not null,
  sort_order int not null,
  created_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, date_place_id) references date_places(user_id, id) on delete cascade
);

alter table date_entries enable row level security;
alter table date_places enable row level security;
alter table date_photos enable row level security;

create policy "owner rw" on date_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner rw" on date_places for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner rw" on date_photos for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public) values ('date-photos', 'date-photos', false)
  on conflict (id) do nothing;

create policy "owner rw storage" on storage.objects for all
  using (bucket_id = 'date-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'date-photos' and (storage.foldername(name))[1] = auth.uid()::text);
