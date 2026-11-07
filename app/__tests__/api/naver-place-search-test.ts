import handler from '../../api/naver-place-search';

type MockResponse = {
  statusCode: number | null;
  body: unknown;
  setHeader: jest.Mock;
  status: (code: number) => MockResponse;
  json: (body: unknown) => MockResponse;
  end: () => MockResponse;
};

function createResponse(): MockResponse {
  const response: MockResponse = {
    statusCode: null,
    body: undefined,
    setHeader: jest.fn(),
    status(code) {
      response.statusCode = code;
      return response;
    },
    json(body) {
      response.body = body;
      return response;
    },
    end() {
      return response;
    },
  };

  return response;
}

function createRequest(authorization?: string, method = 'GET') {
  return { method, query: { query: '서울시청' }, headers: { authorization } };
}

function jsonResponse(status: number, payload: unknown) {
  return { ok: status < 400, status, text: async () => JSON.stringify(payload) };
}

describe('naver-place-search proxy', () => {
  const mockFetch = jest.fn();
  const originalEnv = process.env;

  beforeEach(() => {
    mockFetch.mockReset();
    globalThis.fetch = mockFetch;
    jest.spyOn(console, 'error').mockImplementation(() => {});
    process.env = {
      ...originalEnv,
      SUPABASE_URL: 'https://project.test',
      SUPABASE_ANON_KEY: 'anon-key',
      NAVER_MAP_CLIENT_ID: 'map-id',
      NAVER_MAP_CLIENT_SECRET: 'map-secret',
      NAVER_SEARCH_CLIENT_ID: '',
      NAVER_SEARCH_CLIENT_SECRET: '',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('rejects a request with no token without calling anything', async () => {
    const response = createResponse();

    await handler(createRequest(), response);

    expect(response.statusCode).toBe(401);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('rejects a malformed authorization header', async () => {
    const response = createResponse();

    await handler(createRequest('Basic abc'), response);

    expect(response.statusCode).toBe(401);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('rejects a token Supabase does not accept and never reaches Naver', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });
    const response = createResponse();

    await handler(createRequest('Bearer bad-token'), response);

    expect(response.statusCode).toBe(401);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toBe('https://project.test/auth/v1/user');
  });

  it('blocks requests when the auth settings are missing', async () => {
    process.env.SUPABASE_ANON_KEY = '';
    const response = createResponse();

    await handler(createRequest('Bearer good-token'), response);

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({ error: 'AUTH_NOT_CONFIGURED' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('answers the search for a valid session', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce(jsonResponse(200, { addresses: [{ x: '126.97', y: '37.56', roadAddress: '서울 중구' }] }));
    const response = createResponse();

    await handler(createRequest('Bearer good-token'), response);

    expect(mockFetch.mock.calls[0][1].headers).toEqual({ apikey: 'anon-key', Authorization: 'Bearer good-token' });
    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({ results: [{ latitude: 37.56, longitude: 126.97 }] });
  });

  it('logs only the upstream status and code, not the search or the error body', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce(jsonResponse(401, { errorCode: '024', errorMessage: 'upstream-detail-marker' }));
    process.env.VERCEL_ENV = 'production';
    const response = createResponse();

    await handler(createRequest('Bearer good-token'), response);

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({ error: 'NAVER_PLACE_SEARCH_FAILED' });
    const logged = String((console.error as jest.Mock).mock.calls[0][1]);

    expect(logged).toBe('Geocoding failed: 401 024');
    expect(logged).not.toContain('upstream-detail-marker');
    expect(logged).not.toContain('서울시청');
  });

  it('does not reveal which Naver setting is missing', async () => {
    process.env.NAVER_MAP_CLIENT_SECRET = '';
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
    const response = createResponse();

    await handler(createRequest('Bearer good-token'), response);

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({ error: 'NAVER_MAP_CREDENTIALS_REQUIRED' });
  });

  it('allows the Authorization header in CORS preflight', async () => {
    const response = createResponse();

    await handler(createRequest(undefined, 'OPTIONS'), response);

    expect(response.statusCode).toBe(204);
    expect(response.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  });
});
