/**
 * @jest-environment node
 */
import { POST } from '../route';

const VALID_ID = '00000000-0000-4000-8000-000000000001';

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

function fetchStatus(status: number, body: unknown = {}) {
  return jest
    .fn()
    .mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => body });
}

describe('POST /api/admin/business-accounts/:id/approve', () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.MEROS_API_URL = 'http://localhost:3005';
    process.env.MEROS_ADMIN_API_KEY = 'dev-admin-key';
    process.env.MEROS_ADMIN_ACTOR = 'meros-admin';
    process.env.ADMIN_BUSINESS_ACCOUNTS_PROXY_ENABLED = 'true';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  it('returns 404 without reaching upstream when the proxy flag is off', async () => {
    process.env.ADMIN_BUSINESS_ACCOUNTS_PROXY_ENABLED = 'false';
    global.fetch = jest.fn();

    const res = await POST(new Request('http://x'), params(VALID_ID));

    expect(res.status).toBe(404);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns 404 (not 502) when disabled in production with the other proxy vars unset', async () => {
    process.env.NODE_ENV = 'production';
    process.env.ADMIN_BUSINESS_ACCOUNTS_PROXY_ENABLED = 'false';
    delete process.env.MEROS_API_URL;
    delete process.env.MEROS_ADMIN_API_KEY;
    delete process.env.MEROS_ADMIN_ACTOR;
    global.fetch = jest.fn();

    const res = await POST(new Request('http://x'), params(VALID_ID));

    expect(res.status).toBe(404);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns 400 for a non-uuid id without reaching upstream', async () => {
    global.fetch = jest.fn();

    const res = await POST(new Request('http://x'), params('not-a-uuid'));

    expect(res.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('forwards the Bearer admin key and X-Admin-Actor, and returns 204 on success', async () => {
    global.fetch = fetchStatus(204);

    const res = await POST(new Request('http://x'), params(VALID_ID));

    expect(res.status).toBe(204);
    expect(await res.text()).toBe('');
    expect(global.fetch).toHaveBeenCalledWith(
      `http://localhost:3005/admin/business-accounts/${VALID_ID}/approve`,
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer dev-admin-key',
          'X-Admin-Actor': 'meros-admin',
        },
      }),
    );
  });

  it('passes through a 404 from upstream', async () => {
    global.fetch = fetchStatus(404);
    const res = await POST(new Request('http://x'), params(VALID_ID));
    expect(res.status).toBe(404);
  });

  it('passes through a 409 from upstream', async () => {
    global.fetch = fetchStatus(409);
    const res = await POST(new Request('http://x'), params(VALID_ID));
    expect(res.status).toBe(409);
  });

  it('returns 502 when upstream responds with an unexpected non-2xx status', async () => {
    global.fetch = fetchStatus(500);
    const res = await POST(new Request('http://x'), params(VALID_ID));
    expect(res.status).toBe(502);
  });

  it('returns 502 when the upstream request throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));
    const res = await POST(new Request('http://x'), params(VALID_ID));
    expect(res.status).toBe(502);
  });
});
