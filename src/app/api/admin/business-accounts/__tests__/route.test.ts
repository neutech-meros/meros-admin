/**
 * @jest-environment node
 */
import { GET } from '../route';

function item(id: string) {
  return {
    id,
    businessName: 'Pousada Vista Azul',
    requesterName: 'Marina Alves',
    requesterEmail: 'marina@vistaazul.com.br',
    city: 'Paraty, RJ',
    taxId: '12.345.678/0001-90',
    category: 'Accommodation',
    requestedPlan: 'Business Pro',
    documentsSubmitted: 3,
    documentsRequired: 3,
    applicationNote: 'Requested to sell hosted stays and list experiences.',
    status: 'Pending',
    submittedAt: '2026-08-24T00:00:00.000Z',
  };
}

const VALID_LIST_RESPONSE = {
  items: [item('00000000-0000-4000-8000-000000000001')],
  total: 1,
};

function fetchOk(body: unknown) {
  return jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body });
}

function fetchStatus(status: number) {
  return jest.fn().mockResolvedValue({ ok: false, status, json: async () => ({}) });
}

describe('GET /api/admin/business-accounts', () => {
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

    const res = await GET();

    expect(res.status).toBe(404);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns 404 (not 502) when disabled in production with the other proxy vars unset', async () => {
    (process.env as { NODE_ENV: string }).NODE_ENV = 'production';
    process.env.ADMIN_BUSINESS_ACCOUNTS_PROXY_ENABLED = 'false';
    delete process.env.MEROS_API_URL;
    delete process.env.MEROS_ADMIN_API_KEY;
    delete process.env.MEROS_ADMIN_ACTOR;
    global.fetch = jest.fn();

    const res = await GET();

    expect(res.status).toBe(404);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('forwards the validated upstream response with 200, with the admin key attached', async () => {
    global.fetch = fetchOk(VALID_LIST_RESPONSE);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(VALID_LIST_RESPONSE);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3005/admin/business-accounts?page=1&limit=100',
      expect.objectContaining({ headers: { Authorization: 'Bearer dev-admin-key' } }),
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('fetches every page until it has collected all of total', async () => {
    const page1 = { items: [item('00000000-0000-4000-8000-000000000001')], total: 3 };
    const page2 = { items: [item('00000000-0000-4000-8000-000000000002')], total: 3 };
    const page3 = { items: [item('00000000-0000-4000-8000-000000000003')], total: 3 };
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => page1 })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => page2 })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => page3 });

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(3);
    expect(body.items.map((i: { id: string }) => i.id)).toEqual([
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000002',
      '00000000-0000-4000-8000-000000000003',
    ]);
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3005/admin/business-accounts?page=2&limit=100',
      expect.anything(),
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      3,
      'http://localhost:3005/admin/business-accounts?page=3&limit=100',
      expect.anything(),
    );
  });

  it('stops paging when upstream returns an empty page before reaching total', async () => {
    const page1 = { items: [item('00000000-0000-4000-8000-000000000001')], total: 5 };
    const page2 = { items: [], total: 5 };
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => page1 })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => page2 });

    const res = await GET();

    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('returns 502 when upstream responds with a non-2xx status', async () => {
    global.fetch = fetchStatus(500);

    const res = await GET();

    expect(res.status).toBe(502);
  });

  it('returns 502 when a later page responds with a non-2xx status', async () => {
    const page1 = { items: [item('00000000-0000-4000-8000-000000000001')], total: 3 };
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => page1 })
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });

    const res = await GET();

    expect(res.status).toBe(502);
  });

  it('returns 502 when the upstream response fails schema validation', async () => {
    global.fetch = fetchOk({ items: [{ id: 'not-a-valid-item' }] });

    const res = await GET();

    expect(res.status).toBe(502);
  });

  it('returns 502 when the upstream request throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));

    const res = await GET();

    expect(res.status).toBe(502);
  });

  it('dedupes an item that shifts and reappears across pages (offset paging under concurrent writes)', async () => {
    const page1 = {
      items: [
        item('00000000-0000-4000-8000-000000000001'),
        item('00000000-0000-4000-8000-000000000002'),
      ],
      total: 3,
    };
    // A new row arrived mid-loop, shifting item 2 back onto page 2 alongside item 3.
    const page2 = {
      items: [
        item('00000000-0000-4000-8000-000000000002'),
        item('00000000-0000-4000-8000-000000000003'),
      ],
      total: 4,
    };
    const page3 = { items: [], total: 4 };
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => page1 })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => page2 })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => page3 });

    const res = await GET();
    const body = await res.json();

    expect(body.items.map((i: { id: string }) => i.id)).toEqual([
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000002',
      '00000000-0000-4000-8000-000000000003',
    ]);
  });

  it('warns and still returns what it has when MAX_PAGES is reached before total', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    global.fetch = jest.fn().mockImplementation((url: string) => {
      const page = Number(new URL(url).searchParams.get('page'));
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          items: [item(`00000000-0000-4000-8000-${String(page).padStart(12, '0')}`)],
          total: 999999,
        }),
      });
    });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.items).toHaveLength(50);
    expect(body.total).toBe(999999);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('MAX_PAGES=50'));
    warn.mockRestore();
  });
});
