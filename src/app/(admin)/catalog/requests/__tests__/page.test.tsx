import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';

import i18n from '@/i18n';

import CategoryRequestsPage from '../page';

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

// English is the source-of-truth locale and matches the mockup copy, same as the other
// real-data screens' tests; pt is restored for the other suites.
beforeAll(async () => {
  await i18n.changeLanguage('en');
});
afterAll(async () => {
  await i18n.changeLanguage('pt');
});

interface ApiItem {
  id: string;
  suggestedName: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  level: 'GROUP' | 'CATEGORY' | 'SUBCATEGORY' | null;
  createdAt: string;
  submitter: { id: string; nickname: string | null; avatarUrl: string | null };
}

function item(overrides: Partial<ApiItem> & { id: string; suggestedName: string }): ApiItem {
  return {
    status: 'PENDING',
    level: null,
    createdAt: '2026-10-01T12:00:00.000Z',
    submitter: { id: 'profile-1', nickname: 'ana', avatarUrl: null },
    ...overrides,
  };
}

const PENDING = [
  item({ id: 'r-1', suggestedName: 'Rooftop Bars' }),
  item({
    id: 'r-2',
    suggestedName: 'Ramen Spots',
    submitter: { id: 'profile-2', nickname: null, avatarUrl: null },
  }),
];
const APPROVED = [
  item({ id: 'r-3', suggestedName: 'Tiki Bars', status: 'APPROVED', level: 'GROUP' }),
  item({ id: 'r-4', suggestedName: 'Late Night Ramen', status: 'APPROVED', level: 'SUBCATEGORY' }),
];
const REJECTED = [item({ id: 'r-5', suggestedName: 'Speakeasy Bars', status: 'REJECTED' })];
const TOTALS = { PENDING: 2, APPROVED: 2, REJECTED: 1 };

type Handler = (url: URL) => { status: number; body?: unknown };

function json(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

function serve(handler: Handler) {
  const fetchMock = jest.fn(async (input: string) => {
    const { status, body } = handler(new URL(input, 'http://localhost'));
    return json(status, body);
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function backend(overrides: { list?: Handler } = {}): Handler {
  return (url) => {
    const status = url.searchParams.get('status') as keyof typeof TOTALS | null;
    const limit = url.searchParams.get('limit');
    if (status && limit === '1') return { status: 200, body: { items: [], total: TOTALS[status] } };
    if (overrides.list) return overrides.list(url);
    const byStatus = { PENDING, APPROVED, REJECTED };
    const items = status ? byStatus[status] : [...PENDING, ...APPROVED, ...REJECTED];
    return { status: 200, body: { items, total: items.length } };
  };
}

function listCalls(fetchMock: jest.Mock) {
  return fetchMock.mock.calls
    .map(([input]) => new URL(input as string, 'http://localhost'))
    .filter(
      (url) =>
        url.pathname === '/api/admin/category-requests' && url.searchParams.get('limit') !== '1',
    )
    .map((url) => Object.fromEntries(url.searchParams));
}

function kpi(label: string) {
  return screen.getByText(label).parentElement!;
}

describe('CategoryRequestsPage', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('shows a loading state, then the Pending requests from the API by default', async () => {
    const fetchMock = serve(backend());

    render(<CategoryRequestsPage />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading category requests...');
    expect(await screen.findByText('Rooftop Bars')).toBeInTheDocument();
    expect(screen.getByText('Ramen Spots')).toBeInTheDocument();
    expect(screen.queryByText('Tiki Bars')).not.toBeInTheDocument();
    expect(listCalls(fetchMock)).toEqual([{ status: 'PENDING', page: '1', limit: '20' }]);
    expect(screen.getByRole('button', { name: 'Pending (2)' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('shows the real totals per status in the KPI cards and tab labels', async () => {
    serve(backend());

    render(<CategoryRequestsPage />);

    await waitFor(() => expect(kpi('Pending review')).toHaveTextContent('2'));
    expect(kpi('Approved')).toHaveTextContent('2');
    expect(kpi('Rejected')).toHaveTextContent('1');
    expect(screen.queryByText('Waiting on requester')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approved (2)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rejected (1)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All requests' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Waiting on requester/ })).not.toBeInTheDocument();
  });

  it('filters on the server when switching tabs, with All sending no status', async () => {
    const fetchMock = serve(backend());
    const user = userEvent.setup();
    render(<CategoryRequestsPage />);
    await screen.findByText('Rooftop Bars');

    await user.click(screen.getByRole('button', { name: 'Approved (2)' }));
    expect(await screen.findByText('Tiki Bars')).toBeInTheDocument();
    expect(screen.queryByText('Rooftop Bars')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'All requests' }));
    expect(await screen.findByText('Speakeasy Bars')).toBeInTheDocument();

    expect(listCalls(fetchMock)).toEqual([
      { status: 'PENDING', page: '1', limit: '20' },
      { status: 'APPROVED', page: '1', limit: '20' },
      { page: '1', limit: '20' },
    ]);
  });

  it('renders each row with the real fields only', async () => {
    serve(backend());
    const user = userEvent.setup();
    render(<CategoryRequestsPage />);
    await screen.findByText('Rooftop Bars');
    await user.click(screen.getByRole('button', { name: 'Approved (2)' }));

    const tiki = (await screen.findByText('Tiki Bars')).closest('tr')!;
    expect(within(tiki).getByText('Parent')).toBeInTheDocument();
    expect(within(tiki).getByText('ana')).toBeInTheDocument();
    expect(within(tiki).getByText('Approved')).toBeInTheDocument();
    expect(within(tiki).getByText(/2026/)).toBeInTheDocument();
    expect(within(tiki).queryByText('—')).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Parent path' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Votes' })).not.toBeInTheDocument();

    const ramen = screen.getByText('Late Night Ramen').closest('tr')!;
    expect(within(ramen).getByText('Child category')).toBeInTheDocument();
  });

  it('shows the requester and level as unavailable when the API has none', async () => {
    serve(backend());
    render(<CategoryRequestsPage />);

    const ramen = (await screen.findByText('Ramen Spots')).closest('tr')!;
    expect(within(ramen).queryByText('ana')).not.toBeInTheDocument();
    expect(within(ramen).getAllByText('—')).toHaveLength(2);
  });

  it('opens the drawer of the clicked request and closes it', async () => {
    serve(backend());
    const user = userEvent.setup();
    render(<CategoryRequestsPage />);

    await user.click(await screen.findByText('Rooftop Bars'));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Rooftop Bars' })).toBeInTheDocument();
    expect(within(dialog).getByText('Requested by ana')).toBeInTheDocument();
    expect(
      within(dialog).queryByRole('button', { name: 'Ask for details' }),
    ).not.toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('shows the empty state when a status has no requests', async () => {
    serve(backend({ list: () => ({ status: 200, body: { items: [], total: 0 } }) }));

    render(<CategoryRequestsPage />);

    expect(await screen.findByText('No requests in this status')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument();
  });

  it('shows the load error when the category requests proxy is disabled', async () => {
    serve(() => ({ status: 404, body: { error: 'This endpoint is disabled' } }));

    render(<CategoryRequestsPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't load category requests. Please try again later.",
    );
    await waitFor(() => expect(kpi('Pending review')).toHaveTextContent('—'));
  });

  it('shows an error with a retry that reloads the list', async () => {
    let fail = true;
    const fetchMock = serve(
      backend({
        list: () =>
          fail
            ? { status: 502, body: { error: 'Failed' } }
            : { status: 200, body: { items: PENDING, total: 2 } },
      }),
    );
    const user = userEvent.setup();
    render(<CategoryRequestsPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't load category requests. Please try again later.",
    );
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Rooftop Bars')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(listCalls(fetchMock)).toHaveLength(2);
  });

  it('keeps the list usable and shows unavailable totals when the totals fail', async () => {
    serve((url) =>
      url.searchParams.get('limit') === '1'
        ? { status: 502, body: { error: 'Failed' } }
        : backend()(url),
    );

    render(<CategoryRequestsPage />);

    expect(await screen.findByText('Rooftop Bars')).toBeInTheDocument();
    await waitFor(() => expect(kpi('Pending review')).toHaveTextContent('—'));
    expect(kpi('Approved')).toHaveTextContent('—');
    expect(screen.getByRole('button', { name: 'Pending (—)' })).toBeInTheDocument();
  });

  it('paginates over the server total, newest first as the server returns them', async () => {
    const pageOne = Array.from({ length: 20 }, (_, i) =>
      item({ id: `p1-${i}`, suggestedName: `Request ${i + 1}` }),
    );
    const pageTwo = [item({ id: 'p2-0', suggestedName: 'Request 21' })];
    const fetchMock = serve(
      backend({
        list: (url) => ({
          status: 200,
          body: { items: url.searchParams.get('page') === '2' ? pageTwo : pageOne, total: 21 },
        }),
      }),
    );
    const user = userEvent.setup();
    render(<CategoryRequestsPage />);
    await screen.findByText('Request 1');

    const nav = screen.getByRole('navigation', { name: 'Pagination' });
    expect(screen.getByText('Showing 1–20 of 21 requests')).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: 'Previous page' })).toBeDisabled();

    await user.click(within(nav).getByRole('button', { name: 'Page 2' }));
    expect(await screen.findByText('Request 21')).toBeInTheDocument();
    expect(screen.queryByText('Request 1')).not.toBeInTheDocument();
    expect(screen.getByText('Showing 21–21 of 21 requests')).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: 'Next page' })).toBeDisabled();
    expect(listCalls(fetchMock).at(-1)).toEqual({ status: 'PENDING', page: '2', limit: '20' });
  });

  it('goes back to the first page when switching tabs', async () => {
    const fetchMock = serve(
      backend({
        list: (url) => ({
          status: 200,
          body: {
            items: [item({ id: `x-${url.search}`, suggestedName: `Row ${url.search}` })],
            total: 45,
          },
        }),
      }),
    );
    const user = userEvent.setup();
    render(<CategoryRequestsPage />);
    const nav = await screen.findByRole('navigation', { name: 'Pagination' });

    await user.click(within(nav).getByRole('button', { name: 'Page 3' }));
    await waitFor(() =>
      expect(listCalls(fetchMock).at(-1)).toEqual({ status: 'PENDING', page: '3', limit: '20' }),
    );
    await user.click(screen.getByRole('button', { name: 'Rejected (1)' }));

    await waitFor(() =>
      expect(listCalls(fetchMock).at(-1)).toEqual({ status: 'REJECTED', page: '1', limit: '20' }),
    );
  });
});

const TREE = [
  {
    id: 'group-food',
    name: 'Food',
    key: 'food',
    status: 'ACTIVE',
    itemsCount: 3,
    categories: [
      {
        id: 'cat-bars',
        name: 'Bars',
        key: 'bars',
        status: 'ACTIVE',
        itemsCount: 1,
        subcategories: [],
      },
    ],
  },
];

type Reply = { status: number; body?: unknown };

function serveDecisions(replies: { approve?: Reply; reject?: Reply } = {}) {
  const posts: Array<{ path: string; body: unknown }> = [];
  const fetchMock = jest.fn(async (input: string, init?: RequestInit) => {
    const url = new URL(input, 'http://localhost');
    if (init?.method === 'POST') {
      posts.push({ path: url.pathname, body: JSON.parse(String(init.body)) });
      const reply = url.pathname.endsWith('/approve')
        ? (replies.approve ?? {
            status: 200,
            body: { id: 'r-1', createdId: 'node-1', level: 'GROUP', labelKey: 'taxonomy.x' },
          })
        : (replies.reject ?? { status: 204 });
      return json(reply.status, reply.body);
    }
    if (url.pathname === '/api/admin/categories') return json(200, TREE);
    const { status, body } = backend()(url);
    return json(status, body);
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return { fetchMock, posts };
}

function totalsCalls(fetchMock: jest.Mock) {
  return fetchMock.mock.calls.filter(([input]) => String(input).includes('limit=1')).length;
}

async function openCreateFromRow(user: ReturnType<typeof userEvent.setup>, name: string) {
  const row = (await screen.findByText(name)).closest('tr')!;
  await user.click(within(row).getByRole('button', { name: 'Create' }));
  return screen.findByRole('button', { name: 'Create category' });
}

async function openRejectFromRow(user: ReturnType<typeof userEvent.setup>, name: string) {
  const row = (await screen.findByText(name)).closest('tr')!;
  await user.click(within(row).getByRole('button', { name: 'Reject' }));
  return screen.findByRole('button', { name: 'Reject request' });
}

describe('CategoryRequestsPage decisions', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('offers Create and Reject only on pending rows', async () => {
    serveDecisions();
    const user = userEvent.setup();
    render(<CategoryRequestsPage />);
    const pending = (await screen.findByText('Rooftop Bars')).closest('tr')!;
    expect(within(pending).getByRole('button', { name: 'Create' })).toBeInTheDocument();
    expect(within(pending).getByRole('button', { name: 'Reject' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Approved (2)' }));
    const approved = (await screen.findByText('Tiki Bars')).closest('tr')!;
    expect(within(approved).queryByRole('button')).not.toBeInTheDocument();
  });

  it('approves a request as a top-level category and refreshes the list and KPIs', async () => {
    const { fetchMock, posts } = serveDecisions();
    const user = userEvent.setup();
    render(<CategoryRequestsPage />);
    await screen.findByText('Rooftop Bars');
    const listBefore = listCalls(fetchMock).length;
    const totalsBefore = totalsCalls(fetchMock);

    await user.click(await openCreateFromRow(user, 'Rooftop Bars'));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Parent category created', {
        description: '"Rooftop Bars" was added to the tree.',
      }),
    );
    expect(posts).toEqual([
      {
        path: '/api/admin/category-requests/r-1/approve',
        body: { level: 'GROUP', iconKey: expect.any(String), status: 'ACTIVE' },
      },
    ]);
    await waitFor(() => expect(listCalls(fetchMock).length).toBeGreaterThan(listBefore));
    expect(totalsCalls(fetchMock)).toBeGreaterThan(totalsBefore);
    expect(screen.queryByRole('button', { name: 'Create category' })).not.toBeInTheDocument();
  });

  it('approves a request as a subcategory under the chosen parent group', async () => {
    const { posts } = serveDecisions();
    const user = userEvent.setup();
    render(<CategoryRequestsPage />);
    await openCreateFromRow(user, 'Rooftop Bars');

    await user.click(screen.getByRole('button', { name: 'Subcategory' }));
    await user.click(screen.getByRole('button', { name: 'Create category' }));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Category created', {
        description: '"Rooftop Bars" was added under Food.',
      }),
    );
    expect(posts).toEqual([
      {
        path: '/api/admin/category-requests/r-1/approve',
        body: {
          level: 'CATEGORY',
          groupId: 'group-food',
          iconKey: expect.any(String),
          status: 'ACTIVE',
        },
      },
    ]);
  });

  it('approves a request under a parent and names the parent in the toast', async () => {
    const { posts } = serveDecisions();
    const user = userEvent.setup();
    render(<CategoryRequestsPage />);
    await openCreateFromRow(user, 'Rooftop Bars');

    await user.click(screen.getByRole('button', { name: 'Child category' }));
    await user.click(screen.getByRole('button', { name: 'Create category' }));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Category created', {
        description: '"Rooftop Bars" was added under Food › Bars.',
      }),
    );
    expect(posts[0]!.body).toEqual({
      level: 'SUBCATEGORY',
      categoryId: 'cat-bars',
      iconKey: expect.any(String),
      status: 'ACTIVE',
    });
  });

  it('keeps the modal open and explains when the name already exists', async () => {
    const { fetchMock } = serveDecisions({
      approve: { status: 409, body: { error: 'x', code: 'CATEGORY_NAME_EXISTS' } },
    });
    const user = userEvent.setup();
    render(<CategoryRequestsPage />);
    await screen.findByText('Rooftop Bars');
    const listBefore = listCalls(fetchMock).length;

    await user.click(await openCreateFromRow(user, 'Rooftop Bars'));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Name already in use', {
        description:
          'A category named "Rooftop Bars" already exists. Reject this request or rename the existing category first.',
      }),
    );
    expect(screen.getByRole('button', { name: 'Create category' })).toBeEnabled();
    expect(listCalls(fetchMock)).toHaveLength(listBefore);
  });

  it.each([
    [
      'already resolved',
      { status: 409, body: { error: 'x', code: 'CATEGORY_REQUEST_ALREADY_RESOLVED' } },
      'Request already reviewed',
      'This request was already approved or rejected. The list was refreshed.',
    ],
    [
      'not found',
      { status: 404, body: { error: 'x', code: 'CATEGORY_REQUEST_NOT_FOUND' } },
      'Request not found',
      'This request no longer exists. The list was refreshed.',
    ],
  ])(
    'closes the modal and refreshes when the approval finds the request %s',
    async (_label, reply, title, description) => {
      const { fetchMock } = serveDecisions({ approve: reply });
      const user = userEvent.setup();
      render(<CategoryRequestsPage />);
      await screen.findByText('Rooftop Bars');
      const listBefore = listCalls(fetchMock).length;

      await user.click(await openCreateFromRow(user, 'Rooftop Bars'));

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith(title, { description }));
      await waitFor(() => expect(listCalls(fetchMock).length).toBeGreaterThan(listBefore));
      expect(screen.queryByRole('button', { name: 'Create category' })).not.toBeInTheDocument();
    },
  );

  it('shows a generic failure and keeps the modal open when the approval fails', async () => {
    serveDecisions({ approve: { status: 502, body: { error: 'Failed' } } });
    const user = userEvent.setup();
    render(<CategoryRequestsPage />);

    await user.click(await openCreateFromRow(user, 'Rooftop Bars'));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Couldn't create the category", {
        description: 'Something went wrong. Please try again.',
      }),
    );
    expect(screen.getByRole('button', { name: 'Create category' })).toBeEnabled();
  });

  it('sends a single approval when Create is clicked twice', async () => {
    let release: () => void = () => {};
    const { fetchMock, posts } = serveDecisions();
    const base = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (input: string, init?: RequestInit) => {
      if (init?.method === 'POST') await new Promise<void>((resolve) => (release = resolve));
      return base(input, init);
    });
    const user = userEvent.setup();
    render(<CategoryRequestsPage />);
    const create = await openCreateFromRow(user, 'Rooftop Bars');

    await user.click(create);
    await waitFor(() => expect(create).toBeDisabled());
    await user.click(create);
    release();

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(posts).toHaveLength(1);
  });

  it('rejects a request from its row with a reason and refreshes', async () => {
    const { fetchMock, posts } = serveDecisions();
    const user = userEvent.setup();
    render(<CategoryRequestsPage />);
    await screen.findByText('Rooftop Bars');
    const listBefore = listCalls(fetchMock).length;

    const confirm = await openRejectFromRow(user, 'Rooftop Bars');
    await user.type(screen.getByLabelText(/Reason/), 'Duplicate of Bars');
    await user.click(confirm);

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Request rejected', {
        description: 'ana was notified.',
      }),
    );
    expect(posts).toEqual([
      { path: '/api/admin/category-requests/r-1/reject', body: { reason: 'Duplicate of Bars' } },
    ]);
    await waitFor(() => expect(listCalls(fetchMock).length).toBeGreaterThan(listBefore));
    expect(screen.queryByRole('button', { name: 'Reject request' })).not.toBeInTheDocument();
  });

  it('rejects from the drawer and closes it', async () => {
    const { posts } = serveDecisions();
    const user = userEvent.setup();
    render(<CategoryRequestsPage />);
    await user.click(await screen.findByText('Rooftop Bars'));
    const drawer = await screen.findByRole('dialog');

    await user.click(within(drawer).getByRole('button', { name: 'Reject' }));
    await user.click(await screen.findByRole('button', { name: 'Reject request' }));

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(posts).toEqual([{ path: '/api/admin/category-requests/r-1/reject', body: {} }]);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('opens the create modal from the drawer', async () => {
    serveDecisions();
    const user = userEvent.setup();
    render(<CategoryRequestsPage />);
    await user.click(await screen.findByText('Rooftop Bars'));
    const drawer = await screen.findByRole('dialog');

    await user.click(within(drawer).getByRole('button', { name: 'Create category' }));

    expect(
      await screen.findByText(
        'Requested by ana. Confirm where it belongs in the tree before creating it.',
      ),
    ).toBeInTheDocument();
  });

  it.each([
    [
      { status: 409, body: { error: 'x', code: 'CATEGORY_REQUEST_ALREADY_RESOLVED' } },
      'Request already reviewed',
    ],
    [
      { status: 404, body: { error: 'x', code: 'CATEGORY_REQUEST_NOT_FOUND' } },
      'Request not found',
    ],
    [{ status: 502, body: { error: 'Failed' } }, "Couldn't reject the request"],
  ])('explains a failed rejection (%j)', async (reply, title) => {
    serveDecisions({ reject: reply });
    const user = userEvent.setup();
    render(<CategoryRequestsPage />);

    await user.click(await openRejectFromRow(user, 'Rooftop Bars'));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(title, { description: expect.any(String) }),
    );
  });
});
