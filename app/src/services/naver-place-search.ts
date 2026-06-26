export type NaverPlaceSearchResult = {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  category?: string | null;
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
  };
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, '').trim();
}
