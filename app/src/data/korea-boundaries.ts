// Simplified 시/도 and 시/군/구 boundary polygons for South Korea, converted from
// KOSTAT administrative division geodata (via southkorea/southkorea-maps,
// https://github.com/southkorea/southkorea-maps). Source data is Korean public
// statistical geodata; kept here as compact [lat, lng] tuples to minimize bundle
// size and expanded to {latitude, longitude} only when a boundary is looked up.

const provinces = require('./korea-provinces.json') as BoundaryEntry[];
const municipalities = require('./korea-municipalities.json') as BoundaryEntry[];

export type Coord = {
  latitude: number;
  longitude: number;
};

type BoundaryEntry = {
  name: string;
  rings: [number, number][][];
};

function toRings(entry: BoundaryEntry | undefined): Coord[][] | null {
  if (!entry) {
    return null;
  }

  return entry.rings.map((ring) => ring.map(([latitude, longitude]) => ({ latitude, longitude })));
}

export function findProvinceBoundary(name: string): Coord[][] | null {
  return toRings(provinces.find((entry) => entry.name === name));
}

export function findDistrictBoundary(name: string): Coord[][] | null {
  return toRings(municipalities.find((entry) => entry.name === name));
}
