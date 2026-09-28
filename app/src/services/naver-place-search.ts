export type NaverPlaceSearchResult = {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  category?: string | null;
  phone?: string | null;
  description?: string | null;
};

type RawPlaceSearchResult = {
  id?: string | number | null;
  placeId?: string | number | null;
  title?: string | null;
  name?: string | null;
  placeName?: string | null;
  address?: string | null;
  roadAddress?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  category?: string | null;
  phone?: string | null;
  description?: string | null;
};

const placeSearchEndpoint =
  process.env.EXPO_PUBLIC_NAVER_PLACE_SEARCH_ENDPOINT ?? process.env.EXPO_PUBLIC_NAVER_LOCAL_PROXY_URL;

export async function searchNaverPlaces(query: string): Promise<NaverPlaceSearchResult[]> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  if (!placeSearchEndpoint) {
    throw new Error('PLACE_SEARCH_PROXY_REQUIRED');
  }

  const url = new URL(placeSearchEndpoint);
  url.searchParams.set('query', trimmedQuery);

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`PLACE_SEARCH_FAILED_${response.status}`);
  }

  const payload = (await response.json()) as { items?: RawPlaceSearchResult[]; results?: RawPlaceSearchResult[] };
  const rawResults = payload.results ?? payload.items ?? [];

  const results: NaverPlaceSearchResult[] = [];

  for (const rawResult of rawResults) {
    const result = normalizePlaceSearchResult(rawResult);

    if (result) {
      results.push(result);
    }
  }

  return results;
}

function normalizePlaceSearchResult(rawResult: RawPlaceSearchResult): NaverPlaceSearchResult | null {
  const latitude = Number(rawResult.latitude ?? rawResult.lat);
  const longitude = Number(rawResult.longitude ?? rawResult.lng);
  const name = stripHtml(rawResult.name ?? rawResult.placeName ?? rawResult.title ?? '');

  if (!name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    id: String(rawResult.id ?? rawResult.placeId ?? `${name}_${latitude}_${longitude}`),
    name,
    address: rawResult.roadAddress ?? rawResult.address ?? null,
    latitude,
    longitude,
    category: rawResult.category ?? null,
    phone: rawResult.phone ?? null,
    description: rawResult.description ?? null,
  };
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, '').trim();
}

const NAVER_PLACE_ID_PATTERN = /place\.naver\.com\/([a-z]+)\/(\d+)/;

// Not an official API - reads Naver's own mobile "place" search results page to find
// the matching business's Naver Place id, since the Local Search API doesn't expose
// one. Best-effort: returns null (caller should fall back) if the page layout changes
// or nothing matches.
export async function resolveNaverPlaceUrl(query: string): Promise<string | null> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return null;
  }

  try {
    const url = new URL('https://m.search.naver.com/search.naver');
    url.searchParams.set('where', 'm_place');
    url.searchParams.set('ie', 'utf8');
    url.searchParams.set('query', trimmedQuery);

    const response = await fetch(url.toString());

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const match = html.match(NAVER_PLACE_ID_PATTERN);

    return match ? `https://m.place.naver.com/${match[1]}/${match[2]}/home` : null;
  } catch {
    return null;
  }
}
