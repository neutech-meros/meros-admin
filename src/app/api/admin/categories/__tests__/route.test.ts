/**
 * @jest-environment node
 */
import { GET } from '../route';

const VALID_TREE = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Food & Drink',
    key: 'food_drink',
    status: 'ACTIVE',
    itemsCount: 12,
    categories: [
      {
        id: '00000000-0000-4000-8000-000000000002',
        name: 'Restaurants',
        key: 'restaurants',
        status: 'ACTIVE',
        itemsCount: 9,
        subcategories: [
          {
            id: '00000000-0000-4000-8000-000000000003',
            name: 'Vegan',
            key: 'vegan',
            status: 'INACTIVE',
            itemsCount: 0,
          },
        ],
      },
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000004',
    name: 'Nightlife',
    key: 'nightlife',
    status: 'INACTIVE',
    itemsCount: 0,
    categories: [],
  },
];

function fetchOk(body: unknown) {
  return jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body });
}

function fetchStatus(status: number) {
  return jest.fn().mockResolvedValue({ ok: false, status, json: async () => ({}) });
}

describe('GET /api/admin/categories', () => {
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

    const res = await GET();

    expect(res.status).toBe(404);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns 404 (not 502) when disabled in production with the other proxy vars unset', async () => {
    (process.env as { NODE_ENV: string }).NODE_ENV = 'production';
    delete process.env.ADMIN_CATEGORIES_PROXY_ENABLED;
    delete process.env.MEROS_API_URL;
    delete process.env.MEROS_ADMIN_API_KEY;
    global.fetch = jest.fn();

    const res = await GET();

    expect(res.status).toBe(404);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('forwards the validated three-level tree with 200, using the bearer key and no-store', async () => {
    global.fetch = fetchOk(VALID_TREE);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(VALID_TREE);
    expect(global.fetch).toHaveBeenCalledWith('http://localhost:3005/admin/categories', {
      headers: { Authorization: 'Bearer dev-admin-key' },
      cache: 'no-store',
    });
  });

  it('returns an empty tree as-is', async () => {
    global.fetch = fetchOk([]);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('strips fields the upstream contract does not declare at every level', async () => {
    const [group] = VALID_TREE;
    const [category] = group.categories;
    const [subcategory] = category.subcategories;
    global.fetch = fetchOk([
      {
        ...group,
        order: 1,
        categories: [
          {
            ...category,
            createdBy: 'someone',
            subcategories: [{ ...subcategory, labelKey: 'taxonomy.vegan' }],
          },
        ],
      },
    ]);

    const res = await GET();

    expect(await res.json()).toEqual([group]);
  });

  it.each([
    ['a non-array body', { items: VALID_TREE }],
    ['an unknown status', [{ ...VALID_TREE[1], status: 'DELETED' }]],
    ['a negative itemsCount', [{ ...VALID_TREE[1], itemsCount: -1 }]],
    ['a group without categories', [{ ...VALID_TREE[1], categories: undefined }]],
  ])('returns a generic 502 without leaking the admin key for %s', async (_label, body) => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = fetchOk(body);

    const res = await GET();

    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain('dev-admin-key');
    expect(consoleError.mock.calls.flat().join(' ')).not.toContain('dev-admin-key');
  });

  it('returns 502 when upstream responds with a non-2xx status', async () => {
    global.fetch = fetchStatus(500);

    const res = await GET();

    expect(res.status).toBe(502);
  });

  it('returns 502 when the upstream request throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));

    const res = await GET();

    expect(res.status).toBe(502);
  });
});
