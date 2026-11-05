import { useMemo, useState } from 'react';

import { findDistrictBoundary, findProvinceBoundary, type Coord } from '@/data/korea-boundaries';
import type { SavedDatePlace } from '@/db/date-cards';
import {
  getNextMapGroupMode,
  groupPlacesByRegion,
  mapGroupModeConfig,
  type MapGroupMode,
  type PlaceGroup,
} from '@/utils/place-group';

// Turns the visible places into what the map draws: individual markers, or one
// marker per region with its boundary.
export function useMapGrouping(places: SavedDatePlace[]) {
  const [mapGroupMode, setMapGroupMode] = useState<MapGroupMode>('none');
  const [selectedGroup, setSelectedGroup] = useState<PlaceGroup | null>(null);

  const placeGroups = useMemo(
    () => (mapGroupMode === 'none' ? [] : groupPlacesByRegion(places, mapGroupMode)),
    [places, mapGroupMode]
  );

  const mapMarkers = useMemo(() => {
    if (mapGroupMode === 'none') {
      return places;
    }

    return placeGroups.map((group) => ({
      id: group.key,
      placeName: group.label,
      latitude: group.latitude,
      longitude: group.longitude,
    }));
  }, [mapGroupMode, places, placeGroups]);

  const regionBoundaries = useMemo(() => {
    const boundaries: { key: string; rings: Coord[][] }[] = [];

    if (mapGroupMode === 'none') {
      return boundaries;
    }

    const findBoundary = mapGroupMode === 'city' ? findProvinceBoundary : findDistrictBoundary;

    for (const group of placeGroups) {
      const rings = findBoundary(group.regionName);

      if (rings) {
        boundaries.push({ key: group.key, rings });
      }
    }

    return boundaries;
  }, [mapGroupMode, placeGroups]);

  function cycleMapGroupMode() {
    setMapGroupMode(getNextMapGroupMode);
  }

  return {
    mapGroupMode,
    mapModeConfig: mapGroupModeConfig[mapGroupMode],
    placeGroups,
    mapMarkers,
    regionBoundaries,
    selectedGroup,
    setSelectedGroup,
    cycleMapGroupMode,
  };
}
