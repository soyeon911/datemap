type LocalSearchItem = {
  title?: string;
  category?: string;
  address?: string;
  roadAddress?: string;
};

declare const process: {
  env: Record<string, string | undefined>;
};

type GeocodeAddress = {
  roadAddress?: string;
  jibunAddress?: string;
  x?: string;
  y?: string;
};

type PlaceResult = {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  category: string | null;
};

const localSearchClientId = process.env.NAVER_SEARCH_CLIENT_ID;
const localSearchClientSecret = process.env.NAVER_SEARCH_CLIENT_SECRET;
const naverMapClientId = process.env.NAVER_MAP_CLIENT_ID;
const naverMapClientSecret = process.env.NAVER_MAP_CLIENT_SECRET;

export default async function handler(request: any, response: any) {
  setCorsHeaders(response);

  if (request.method === 'OPTIONS') {
    response.status(204).end();
    return;
  }

  if (request.method !== 'GET') {
    response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  const query = getQueryValue(request.query?.query);

  if (!query) {
    response.status(400).json({ error: 'QUERY_REQUIRED' });
    return;
  }

  if (!naverMapClientId || !naverMapClientSecret) {
    response.status(500).json({ error: 'NAVER_MAP_CREDENTIALS_REQUIRED' });
    return;
  }

  try {
    const results =
      localSearchClientId && localSearchClientSecret
        ? await searchLocalPlaces(query)
        : await geocodePlaces(query);

    response.status(200).json({ results });
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: 'NAVER_PLACE_SEARCH_FAILED' });
  }
}

async function searchLocalPlaces(query: string) {
  const url = new URL('https://openapi.naver.com/v1/search/local.json');
  url.searchParams.set('query', query);
  url.searchParams.set('display', '5');
  url.searchParams.set('sort', 'random');

  const localResponse = await fetch(url.toString(), {
    headers: {
      'X-Naver-Client-Id': localSearchClientId!,
      'X-Naver-Client-Secret': localSearchClientSecret!,
    },
  });

  if (!localResponse.ok) {
    throw new Error(`Local search failed: ${localResponse.status}`);
  }

  const payload = (await localResponse.json()) as { items?: LocalSearchItem[] };
  const items = payload.items ?? [];
  const results: PlaceResult[] = [];

  for (const [index, item] of items.entries()) {
    const address = item.roadAddress || item.address;

    if (!address) {
      continue;
    }

    const geocoded = await geocodeFirstAddress(address);

    if (!geocoded) {
      continue;
    }

    results.push({
      id: `${stripHtml(item.title ?? query)}_${index}_${geocoded.latitude}_${geocoded.longitude}`,
      name: stripHtml(item.title ?? query),
      address: geocoded.address,
      latitude: geocoded.latitude,
      longitude: geocoded.longitude,
      category: item.category ? stripHtml(item.category) : null,
    });
  }

  return results;
}

async function geocodePlaces(query: string) {
  const addresses = await geocodeAddresses(query);
  const results: PlaceResult[] = [];

  for (const [index, address] of addresses.entries()) {
    const result = normalizeGeocodeAddress(address, query, index);

    if (result) {
      results.push(result);
    }
  }

  return results.slice(0, 5);
}

async function geocodeFirstAddress(query: string) {
  const addresses = await geocodeAddresses(query);
  const normalized = normalizeGeocodeAddress(addresses[0], query, 0);

  return normalized;
}

async function geocodeAddresses(query: string) {
  const url = new URL('https://maps.apigw.ntruss.com/map-geocode/v2/geocode');
  url.searchParams.set('query', query);

  const geocodeResponse = await fetch(url.toString(), {
    headers: {
      'X-NCP-APIGW-API-KEY-ID': naverMapClientId!,
      'X-NCP-APIGW-API-KEY': naverMapClientSecret!,
    },
  });

  if (!geocodeResponse.ok) {
    throw new Error(`Geocoding failed: ${geocodeResponse.status}`);
  }

  const payload = (await geocodeResponse.json()) as { addresses?: GeocodeAddress[] };

  return payload.addresses ?? [];
}

function normalizeGeocodeAddress(address: GeocodeAddress | undefined, query: string, index: number) {
  if (!address?.x || !address.y) {
    return null;
  }

  const longitude = Number(address.x);
  const latitude = Number(address.y);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const normalizedAddress = address.roadAddress || address.jibunAddress || null;

  return {
    id: `${query}_${index}_${latitude}_${longitude}`,
    name: query,
    address: normalizedAddress,
    latitude,
    longitude,
    category: null,
  };
}

function getQueryValue(value: unknown) {
  if (Array.isArray(value)) {
    return String(value[0] ?? '').trim();
  }

  return String(value ?? '').trim();
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, '').trim();
}

function setCorsHeaders(response: any) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
