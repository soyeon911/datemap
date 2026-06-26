const localSearchClientId = getEnv('NAVER_SEARCH_CLIENT_ID', 'NAVER_LOCAL_CLIENT_ID', 'NAVER_CLIENT_ID');
const localSearchClientSecret = getEnv('NAVER_SEARCH_CLIENT_SECRET', 'NAVER_LOCAL_CLIENT_SECRET', 'NAVER_CLIENT_SECRET');
const naverMapClientId = getEnv('NAVER_MAP_CLIENT_ID', 'NAVER_CLOUD_MAP_CLIENT_ID', 'NAVER_NCP_CLIENT_ID');
const naverMapClientSecret = getEnv(
  'NAVER_MAP_CLIENT_SECRET',
  'NAVER_CLOUD_MAP_CLIENT_SECRET',
  'NAVER_NCP_CLIENT_SECRET'
);

export default async function handler(request, response) {
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

async function searchLocalPlaces(query) {
  const url = new URL('https://openapi.naver.com/v1/search/local.json');
  url.searchParams.set('query', query);
  url.searchParams.set('display', '5');
  url.searchParams.set('sort', 'random');

  const localResponse = await fetch(url.toString(), {
    headers: {
      'X-Naver-Client-Id': localSearchClientId,
      'X-Naver-Client-Secret': localSearchClientSecret,
    },
  });

  if (!localResponse.ok) {
    throw new Error(`Local search failed: ${localResponse.status}`);
  }

  const payload = await localResponse.json();
  const items = payload.items ?? [];
  const results = [];

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

async function geocodePlaces(query) {
  const addresses = await geocodeAddresses(query);
  const results = [];

  for (const [index, address] of addresses.entries()) {
    const result = normalizeGeocodeAddress(address, query, index);

    if (result) {
      results.push(result);
    }
  }

  return results.slice(0, 5);
}

async function geocodeFirstAddress(query) {
  const addresses = await geocodeAddresses(query);

  return normalizeGeocodeAddress(addresses[0], query, 0);
}

async function geocodeAddresses(query) {
  const url = new URL('https://maps.apigw.ntruss.com/map-geocode/v2/geocode');
  url.searchParams.set('query', query);

  const geocodeResponse = await fetch(url.toString(), {
    headers: {
      'X-NCP-APIGW-API-KEY-ID': naverMapClientId,
      'X-NCP-APIGW-API-KEY': naverMapClientSecret,
    },
  });

  if (!geocodeResponse.ok) {
    throw new Error(`Geocoding failed: ${geocodeResponse.status}`);
  }

  const payload = await geocodeResponse.json();

  return payload.addresses ?? [];
}

function normalizeGeocodeAddress(address, query, index) {
  if (!address?.x || !address.y) {
    return null;
  }

  const longitude = Number(address.x);
  const latitude = Number(address.y);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    id: `${query}_${index}_${latitude}_${longitude}`,
    name: query,
    address: address.roadAddress || address.jibunAddress || null,
    latitude,
    longitude,
    category: null,
  };
}

function getQueryValue(value) {
  if (Array.isArray(value)) {
    return String(value[0] ?? '').trim();
  }

  return String(value ?? '').trim();
}

function getEnv(...names) {
  for (const name of names) {
    const value = process.env[name];

    if (value) {
      return value;
    }
  }

  return undefined;
}

function stripHtml(value) {
  return value.replace(/<[^>]*>/g, '').trim();
}

function setCorsHeaders(response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
