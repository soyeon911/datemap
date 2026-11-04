import type { SavedDatePlace } from '@/db/date-cards';

// Records with no owner predate login, so they stay editable on this device.
export function canEditPlace(place: Pick<SavedDatePlace, 'ownerUserId'>, userId: string | undefined) {
  return place.ownerUserId === null || place.ownerUserId === userId;
}
