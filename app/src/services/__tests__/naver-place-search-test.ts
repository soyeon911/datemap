const mockGetSession = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: () => mockGetSession() } },
}));

function loadService() {
  process.env.EXPO_PUBLIC_NAVER_PLACE_SEARCH_ENDPOINT = 'https://proxy.test/api/naver-place-search';

  let service: typeof import('@/services/naver-place-search') | undefined;

  jest.isolateModules(() => {
    service = require('@/services/naver-place-search');
  });

  return service!;
}

describe('searchNaverPlaces', () => {
  const mockFetch = jest.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    mockGetSession.mockReset();
    globalThis.fetch = mockFetch;
  });

  it('sends the session token to the proxy', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'token-123' } } });
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ results: [] }) });

    await loadService().searchNaverPlaces('카페');

    const [url, options] = mockFetch.mock.calls[0];

    expect(url).toContain('query=');
    expect(options.headers).toEqual({ Authorization: 'Bearer token-123' });
  });

  it('does not call the proxy without a session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    await expect(loadService().searchNaverPlaces('카페')).rejects.toThrow('PLACE_SEARCH_SESSION_REQUIRED');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('skips the session lookup for a blank query', async () => {
    await expect(loadService().searchNaverPlaces('   ')).resolves.toEqual([]);
    expect(mockGetSession).not.toHaveBeenCalled();
  });
});
