import { buildSearchText } from '@/utils/search-text';

describe('buildSearchText', () => {
  it('joins the searchable fields in lower case', () => {
    expect(
      buildSearchText({ placeName: 'Cafe', address: '성수동', oneLineDiary: 'Good', hashtags: ['Latte', '야경'] })
    ).toBe('cafe 성수동 good latte 야경');
  });

  it('skips empty fields', () => {
    expect(buildSearchText({ placeName: '카페', address: null, oneLineDiary: '', hashtags: [] })).toBe('카페');
  });
});
