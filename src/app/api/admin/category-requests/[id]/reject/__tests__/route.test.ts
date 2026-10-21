/**
 * @jest-environment node
 */
import { POST } from '../route';

const VALID_ID = '00000000-0000-4000-8000-000000000001';

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

function jsonRequest(body: unknown) {
  return new Request('http://x', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function fetchStatus(status: number, body: unknown = {}) {
  return jest
    .fn()
    .mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => body });
}

function forwardedBody() {
  const [, options] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
  return JSON.parse(options.body as string) as unknown;
}

describe('POST /api/admin/category-requests/:id/reject', () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.MEROS_API_URL = 'http://localhost:3005';
    process.env.MEROS_ADMIN_API_KEY = 'dev-admin-key';
    process.env.MEROS_ADMIN_ACTOR = 'meros-admin';
    process.env.ADMIN_CATEGORIES_PROXY_ENABLED = 'true';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  it('returns 404 without reaching upstream when the proxy flag is off', async () => {
    process.env.ADMIN_CATEGORIES_PROXY_ENABLED = 'false';
    global.fetch = jest.fn();

    const res = await POST(jsonRequest({}), params(VALID_ID));

    expect(res.status).toBe(404);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns 404 (not 502) when disabled in production with the other proxy vars unset', async () => {
    (process.env as { NODE_ENV: string }).NODE_ENV = 'production';
    delete process.env.ADMIN_CATEGORIES_PROXY_ENABLED;
    delete process.env.MEROS_API_URL;
    delete process.env.MEROS_ADMIN_API_KEY;
    delete process.env.MEROS_ADMIN_ACTOR;
    global.fetch = jest.fn();

    const res = await POST(jsonRequest({}), params(VALID_ID));

    expect(res.status).toBe(404);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it.each(['not-a-uuid', `${VALID_ID}/../other`])(
    'returns 400 for the id %s without reaching upstream',
    async (id) => {
      global.fetch = jest.fn();

      const res = await POST(jsonRequest({}), params(id));

      expect(res.status).toBe(400);
      expect(global.fetch).not.toHaveBeenCalled();
    },
  );

  it('returns 415 for a non-JSON content type without reaching upstream', async () => {
    global.fetch = jest.fn();
    const req = new Request('http://x', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'reason=x',
    });

    const res = await POST(req, params(VALID_ID));

    expect(res.status).toBe(415);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid JSON body without reaching upstream', async () => {
    global.fetch = jest.fn();
    const req = new Request('http://x', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not json',
    });

    const res = await POST(req, params(VALID_ID));

    expect(res.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it.each([
    ['an empty reason', { reason: '' }],
    ['a reason longer than 500 chars', { reason: 'x'.repeat(501) }],
    ['a non-string reason', { reason: 42 }],
  ])('returns 400 for %s without reaching upstream', async (_label, body) => {
    global.fetch = jest.fn();

    const res = await POST(jsonRequest(body), params(VALID_ID));

    expect(res.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('forwards the reason with the server actor, bearer key and no-store, and returns 204', async () => {
    global.fetch = fetchStatus(204);

    const res = await POST(jsonRequest({ reason: 'Duplicate of Bars' }), params(VALID_ID));

    expect(res.status).toBe(204);
    expect(await res.text()).toBe('');
    expect(global.fetch).toHaveBeenCalledWith(
      `http://localhost:3005/admin/category-requests/${VALID_ID}/reject`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer dev-admin-key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: 'Duplicate of Bars', actorLabel: 'meros-admin' }),
        cache: 'no-store',
      },
    );
  });

  it('accepts a rejection without a reason', async () => {
    global.fetch = fetchStatus(204);

    const res = await POST(jsonRequest({}), params(VALID_ID));

    expect(res.status).toBe(204);
    expect(forwardedBody()).toEqual({ actorLabel: 'meros-admin' });
  });

  it('ignores an actor sent by the client and drops undeclared body fields', async () => {
    global.fetch = fetchStatus(204);

    await POST(
      jsonRequest({ reason: 'Spam', actorLabel: 'someone-else', decidedBy: 'x' }),
      params(VALID_ID),
    );

    expect(forwardedBody()).toEqual({ reason: 'Spam', actorLabel: 'meros-admin' });
  });

  it.each([
    [404, 'CATEGORY_REQUEST_NOT_FOUND'],
    [409, 'CATEGORY_REQUEST_ALREADY_RESOLVED'],
    [400, 'INVALID_PAYLOAD'],
  ])('passes through an upstream %i with its code %s', async (status, code) => {
    global.fetch = fetchStatus(status, { code, message: 'translated upstream text' });

    const res = await POST(jsonRequest({}), params(VALID_ID));

    expect(res.status).toBe(status);
    const body = (await res.json()) as { code: string; error: string };
    expect(body.code).toBe(code);
    expect(body.error).not.toContain('translated upstream text');
  });

  it('degrades an unknown upstream error code to UNKNOWN', async () => {
    global.fetch = fetchStatus(409, { code: 'CATEGORY_NAME_EXISTS' });

    const res = await POST(jsonRequest({}), params(VALID_ID));

    expect(res.status).toBe(409);
    expect(((await res.json()) as { code: string }).code).toBe('UNKNOWN');
  });

  it('returns 502 without leaking secrets when upstream responds with an unexpected status', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = fetchStatus(500, { code: 'INTERNAL_ERROR' });

    const res = await POST(jsonRequest({}), params(VALID_ID));

    expect(res.status).toBe(502);
    expect(consoleError.mock.calls.flat().join(' ')).not.toContain('dev-admin-key');
  });

  it('returns 502 when the upstream request throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));

    const res = await POST(jsonRequest({}), params(VALID_ID));

    expect(res.status).toBe(502);
  });
});
