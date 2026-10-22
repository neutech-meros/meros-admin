import {
  fetchCategoriesTree,
  toCategoryTree,
  type CategoriesTreeApiResponse,
} from '@/lib/admin/categories-api';

const API_TREE: CategoriesTreeApiResponse = [
  {
    id: 'group-1',
    name: 'Food & Drink',
    key: 'food_drink',
    status: 'ACTIVE',
    itemsCount: 12,
    categories: [
      {
        id: 'category-1',
        name: 'Restaurants',
        key: 'restaurants',
        status: 'ACTIVE',
        itemsCount: 9,
        subcategories: [
          { id: 'sub-1', name: 'Vegan', key: 'vegan', status: 'INACTIVE', itemsCount: 3 },
          { id: 'sub-2', name: 'Ramen', key: 'ramen', status: 'ACTIVE', itemsCount: 6 },
        ],
      },
    ],
  },
  {
    id: 'group-2',
    name: 'Nightlife',
    key: 'nightlife',
    status: 'INACTIVE',
    itemsCount: 0,
    categories: [],
  },
];

function respond(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (body === undefined) throw new SyntaxError('Unexpected end of JSON input');
      return body;
    },
  };
}

describe('toCategoryTree', () => {
  it('maps the three backend levels to the modal levels, keeping every node field', () => {
    expect(toCategoryTree(API_TREE)).toEqual([
      {
        id: 'group-1',
        name: 'Food & Drink',
        key: 'food_drink',
        level: 'Parent',
        status: 'ACTIVE',
        itemsCount: 12,
        children: [
          {
            id: 'category-1',
            name: 'Restaurants',
            key: 'restaurants',
            level: 'Subcategory',
            status: 'ACTIVE',
            itemsCount: 9,
            children: [
              {
                id: 'sub-1',
                name: 'Vegan',
                key: 'vegan',
                level: 'Child category',
                status: 'INACTIVE',
                itemsCount: 3,
                children: [],
              },
              {
                id: 'sub-2',
                name: 'Ramen',
                key: 'ramen',
                level: 'Child category',
                status: 'ACTIVE',
                itemsCount: 6,
                children: [],
              },
            ],
          },
        ],
      },
      {
        id: 'group-2',
        name: 'Nightlife',
        key: 'nightlife',
        level: 'Parent',
        status: 'INACTIVE',
        itemsCount: 0,
        children: [],
      },
    ]);
  });

  it('maps an empty tree to an empty list', () => {
    expect(toCategoryTree([])).toEqual([]);
  });
});

describe('fetchCategoriesTree', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('loads the tree from the same-origin proxy and returns it adapted', async () => {
    const fetchMock = jest.fn().mockResolvedValue(respond(200, API_TREE));
    global.fetch = fetchMock;

    const result = await fetchCategoriesTree();

    expect(fetchMock).toHaveBeenCalledWith('/api/admin/categories');
    expect(result).toEqual({ ok: true, tree: toCategoryTree(API_TREE) });
  });

  it('returns an empty tree as ok', async () => {
    global.fetch = jest.fn().mockResolvedValue(respond(200, []));

    await expect(fetchCategoriesTree()).resolves.toEqual({ ok: true, tree: [] });
  });

  it.each([
    ['a disabled proxy (404)', respond(404, { error: 'This endpoint is disabled' })],
    ['an upstream failure (502)', respond(502, { error: 'Failed' })],
    ['a body that is not JSON', respond(200)],
    ['a body that is not a list', respond(200, { items: API_TREE })],
    ['an unknown status', respond(200, [{ ...API_TREE[1], status: 'DELETED' }])],
    ['a negative itemsCount', respond(200, [{ ...API_TREE[1], itemsCount: -1 }])],
    ['a group without categories', respond(200, [{ ...API_TREE[1], categories: undefined }])],
  ])('returns an error result for %s instead of throwing', async (_label, response) => {
    global.fetch = jest.fn().mockResolvedValue(response);

    await expect(fetchCategoriesTree()).resolves.toEqual({ ok: false });
  });

  it('returns an error result when the request throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(fetchCategoriesTree()).resolves.toEqual({ ok: false });
  });
});
