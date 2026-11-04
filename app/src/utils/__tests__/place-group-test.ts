import type { SavedDatePlace } from '@/db/date-cards';
import {
  getNextMapGroupMode,
  groupPlacesByRegion,
  mapGroupModeConfig,
  parseRegionFromAddress,
} from '@/utils/place-group';

function makePlace(id: string, address: string | null, latitude: number, longitude: number): SavedDatePlace {
  return {
    id,
    placeName: id,
    address,
    latitude,
    longitude,
    date: '2026-11-04',
    oneLineDiary: null,
    hashtags: [],
    coverPhotoUri: null,
    photoUris: [],
    photoCount: 0,
    yearMonth: '2026-11',
    ownerUserId: null,
  };
}

describe('parseRegionFromAddress', () => {
  it('takes the first two address words as city and district', () => {
    expect(parseRegionFromAddress('서울특별시 강남구 테헤란로 1')).toEqual({ city: '서울특별시', district: '강남구' });
  });

  it('ignores extra whitespace', () => {
    expect(parseRegionFromAddress('  부산광역시   중구  ')).toEqual({ city: '부산광역시', district: '중구' });
  });

  it.each([[null], [''], ['서울특별시']])('returns null for %p', (address) => {
    expect(parseRegionFromAddress(address)).toBeNull();
  });
});

describe('groupPlacesByRegion', () => {
  it('groups by city and averages coordinates', () => {
    const groups = groupPlacesByRegion(
      [makePlace('a', '서울특별시 강남구 1', 37, 127), makePlace('b', '서울특별시 마포구 2', 38, 126)],
      'city'
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      key: '서울특별시',
      regionName: '서울특별시',
      label: '서울특별시 (2)',
      latitude: 37.5,
      longitude: 126.5,
    });
  });

  it('keeps same-named districts in different cities apart', () => {
    const groups = groupPlacesByRegion(
      [makePlace('a', '서울특별시 중구 1', 37, 127), makePlace('b', '부산광역시 중구 2', 35, 129)],
      'district'
    );

    expect(groups.map((group) => group.key)).toEqual(['서울특별시 중구', '부산광역시 중구']);
    expect(groups.map((group) => group.regionName)).toEqual(['중구', '중구']);
  });

  it('skips places whose address has no region', () => {
    expect(groupPlacesByRegion([makePlace('a', null, 37, 127)], 'city')).toEqual([]);
  });
});

describe('getNextMapGroupMode', () => {
  it('cycles none, city, district, then back to none', () => {
    expect(getNextMapGroupMode('none')).toBe('city');
    expect(getNextMapGroupMode('city')).toBe('district');
    expect(getNextMapGroupMode('district')).toBe('none');
  });
});

describe('mapGroupModeConfig', () => {
  it('zooms out further for wider regions', () => {
    const { none, city, district } = mapGroupModeConfig;

    expect(city.minRegionDelta).toBeGreaterThan(district.minRegionDelta);
    expect(district.minRegionDelta).toBeGreaterThan(none.minRegionDelta);
  });

  it('uses a bigger marker for wider regions', () => {
    const { none, city, district } = mapGroupModeConfig;

    expect(city.markerSize).toBeGreaterThan(district.markerSize);
    expect(district.markerSize).toBeGreaterThan(none.markerSize);
  });
});
