/**
 * @jest-environment node
 */
import { GET } from '../route';

const VALID_LIST_RESPONSE = {
  items: [
    {
      id: '00000000-0000-0000-0000-000000000001',
      suggestedName: 'Rooftop Bars',
      status: 'PENDING',
      level: null,
      createdAt: '2026-10-01T12:00:00.000Z',
      submitter: { id: '00000000-0000-0000-0000-0000000000aa', nickname: 'ana', avatarUrl: null },
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      suggestedName: 'Speakeasy Bars',
      status: 'APPROVED',
      level: 'CATEGORY',
      createdAt: '2026-09-20T08:30:00.000Z',
      submitter: {
        id: '00000000-0000-0000-0000-0000000000bb',
        nickname: null,
        avatarUrl: 'https://cdn.example.test/avatar.png',
      },
    },
  ],
  total: 2,
};

function fetchOk(body: unknown) {
  return jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body });
}

function fetchStatus(status: number) {
  return jest.fn().mockResolvedValue({ ok: false, status, json: async () => ({}) });
}

function request(query = '') {
  return new Request(`http://localhost/api/admin/category-requests${query}`);
}

describe('GET /api/admin/category-requests', () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.MEROS_API_URL = 'http://localhost:3005';
    process.env.MEROS_ADMIN_API_KEY = 'dev-admin-key';
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

    const res = await GET(request());

    expect(res.status).toBe(404);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns 404 (not 502) when disabled in production with the other proxy vars unset', async () => {
    (process.env as { NODE_ENV: string }).NODE_ENV = 'production';
    delete process.env.ADMIN_CATEGORIES_PROXY_ENABLED;
    delete process.env.MEROS_API_URL;
    delete process.env.MEROS_ADMIN_API_KEY;
    global.fetch = jest.fn();

    const res = await GET(request());

    expect(res.status).toBe(404);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('forwards the validated upstream response with 200, using the bearer key and no-store', async () => {
    global.fetch = fetchOk(VALID_LIST_RESPONSE);

    const res = await GET(request());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(VALID_LIST_RESPONSE);
    expect(global.fetch).toHaveBeenCalledWith('http://localhost:3005/admin/category-requests', {
      headers: { Authorization: 'Bearer dev-admin-key' },
      cache: 'no-store',
    });
  });

  it('forwards the validated status, page and limit to upstream', async () => {
    global.fetch = fetchOk(VALID_LIST_RESPONSE);

    await GET(request('?status=REJECTED&page=2&limit=100'));

    const [url] = (global.fetch as jest.Mock).mock.calls[0] as [string];
    const forwarded = new URL(url);
    expect(forwarded.pathname).toBe('/admin/category-requests');
    expect(Object.fromEntries(forwarded.searchParams)).toEqual({
      status: 'REJECTED',
      page: '2',
      limit: '100',
    });
  });

  it('does not forward query params the upstream does not declare', async () => {
    global.fetch = fetchOk(VALID_LIST_RESPONSE);

    await GET(request('?status=PENDING&actor=someone-else'));

    const [url] = (global.fetch as jest.Mock).mock.calls[0] as [string];
    expect(Object.fromEntries(new URL(url).searchParams)).toEqual({ status: 'PENDING' });
  });

  it.each([
    ['an unknown status', '?status=ARCHIVED'],
    ['a lowercase status', '?status=pending'],
    ['page 0', '?page=0'],
    ['a non-integer page', '?page=1.5'],
    ['a non-numeric page', '?page=abc'],
    ['limit 0', '?limit=0'],
    ['limit above 100', '?limit=101'],
  ])('returns 400 without reaching upstream for %s', async (_label, query) => {
    global.fetch = jest.fn();

    const res = await GET(request(query));

    expect(res.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('strips fields the upstream contract does not declare', async () => {
    const [first] = VALID_LIST_RESPONSE.items;
    global.fetch = fetchOk({
      items: [
        {
          ...first,
          internalNote: 'x',
          submitter: { ...first.submitter, email: 'ana@example.test' },
        },
      ],
      total: 1,
      debug: true,
    });

    const res = await GET(request());

    expect(await res.json()).toEqual({ items: [first], total: 1 });
  });

  it('forwards the decision fields when the upstream sends them, without decidedBy', async () => {
    const [, approved] = VALID_LIST_RESPONSE.items;
    const decision = {
      reason: null,
      decidedAt: '2026-09-21T10:00:00.000Z',
      groupId: '00000000-0000-0000-0000-0000000000cc',
      categoryId: '00000000-0000-0000-0000-0000000000dd',
    };
    global.fetch = fetchOk({
      items: [{ ...approved, ...decision, decidedBy: 'meros-admin' }],
      total: 1,
    });

    const res = await GET(request());

    const body = (await res.json()) as { items: Array<Record<string, unknown>> };
    expect(body.items[0]).toEqual({ ...approved, ...decision });
    expect(JSON.stringify(body)).not.toContain('meros-admin');
  });

  it('returns 502 when a decision field has the wrong type', async () => {
    const [first] = VALID_LIST_RESPONSE.items;
    global.fetch = fetchOk({ items: [{ ...first, decidedAt: 'yesterday' }], total: 1 });

    const res = await GET(request());

    expect(res.status).toBe(502);
  });

  it('returns 502 when upstream responds with a non-2xx status', async () => {
    global.fetch = fetchStatus(500);

    const res = await GET(request());

    expect(res.status).toBe(502);
  });

  it('returns a generic 502 without leaking the admin key when the upstream body is malformed', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = fetchOk({ items: [{ id: 'not-a-valid-item' }], total: 1 });

    const res = await GET(request());

    expect(res.status).toBe(502);
    const body = JSON.stringify(await res.json());
    expect(body).not.toContain('dev-admin-key');
    const logged = consoleError.mock.calls.flat().join(' ');
    expect(logged).not.toContain('dev-admin-key');
  });

  it('returns 502 when the upstream request throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));

    const res = await GET(request());

    expect(res.status).toBe(502);
  });
});
