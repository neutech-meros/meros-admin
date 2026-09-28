/**
 * @jest-environment node
 */
import { GET } from '../route';

const VALID_QUEUE_RESPONSE = {
  items: [
    {
      id: 'LIST:list-1',
      targetType: 'LIST',
      targetId: '00000000-0000-0000-0000-000000000abc',
      title: 'Best tacos',
      excerpt: null,
      itemCount: 4,
      publishedAt: '2026-08-01T00:00:00.000Z',
      listTitle: null,
      venueCity: null,
      venueCountry: null,
      bio: null,
      profileCreatedAt: null,
      reason: 'spam_or_misleading',
      severity: 'AVERAGE',
      owner: { name: 'Ana', handle: 'ana', accountType: 'INDIVIDUAL', accountStatus: 'ACTIVE' },
      priorRemovals: 0,
      reporters: [
        {
          name: 'Bob',
          handle: null,
          reason: 'spam_or_misleading',
          details: null,
          reportedAt: '2026-09-01T00:00:00.000Z',
        },
      ],
    },
  ],
  total: 1,
};

function fetchOk(body: unknown) {
  return jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body });
}

function fetchStatus(status: number) {
  return jest.fn().mockResolvedValue({ ok: false, status, json: async () => ({}) });
}

describe('GET /api/admin/moderation/reports', () => {
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

    const res = await GET();

    expect(res.status).toBe(404);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('forwards the validated upstream response with 200', async () => {
    global.fetch = fetchOk(VALID_QUEUE_RESPONSE);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(VALID_QUEUE_RESPONSE);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3005/admin/moderation/reports',
      expect.objectContaining({ headers: { Authorization: 'Bearer dev-admin-key' } }),
    );
  });

  it('returns 502 when upstream responds with a non-2xx status', async () => {
    global.fetch = fetchStatus(500);

    const res = await GET();

    expect(res.status).toBe(502);
  });

  it('returns 502 when the upstream response fails schema validation', async () => {
    global.fetch = fetchOk({ items: [{ id: 'not-a-valid-item' }], total: 1 });

    const res = await GET();

    expect(res.status).toBe(502);
  });

  it('returns 502 when the upstream request throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));

    const res = await GET();

    expect(res.status).toBe(502);
  });
});
