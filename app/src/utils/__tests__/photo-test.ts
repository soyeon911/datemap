import type { SavedDatePlace } from '@/db/date-cards';
import { getOrderedPhotoUris, getPhotoExtension, stepPhotoIndex } from '@/utils/photo';

function makePlace(coverPhotoUri: string | null, photoUris: string[]) {
  return { coverPhotoUri, photoUris } as SavedDatePlace;
}

describe('getOrderedPhotoUris', () => {
  it('moves the cover photo to the front without duplicating it', () => {
    expect(getOrderedPhotoUris(makePlace('b', ['a', 'b', 'c']))).toEqual(['b', 'a', 'c']);
  });

  it('keeps the original order when there is no cover photo', () => {
    expect(getOrderedPhotoUris(makePlace(null, ['a', 'b']))).toEqual(['a', 'b']);
  });

  it('falls back to the cover photo when the photo list is empty', () => {
    expect(getOrderedPhotoUris(makePlace('cover', []))).toEqual(['cover']);
  });

  it('returns nothing when there are no photos at all', () => {
    expect(getOrderedPhotoUris(makePlace(null, []))).toEqual([]);
  });
});

describe('getPhotoExtension', () => {
  it.each([
    ['file:///a/photo.png', '.png'],
    ['file:///a/photo.JPEG', '.JPEG'],
    ['file:///a/photo.heic?size=large', '.heic'],
  ])('keeps the extension of %s', (uri, expected) => {
    expect(getPhotoExtension(uri)).toBe(expected);
  });

  it('defaults to .jpg for unknown extensions', () => {
    expect(getPhotoExtension('file:///a/photo.gif')).toBe('.jpg');
  });
});

describe('stepPhotoIndex', () => {
  it('moves forward', () => {
    expect(stepPhotoIndex(0, 1, 3)).toBe(1);
  });

  it('wraps from the last photo to the first', () => {
    expect(stepPhotoIndex(2, 1, 3)).toBe(0);
  });

  it('wraps from the first photo to the last', () => {
    expect(stepPhotoIndex(0, -1, 3)).toBe(2);
  });
});
