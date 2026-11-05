-- Run this once in the Supabase SQL Editor for a project that already has
-- migrations/0002_couple_sharing.sql applied, BEFORE shipping a build that
-- uploads with a version check. Existing rows and older app builds keep working:
-- the column has a default, and the trigger also counts their writes.
--
-- Every device keeps its own SQLite copy, so only the server can tell that a
-- device is saving over a change it has not seen yet. A device sends the version
-- it last read, and the update matches no row if another device got there first.

alter table date_places add column version integer not null default 1;

create function bump_date_place_version()
returns trigger
language plpgsql
as $$
begin
  new.version := old.version + 1;
  return new;
end;
$$;

-- Only fields a person edits count. couple_id is excluded so that linking a couple
-- does not look like an edit on every device, and cover_photo_path because every
-- edit re-uploads photos under new paths, which would flag a conflict each time.
create trigger date_places_bump_version
  before update on date_places
  for each row
  when (
    (old.date_entry_id, old.place_id, old.place_name, old.address, old.latitude, old.longitude, old.one_line_diary, old.hashtags)
    is distinct from
    (new.date_entry_id, new.place_id, new.place_name, new.address, new.latitude, new.longitude, new.one_line_diary, new.hashtags)
  )
  execute function bump_date_place_version();
