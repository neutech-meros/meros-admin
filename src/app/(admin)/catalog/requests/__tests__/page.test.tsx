import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import i18n from '@/i18n';

import CategoryRequestsPage from '../page';

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
    .filter((url) => url.searchParams.get('limit') !== '1')
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

  it('renders each row with the real fields and marks unavailable ones', async () => {
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
    expect(within(tiki).getAllByText('—').length).toBeGreaterThanOrEqual(2);

    const ramen = screen.getByText('Late Night Ramen').closest('tr')!;
    expect(within(ramen).getByText('Child category')).toBeInTheDocument();
  });

  it('shows the requester and level as unavailable when the API has none', async () => {
    serve(backend());
    render(<CategoryRequestsPage />);

    const ramen = (await screen.findByText('Ramen Spots')).closest('tr')!;
    expect(within(ramen).queryByText('ana')).not.toBeInTheDocument();
    expect(within(ramen).getAllByText('—').length).toBeGreaterThanOrEqual(3);
  });

  it('does not offer actions that are not wired to the API yet', async () => {
    serve(backend());
    const user = userEvent.setup();
    render(<CategoryRequestsPage />);
    const row = (await screen.findByText('Rooftop Bars')).closest('tr')!;

    expect(within(row).queryByRole('button')).not.toBeInTheDocument();
    await user.click(row);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the empty state when a status has no requests', async () => {
    serve(backend({ list: () => ({ status: 200, body: { items: [], total: 0 } }) }));

    render(<CategoryRequestsPage />);

    expect(await screen.findByText('No requests in this status')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument();
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
