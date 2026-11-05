import { parseHashtagInput, uniqueHashtags } from '@/utils/hashtag';

describe('parseHashtagInput', () => {
  it('splits on spaces and commas and removes the leading #', () => {
    expect(parseHashtagInput('#카페, #성수  비오는날')).toEqual(['카페', '성수', '비오는날']);
  });

  it('removes repeated tags and keeps the first position', () => {
    expect(parseHashtagInput('#야경 #카페 #야경')).toEqual(['야경', '카페']);
  });

  it('treats a tag with and without # as the same tag', () => {
    expect(parseHashtagInput('#야경 야경')).toEqual(['야경']);
  });

  it('keeps tags that differ only by case', () => {
    expect(parseHashtagInput('#Cafe #cafe')).toEqual(['Cafe', 'cafe']);
  });

  it('returns nothing for blank input', () => {
    expect(parseHashtagInput('  ,  ')).toEqual([]);
  });
});

describe('uniqueHashtags', () => {
  it('removes duplicates saved by earlier versions in their original order', () => {
    expect(uniqueHashtags(['야경', '카페', '야경'])).toEqual(['야경', '카페']);
  });
});
