function setCorsHeaders(response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function getQueryValue(value) {
  if (Array.isArray(value)) {
    return String(value[0] ?? '').trim();
  }

  return String(value ?? '').trim();
}

function stripHtml(value = '') {
  return String(value).replace(/<[^>]*>/g, '').trim();
}

function normalizeGeocodeAddress(address, fallbackName, index) {
  if (!address?.x || !address?.y) {
    return null;
  }

  const longitude = Number(address.x);
  const latitude = Number(address.y);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    id: `${fallbackName}_${index}_${latitude}_${longitude}`,
    name: fallbackName,
    address: address.roadAddress || address.jibunAddress || null,
    latitude,
    longitude,
    category: null,
  };
}

async function geocodeAddresses(query, mapClientId, mapClientSecret) {
  const url = new URL('https://maps.apigw.ntruss.com/map-geocode/v2/geocode');
  url.searchParams.set('query', query);

  const geocodeResponse = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-NCP-APIGW-API-KEY-ID': mapClientId,
      'X-NCP-APIGW-API-KEY': mapClientSecret,
    },
  });

  const rawText = await geocodeResponse.text();

  let payload = {};
  try {
    payload = rawText ? JSON.parse(rawText) : {};
  } catch {
    throw new Error(`Geocoding response was not JSON: ${rawText.slice(0, 300)}`);
  }

  if (!geocodeResponse.ok) {
    throw new Error(`Geocoding failed: ${geocodeResponse.status} ${JSON.stringify(payload)}`);
  }

  return payload.addresses ?? [];
}

async function geocodeFirstAddress(query, mapClientId, mapClientSecret) {
  const addresses = await geocodeAddresses(query, mapClientId, mapClientSecret);
  return normalizeGeocodeAddress(addresses[0], query, 0);
}

async function searchLocalPlaces(query, credentials) {
  const url = new URL('https://openapi.naver.com/v1/search/local.json');
  url.searchParams.set('query', query);
  url.searchParams.set('display', '5');
  url.searchParams.set('sort', 'random');

  const localResponse = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-Naver-Client-Id': credentials.localSearchClientId,
      'X-Naver-Client-Secret': credentials.localSearchClientSecret,
    },
  });

  const rawText = await localResponse.text();

  let payload = {};
  try {
    payload = rawText ? JSON.parse(rawText) : {};
  } catch {
    throw new Error(`Local search response was not JSON: ${rawText.slice(0, 300)}`);
  }

  if (!localResponse.ok) {
    throw new Error(`Local search failed: ${localResponse.status} ${JSON.stringify(payload)}`);
  }

  const items = payload.items ?? [];
  const results = [];

  for (const [index, item] of items.entries()) {
    const name = stripHtml(item.title ?? query);
    const address = item.roadAddress || item.address;

    if (!address) {
      continue;
    }

    try {
      const geocoded = await geocodeFirstAddress(
        address,
        credentials.naverMapClientId,
        credentials.naverMapClientSecret
      );

      if (!geocoded) {
        continue;
      }

      results.push({
        id: `${name}_${index}_${geocoded.latitude}_${geocoded.longitude}`,
        name,
        address: geocoded.address || address,
        latitude: geocoded.latitude,
        longitude: geocoded.longitude,
        category: item.category ? stripHtml(item.category) : null,
        phone: item.telephone || null,
        description: item.description ? stripHtml(item.description) : null,
        link: item.link || null,
      });
    } catch (error) {
      console.error('[naver-place-search] geocode item failed:', {
        name,
        address,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}

async function geocodePlaces(query, credentials) {
  const addresses = await geocodeAddresses(
    query,
    credentials.naverMapClientId,
    credentials.naverMapClientSecret
  );

  return addresses
    .map((address, index) => normalizeGeocodeAddress(address, query, index))
    .filter(Boolean)
    .slice(0, 5);
}

module.exports = async function handler(request, response) {
  try {
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

    const credentials = {
      localSearchClientId: process.env.NAVER_SEARCH_CLIENT_ID,
      localSearchClientSecret: process.env.NAVER_SEARCH_CLIENT_SECRET,
      naverMapClientId: process.env.NAVER_MAP_CLIENT_ID,
      naverMapClientSecret: process.env.NAVER_MAP_CLIENT_SECRET,
    };

    if (!credentials.naverMapClientId || !credentials.naverMapClientSecret) {
      response.status(500).json({
        error: 'NAVER_MAP_CREDENTIALS_REQUIRED',
        hasNaverMapClientId: Boolean(credentials.naverMapClientId),
        hasNaverMapClientSecret: Boolean(credentials.naverMapClientSecret),
        vercelEnv: process.env.VERCEL_ENV || null,
      });
      return;
    }

    const hasLocalSearchCredentials =
      Boolean(credentials.localSearchClientId) &&
      Boolean(credentials.localSearchClientSecret);

    const results = hasLocalSearchCredentials
      ? await searchLocalPlaces(query, credentials)
      : await geocodePlaces(query, credentials);

    response.status(200).json({ results });
  } catch (error) {
    console.error('[naver-place-search] failed:', error);

    response.status(500).json({
      error: 'NAVER_PLACE_SEARCH_FAILED',
      message: error instanceof Error ? error.message : String(error),
      vercelEnv: process.env.VERCEL_ENV || null,
    });
  }
};
