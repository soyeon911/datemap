import type { SavedDatePlace } from '@/db/date-cards';

export type PlaceGroup = {
  key: string;
  regionName: string;
  label: string;
  latitude: number;
  longitude: number;
  places: SavedDatePlace[];
};

export type MapGroupMode = 'none' | 'city' | 'district';

export const mapGroupModeConfig: Record<
  MapGroupMode,
  { minRegionDelta: number; markerSize: number; toggleLabel: string }
> = {
  none: { minRegionDelta: 0.03, markerSize: 34, toggleLabel: '전체보기' },
  city: { minRegionDelta: 0.25, markerSize: 46, toggleLabel: '시/도별' },
  district: { minRegionDelta: 0.05, markerSize: 36, toggleLabel: '시/군/구별' },
};

export function getNextMapGroupMode(mode: MapGroupMode): MapGroupMode {
  return mode === 'none' ? 'city' : mode === 'city' ? 'district' : 'none';
}

export function parseRegionFromAddress(address: string | null): { city: string; district: string } | null {
  if (!address) {
    return null;
  }

  const parts = address.trim().split(/\s+/);

  if (parts.length < 2) {
    return null;
  }

  return { city: parts[0], district: parts[1] };
}

export function groupPlacesByRegion(places: SavedDatePlace[], level: 'city' | 'district'): PlaceGroup[] {
  const groups = new Map<string, { regionName: string; latSum: number; lngSum: number; places: SavedDatePlace[] }>();

  for (const place of places) {
    const region = parseRegionFromAddress(place.address);

    if (!region) {
      continue;
    }

    const regionName = level === 'city' ? region.city : region.district;
    const key = level === 'city' ? region.city : `${region.city} ${region.district}`;
    const existing = groups.get(key);

    if (existing) {
      existing.latSum += place.latitude;
      existing.lngSum += place.longitude;
      existing.places.push(place);
    } else {
      groups.set(key, { regionName, latSum: place.latitude, lngSum: place.longitude, places: [place] });
    }
  }

  return Array.from(groups.entries()).map(([key, value]) => ({
    key,
    regionName: value.regionName,
    label: `${key} (${value.places.length})`,
    latitude: value.latSum / value.places.length,
    longitude: value.lngSum / value.places.length,
    places: value.places,
  }));
}
