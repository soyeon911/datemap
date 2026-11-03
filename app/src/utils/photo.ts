import type { SavedDatePlace } from '@/db/date-cards';

export function getOrderedPhotoUris(place: SavedDatePlace) {
  const photoUris = place.photoUris.length > 0 ? place.photoUris : place.coverPhotoUri ? [place.coverPhotoUri] : [];

  if (!place.coverPhotoUri) {
    return photoUris;
  }

  return [place.coverPhotoUri, ...photoUris.filter((uri) => uri !== place.coverPhotoUri)];
}

export function getPhotoExtension(uri: string) {
  const cleanUri = uri.split('?')[0];
  const match = cleanUri.match(/\.(jpe?g|png|heic|webp)$/i);

  return match?.[0] ?? '.jpg';
}
