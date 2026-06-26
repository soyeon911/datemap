const NAVER_LOCAL_SEARCH_URL = 'https://openapi.naver.com/v1/search/local.json'\;

function stripHtmlTags(value = '') {
  return value.replace(/<[^>]*>/g, '');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const query = String(req.query.query ?? '').trim();
  const display = String(req.query.display ?? '5');

  if (!query) {
    return res.status(400).json({ message: 'query is required' });
  }

  const clientId = process.env.NAVER_SEARCH_CLIENT_ID;
  const clientSecret = process.env.NAVER_SEARCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({
      message: 'Naver API credentials are missing',
    });
  }

  const url = new URL(NAVER_LOCAL_SEARCH_URL);
  url.searchParams.set('query', query);
  url.searchParams.set('display', display);
  url.searchParams.set('sort', 'random');

  const naverResponse = await fetch(url.toString(), {
    headers: {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
    },
  });

  const data = await naverResponse.json();

  if (!naverResponse.ok) {
    return res.status(naverResponse.status).json({
      message: 'Naver local search failed',
      detail: data,
    });
  }

  const places = (data.items ?? []).map((item) => ({
    title: stripHtmlTags(item.title),
    category: item.category,
    address: item.address,
    roadAddress: item.roadAddress,
    mapx: item.mapx,
    mapy: item.mapy,
    link: item.link,
    telephone: item.telephone,
  }));

  return res.status(200).json({ places });
}
