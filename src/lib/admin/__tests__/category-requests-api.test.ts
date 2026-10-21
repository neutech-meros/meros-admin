import {
  approveCategoryRequest,
  fetchCategoryRequests,
  fetchCategoryRequestTotals,
  rejectCategoryRequest,
  toCategoryRequestItem,
  type CategoryRequestApiItem,
} from '@/lib/admin/category-requests-api';

const formatDate = (iso: string) => `formatted(${iso})`;
const REQUEST_ID = '00000000-0000-4000-8000-000000000001';

function apiItem(overrides: Partial<CategoryRequestApiItem> = {}): CategoryRequestApiItem {
  return {
    id: REQUEST_ID,
    suggestedName: 'Rooftop Bars',
    status: 'PENDING',
    level: null,
    createdAt: '2026-10-01T12:00:00.000Z',
    submitter: { id: 'profile-1', nickname: 'ana', avatarUrl: null },
    ...overrides,
  };
}

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

function mockFetch(...responses: ReturnType<typeof respond>[]) {
  const fn = jest.fn();
  responses.forEach((response) => fn.mockResolvedValueOnce(response));
  global.fetch = fn;
  return fn;
}

describe('toCategoryRequestItem', () => {
  it.each([
    ['PENDING', 'Pending'],
    ['APPROVED', 'Approved'],
    ['REJECTED', 'Rejected'],
  ] as const)('maps the %s status to %s', (status, expected) => {
    expect(toCategoryRequestItem(apiItem({ status }), formatDate).status).toBe(expected);
  });

  it.each([
    ['GROUP', 'Parent'],
    ['CATEGORY', 'Subcategory'],
    ['SUBCATEGORY', 'Child category'],
    [null, null],
  ] as const)('maps the %s level to %s', (level, expected) => {
    expect(toCategoryRequestItem(apiItem({ level }), formatDate).level).toBe(expected);
  });

  it('maps the submitter to the requester and formats the request date', () => {
    const item = toCategoryRequestItem(
      apiItem({
        submitter: { id: 'p', nickname: 'ana', avatarUrl: 'https://cdn.example.test/a.png' },
      }),
      formatDate,
    );

    expect(item).toEqual({
      id: REQUEST_ID,
      name: 'Rooftop Bars',
      status: 'Pending',
      level: null,
      requester: 'ana',
      avatarUrl: 'https://cdn.example.test/a.png',
      date: 'formatted(2026-10-01T12:00:00.000Z)',
      decision: null,
    });
  });

  it('shows the requester as unavailable when the submitter has no nickname', () => {
    const item = toCategoryRequestItem(
      apiItem({ submitter: { id: 'p', nickname: null, avatarUrl: null } }),
      formatDate,
    );

    expect(item.requester).toBe('—');
  });

  it('maps the decision fields when present', () => {
    const item = toCategoryRequestItem(
      apiItem({
        status: 'REJECTED',
        reason: 'Duplicate of Bars',
        decidedAt: '2026-10-02T09:00:00.000Z',
        groupId: null,
        categoryId: null,
      }),
      formatDate,
    );

    expect(item.decision).toEqual({
      reason: 'Duplicate of Bars',
      decidedAt: 'formatted(2026-10-02T09:00:00.000Z)',
      groupId: null,
      categoryId: null,
    });
  });

  it('keeps the placement of an approved request', () => {
    const item = toCategoryRequestItem(
      apiItem({
        status: 'APPROVED',
        level: 'SUBCATEGORY',
        reason: null,
        decidedAt: '2026-10-02T09:00:00.000Z',
        groupId: null,
        categoryId: 'category-1',
      }),
      formatDate,
    );

    expect(item.decision).toEqual({
      reason: null,
      decidedAt: 'formatted(2026-10-02T09:00:00.000Z)',
      groupId: null,
      categoryId: 'category-1',
    });
  });

  it('has no decision for an undecided request even when the fields come back null', () => {
    const item = toCategoryRequestItem(
      apiItem({ reason: null, decidedAt: null, groupId: null, categoryId: null }),
      formatDate,
    );

    expect(item.decision).toBeNull();
  });
});

describe('fetchCategoryRequests', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('calls the same-origin proxy and returns the adapted items with the total', async () => {
    const fetchMock = mockFetch(respond(200, { items: [apiItem()], total: 7 }));

    const result = await fetchCategoryRequests({}, formatDate);

    expect(fetchMock).toHaveBeenCalledWith('/api/admin/category-requests');
    expect(result).toEqual({
      ok: true,
      total: 7,
      items: [expect.objectContaining({ id: REQUEST_ID, status: 'Pending' })],
    });
  });

  it('sends the status, page and limit as query params', async () => {
    const fetchMock = mockFetch(respond(200, { items: [], total: 0 }));

    await fetchCategoryRequests({ status: 'REJECTED', page: 2, limit: 50 }, formatDate);

    const [url] = fetchMock.mock.calls[0] as [string];
    const parsed = new URL(url, 'http://localhost');
    expect(parsed.pathname).toBe('/api/admin/category-requests');
    expect(Object.fromEntries(parsed.searchParams)).toEqual({
      status: 'REJECTED',
      page: '2',
      limit: '50',
    });
  });

  it.each([
    ['a non-2xx response', respond(502, { error: 'Failed' })],
    ['a body that is not JSON', respond(200)],
    [
      'an unknown status',
      respond(200, { items: [apiItem({ status: 'ARCHIVED' as never })], total: 1 }),
    ],
    ['a missing total', respond(200, { items: [] })],
  ])('returns an error result for %s instead of throwing', async (_label, response) => {
    mockFetch(response);

    await expect(fetchCategoryRequests({}, formatDate)).resolves.toEqual({ ok: false });
  });

  it('returns an error result when the request throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(fetchCategoryRequests({}, formatDate)).resolves.toEqual({ ok: false });
  });
});

describe('fetchCategoryRequestTotals', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('loads the total of each status with one minimal request per status', async () => {
    const fetchMock = jest.fn(async (url: string) => {
      const status = new URL(url, 'http://localhost').searchParams.get('status');
      const totals: Record<string, number> = { PENDING: 4, APPROVED: 10, REJECTED: 2 };
      return respond(200, { items: [], total: totals[status ?? ''] });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await fetchCategoryRequestTotals();

    expect(result).toEqual({ ok: true, totals: { pending: 4, approved: 10, rejected: 2 } });
    const queries = fetchMock.mock.calls.map(([url]) =>
      Object.fromEntries(new URL(url, 'http://localhost').searchParams),
    );
    expect(queries).toEqual(
      expect.arrayContaining([
        { status: 'PENDING', limit: '1' },
        { status: 'APPROVED', limit: '1' },
        { status: 'REJECTED', limit: '1' },
      ]),
    );
    expect(queries).toHaveLength(3);
  });

  it('returns an error result when any status fails to load', async () => {
    mockFetch(
      respond(200, { items: [], total: 4 }),
      respond(502, { error: 'Failed' }),
      respond(200, { items: [], total: 2 }),
    );

    await expect(fetchCategoryRequestTotals()).resolves.toEqual({ ok: false });
  });
});

describe('approveCategoryRequest', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('posts the payload as JSON to the same-origin proxy and returns the created node', async () => {
    const created = {
      id: REQUEST_ID,
      createdId: 'node-1',
      level: 'CATEGORY',
      labelKey: 'taxonomy.rooftop_bars',
    };
    const fetchMock = mockFetch(respond(200, created));
    const payload = { level: 'CATEGORY', groupId: 'group-1', iconKey: 'cocktail' } as const;

    const result = await approveCategoryRequest(REQUEST_ID, payload);

    expect(result).toEqual({ kind: 'ok', result: created });
    expect(fetchMock).toHaveBeenCalledWith(`/api/admin/category-requests/${REQUEST_ID}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  });

  it('encodes the request id as a single path segment', async () => {
    const fetchMock = mockFetch(respond(400, { error: 'Invalid', code: 'UNKNOWN' }));

    await approveCategoryRequest('a/../b', { level: 'GROUP' });

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe('/api/admin/category-requests/a%2F..%2Fb/approve');
  });

  it.each([
    [404, { code: 'CATEGORY_REQUEST_NOT_FOUND' }, 'not-found'],
    [409, { code: 'CATEGORY_REQUEST_ALREADY_RESOLVED' }, 'already-resolved'],
    [409, { code: 'CATEGORY_NAME_EXISTS' }, 'name-exists'],
    [409, { code: 'UNKNOWN' }, 'error'],
    [404, { error: 'This endpoint is disabled' }, 'error'],
    [400, { code: 'MISSING_GROUP_ID' }, 'error'],
    [502, { error: 'Failed' }, 'error'],
    [409, undefined, 'error'],
  ])('maps a %i with %j to %s', async (status, body, kind) => {
    mockFetch(respond(status, body));

    await expect(approveCategoryRequest(REQUEST_ID, { level: 'GROUP' })).resolves.toEqual({
      kind,
    });
  });

  it('returns an error result when the success body is malformed', async () => {
    mockFetch(respond(200, { id: REQUEST_ID }));

    await expect(approveCategoryRequest(REQUEST_ID, { level: 'GROUP' })).resolves.toEqual({
      kind: 'error',
    });
  });

  it('returns an error result when the request throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(approveCategoryRequest(REQUEST_ID, { level: 'GROUP' })).resolves.toEqual({
      kind: 'error',
    });
  });
});

describe('rejectCategoryRequest', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('posts the reason as JSON to the same-origin proxy', async () => {
    const fetchMock = mockFetch(respond(204));

    const result = await rejectCategoryRequest(REQUEST_ID, 'Duplicate of Bars');

    expect(result).toEqual({ kind: 'ok' });
    expect(fetchMock).toHaveBeenCalledWith(`/api/admin/category-requests/${REQUEST_ID}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Duplicate of Bars' }),
    });
  });

  it('sends an empty body when there is no reason', async () => {
    const fetchMock = mockFetch(respond(204));

    await rejectCategoryRequest(REQUEST_ID);

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(options.body).toBe('{}');
  });

  it.each([
    [404, { code: 'CATEGORY_REQUEST_NOT_FOUND' }, 'not-found'],
    [409, { code: 'CATEGORY_REQUEST_ALREADY_RESOLVED' }, 'already-resolved'],
    [409, { code: 'UNKNOWN' }, 'error'],
    [400, { code: 'INVALID_PAYLOAD' }, 'error'],
    [502, { error: 'Failed' }, 'error'],
  ])('maps a %i with %j to %s', async (status, body, kind) => {
    mockFetch(respond(status, body));

    await expect(rejectCategoryRequest(REQUEST_ID)).resolves.toEqual({ kind });
  });

  it('returns an error result when the request throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(rejectCategoryRequest(REQUEST_ID)).resolves.toEqual({ kind: 'error' });
  });
});
