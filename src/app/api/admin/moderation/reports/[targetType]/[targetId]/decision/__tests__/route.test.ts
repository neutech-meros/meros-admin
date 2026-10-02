/**
 * @jest-environment node
 */
import { POST } from '../route';

const TARGET_ID = '00000000-0000-0000-0000-000000000abc';
const URL = `http://localhost/api/admin/moderation/reports/LIST/${TARGET_ID}/decision`;

function params(overrides: Partial<{ targetType: string; targetId: string }> = {}) {
  return Promise.resolve({ targetType: 'LIST', targetId: TARGET_ID, ...overrides });
}

function postRequest(url: string, body: unknown) {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function fetchStatus(status: number) {
  return jest
    .fn()
    .mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => ({}) });
}

describe('POST /api/admin/moderation/reports/:targetType/:targetId/decision', () => {
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

    const res = await POST(postRequest(URL, { decision: 'KEPT' }), { params: params() });

    expect(res.status).toBe(404);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns 400 without reaching upstream for an invalid targetType', async () => {
    global.fetch = jest.fn();

    const res = await POST(postRequest(URL, { decision: 'KEPT' }), {
      params: params({ targetType: 'COMMENT' }),
    });

    expect(res.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns 400 without reaching upstream for a non-uuid targetId', async () => {
    global.fetch = jest.fn();

    const res = await POST(postRequest(URL, { decision: 'KEPT' }), {
      params: params({ targetId: 'not-a-uuid' }),
    });

    expect(res.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns 415 without reaching upstream for a non-JSON content type', async () => {
    global.fetch = jest.fn();

    const res = await POST(
      new Request(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ decision: 'KEPT' }),
      }),
      { params: params() },
    );

    expect(res.status).toBe(415);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns 415 for a CORS-safelisted MIME essence smuggling "application/json" in a parameter (text/plain; x=application/json)', async () => {
    global.fetch = jest.fn();

    const res = await POST(
      new Request(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain; x=application/json' },
        body: JSON.stringify({ decision: 'REMOVED' }),
      }),
      { params: params() },
    );

    expect(res.status).toBe(415);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns 404 (not 502) when disabled in production with the other proxy vars unset', async () => {
    (process.env as { NODE_ENV: string }).NODE_ENV = 'production';
    process.env.ADMIN_MODERATION_PROXY_ENABLED = 'false';
    delete process.env.MEROS_API_URL;
    delete process.env.MEROS_ADMIN_API_KEY;
    global.fetch = jest.fn();

    const res = await POST(postRequest(URL, { decision: 'KEPT' }), { params: params() });

    expect(res.status).toBe(404);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns 400 without reaching upstream for malformed JSON', async () => {
    global.fetch = jest.fn();

    const res = await POST(postRequest(URL, '{not json'), { params: params() });

    expect(res.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns 400 without reaching upstream for an invalid decision value', async () => {
    global.fetch = jest.fn();

    const res = await POST(postRequest(URL, { decision: 'DELETE' }), { params: params() });

    expect(res.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('forwards the decision to upstream and returns 204 on success, without a reviewedBy field', async () => {
    global.fetch = fetchStatus(204);

    const res = await POST(postRequest(URL, { decision: 'REMOVED' }), { params: params() });

    expect(res.status).toBe(204);
    expect(global.fetch).toHaveBeenCalledWith(
      `http://localhost:3005/admin/moderation/reports/LIST/${TARGET_ID}/decision`,
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ decision: 'REMOVED' }) }),
    );
  });

  it('returns 404 when upstream reports no pending reports for the target', async () => {
    global.fetch = fetchStatus(404);

    const res = await POST(postRequest(URL, { decision: 'KEPT' }), { params: params() });

    expect(res.status).toBe(404);
  });

  it('returns 502 when upstream responds with an unexpected error status', async () => {
    global.fetch = fetchStatus(500);

    const res = await POST(postRequest(URL, { decision: 'KEPT' }), { params: params() });

    expect(res.status).toBe(502);
  });

  it('returns 502 when the upstream request throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));

    const res = await POST(postRequest(URL, { decision: 'KEPT' }), { params: params() });

    expect(res.status).toBe(502);
  });
});
