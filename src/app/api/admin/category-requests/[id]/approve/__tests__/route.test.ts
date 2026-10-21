/**
 * @jest-environment node
 */
import { POST } from '../route';

const VALID_ID = '00000000-0000-4000-8000-000000000001';
const GROUP_ID = '00000000-0000-4000-8000-0000000000aa';
const CATEGORY_ID = '00000000-0000-4000-8000-0000000000bb';
const APPROVE_RESPONSE = {
  id: VALID_ID,
  createdId: '00000000-0000-4000-8000-0000000000cc',
  level: 'GROUP',
  labelKey: 'taxonomy.rooftop_bars',
};

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

describe('POST /api/admin/category-requests/:id/approve', () => {
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

    const res = await POST(jsonRequest({ level: 'GROUP' }), params(VALID_ID));

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

    const res = await POST(jsonRequest({ level: 'GROUP' }), params(VALID_ID));

    expect(res.status).toBe(404);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it.each(['not-a-uuid', `${VALID_ID}/../other`])(
    'returns 400 for the id %s without reaching upstream',
    async (id) => {
      global.fetch = jest.fn();

      const res = await POST(jsonRequest({ level: 'GROUP' }), params(id));

      expect(res.status).toBe(400);
      expect(global.fetch).not.toHaveBeenCalled();
    },
  );

  it('returns 415 for a non-JSON content type without reaching upstream', async () => {
    global.fetch = jest.fn();
    const req = new Request('http://x', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'level=GROUP',
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
    ['a missing level', {}],
    ['an unknown level', { level: 'TAG' }],
    ['CATEGORY without groupId', { level: 'CATEGORY' }],
    ['SUBCATEGORY without categoryId', { level: 'SUBCATEGORY', groupId: GROUP_ID }],
    ['a non-uuid groupId', { level: 'CATEGORY', groupId: 'nope' }],
    ['a non-uuid categoryId', { level: 'SUBCATEGORY', categoryId: 'nope' }],
    ['an empty iconKey', { level: 'GROUP', iconKey: '' }],
    ['an iconKey longer than 50 chars', { level: 'GROUP', iconKey: 'x'.repeat(51) }],
    ['an unknown status', { level: 'GROUP', status: 'ARCHIVED' }],
  ])('returns 400 for %s without reaching upstream', async (_label, body) => {
    global.fetch = jest.fn();

    const res = await POST(jsonRequest(body), params(VALID_ID));

    expect(res.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('forwards the body with the server actor, bearer key and no-store, and returns the validated result', async () => {
    global.fetch = fetchStatus(200, APPROVE_RESPONSE);
    const body = { level: 'GROUP', iconKey: 'cocktail', status: 'ACTIVE' };

    const res = await POST(jsonRequest(body), params(VALID_ID));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(APPROVE_RESPONSE);
    expect(global.fetch).toHaveBeenCalledWith(
      `http://localhost:3005/admin/category-requests/${VALID_ID}/approve`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer dev-admin-key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...body, actorLabel: 'meros-admin' }),
        cache: 'no-store',
      },
    );
  });

  it('forwards groupId for CATEGORY and categoryId for SUBCATEGORY', async () => {
    global.fetch = fetchStatus(200, { ...APPROVE_RESPONSE, level: 'SUBCATEGORY' });

    await POST(
      jsonRequest({ level: 'SUBCATEGORY', groupId: GROUP_ID, categoryId: CATEGORY_ID }),
      params(VALID_ID),
    );

    expect(forwardedBody()).toEqual({
      level: 'SUBCATEGORY',
      groupId: GROUP_ID,
      categoryId: CATEGORY_ID,
      actorLabel: 'meros-admin',
    });
  });

  it('ignores an actor sent by the client and drops undeclared body fields', async () => {
    global.fetch = fetchStatus(200, APPROVE_RESPONSE);

    await POST(
      jsonRequest({ level: 'GROUP', actorLabel: 'someone-else', reviewedBy: 'x', extra: true }),
      params(VALID_ID),
    );

    expect(forwardedBody()).toEqual({ level: 'GROUP', actorLabel: 'meros-admin' });
  });

  it('strips fields the upstream response does not declare', async () => {
    global.fetch = fetchStatus(200, { ...APPROVE_RESPONSE, internal: 'x' });

    const res = await POST(jsonRequest({ level: 'GROUP' }), params(VALID_ID));

    expect(await res.json()).toEqual(APPROVE_RESPONSE);
  });

  it.each([
    [404, 'CATEGORY_REQUEST_NOT_FOUND'],
    [409, 'CATEGORY_REQUEST_ALREADY_RESOLVED'],
    [409, 'CATEGORY_NAME_EXISTS'],
    [400, 'MISSING_GROUP_ID'],
    [400, 'MISSING_CATEGORY_ID'],
    [400, 'INVALID_PAYLOAD'],
  ])('passes through an upstream %i with its code %s', async (status, code) => {
    global.fetch = fetchStatus(status, { code, message: 'translated upstream text' });

    const res = await POST(jsonRequest({ level: 'GROUP' }), params(VALID_ID));

    expect(res.status).toBe(status);
    const body = (await res.json()) as { code: string; error: string };
    expect(body.code).toBe(code);
    expect(body.error).not.toContain('translated upstream text');
  });

  it('degrades an unknown or missing upstream error code to UNKNOWN', async () => {
    global.fetch = fetchStatus(409, { code: 'constructor' });
    const unknown = await POST(jsonRequest({ level: 'GROUP' }), params(VALID_ID));
    expect(unknown.status).toBe(409);
    expect(((await unknown.json()) as { code: string }).code).toBe('UNKNOWN');

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => {
        throw new SyntaxError('Unexpected end of JSON input');
      },
    });
    const missing = await POST(jsonRequest({ level: 'GROUP' }), params(VALID_ID));
    expect(missing.status).toBe(404);
    expect(((await missing.json()) as { code: string }).code).toBe('UNKNOWN');
  });

  it('returns a generic 502 without leaking secrets when the upstream response is malformed', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = fetchStatus(200, { id: VALID_ID });

    const res = await POST(jsonRequest({ level: 'GROUP' }), params(VALID_ID));

    expect(res.status).toBe(502);
    const logged = consoleError.mock.calls.flat().join(' ');
    expect(logged).not.toContain('dev-admin-key');
    expect(JSON.stringify(await res.json())).not.toContain('meros-admin');
  });

  it('returns 502 when upstream responds with an unexpected non-2xx status', async () => {
    global.fetch = fetchStatus(500, { code: 'INTERNAL_ERROR' });

    const res = await POST(jsonRequest({ level: 'GROUP' }), params(VALID_ID));

    expect(res.status).toBe(502);
  });

  it('returns 502 when the upstream request throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));

    const res = await POST(jsonRequest({ level: 'GROUP' }), params(VALID_ID));

    expect(res.status).toBe(502);
  });
});
