-- Run this once in the Supabase SQL Editor for a project that already has
-- schema.sql applied. Adds couple pairing: an invite-code based link between
-- two auth.users, after which both can see each other's date records
-- (read-only for the non-creator; edit/delete stays creator-only).

create table couples (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id),
  partner_user_id uuid references auth.users(id),
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

alter table couples enable row level security;

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

alter table date_entries add column couple_id uuid references couples(id);
alter table date_places add column couple_id uuid references couples(id);
alter table date_photos add column couple_id uuid references couples(id);

drop policy "owner rw" on date_entries;
drop policy "owner rw" on date_places;
drop policy "owner rw" on date_photos;

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

-- storage: read own or partner's photos, write only to own folder
drop policy "owner rw storage" on storage.objects;

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
