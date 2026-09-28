/**
 * @jest-environment node
 */
import { GET } from '../route';

const VALID_REVIEWED_RESPONSE = {
  items: [
    {
      id: 'LIST:list-1',
      title: 'Best tacos',
      owner: 'Ana',
      reportCount: 1,
      decision: 'KEPT',
      reviewedBy: null,
      reviewedAt: '2026-09-02T00:00:00.000Z',
    },
  ],
};

function fetchOk(body: unknown) {
  return jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body });
}

function request(url: string) {
  return new Request(url);
}

describe('GET /api/admin/moderation/reviewed', () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.MEROS_API_URL = 'http://localhost:3005';
    process.env.MEROS_ADMIN_API_KEY = 'dev-admin-key';
    process.env.ADMIN_MODERATION_PROXY_ENABLED = 'true';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  it('returns 404 without reaching upstream when the proxy flag is off', async () => {
    process.env.ADMIN_MODERATION_PROXY_ENABLED = 'false';
    global.fetch = jest.fn();

    const res = await GET(request('http://localhost/api/admin/moderation/reviewed'));

    expect(res.status).toBe(404);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('forwards the request with no limit query string when none is given', async () => {
    global.fetch = fetchOk(VALID_REVIEWED_RESPONSE);

    const res = await GET(request('http://localhost/api/admin/moderation/reviewed'));

    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3005/admin/moderation/reviewed',
      expect.anything(),
    );
  });

  it('forwards a valid limit to upstream', async () => {
    global.fetch = fetchOk(VALID_REVIEWED_RESPONSE);

    const res = await GET(request('http://localhost/api/admin/moderation/reviewed?limit=10'));

    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3005/admin/moderation/reviewed?limit=10',
      expect.anything(),
    );
  });

  it.each(['abc', '0', '-3', '1.5', '501'])(
    'returns 400 without reaching upstream for limit=%s',
    async (limit) => {
      global.fetch = jest.fn();

      const res = await GET(
        request(`http://localhost/api/admin/moderation/reviewed?limit=${limit}`),
      );

      expect(res.status).toBe(400);
      expect(global.fetch).not.toHaveBeenCalled();
    },
  );

  it('returns 502 when the upstream response fails schema validation', async () => {
    global.fetch = fetchOk({ items: [{ id: 'nope' }] });

    const res = await GET(request('http://localhost/api/admin/moderation/reviewed'));

    expect(res.status).toBe(502);
  });
});
