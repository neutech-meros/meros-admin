import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';

import i18n from '@/i18n';
import enUS from '@/locales/enUS.json';
import esES from '@/locales/esES.json';
import ptBR from '@/locales/ptBR.json';

import BusinessAccountsPage from '../page';

// The Toaster is mounted by AdminShell, not by this page, so toasts would be silent here
// anyway; mocking lets us assert the page actually fires them.
jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

// The test setup initializes i18n with lng 'pt'. English is this app's source-of-truth
// locale and matches the mockup copy verbatim, so these tests switch to 'en' and assert
// the mockup's literal strings, then restore 'pt' for the other suites.
beforeAll(async () => {
  await i18n.changeLanguage('en');
});
afterAll(async () => {
  await i18n.changeLanguage('pt');
});

interface ApiItem {
  id: string;
  businessName: string | null;
  requesterName: string;
  requesterEmail: string | null;
  city: string | null;
  taxId: string | null;
  category: string | null;
  requestedPlan: string | null;
  documentsSubmitted: number;
  documentsRequired: number;
  applicationNote: string | null;
  status: 'Pending' | 'More info' | 'Approved' | 'Rejected';
  submittedAt: string;
}

function item(overrides: Partial<ApiItem> & { id: string }): ApiItem {
  return {
    businessName: null,
    requesterName: 'Requester',
    requesterEmail: null,
    city: null,
    taxId: null,
    category: null,
    requestedPlan: null,
    documentsSubmitted: 0,
    documentsRequired: 3,
    applicationNote: null,
    status: 'Pending',
    submittedAt: '2026-09-20T10:00:00.000Z',
    ...overrides,
  };
}

const SEED: ApiItem[] = [
  item({
    id: '00000000-0000-4000-8000-000000000001',
    businessName: 'Pousada Vista Azul',
    city: 'Paraty, RJ',
    taxId: '12.345.678/0001-90',
    category: 'Accommodation',
    requesterName: 'Marina Alves',
    requesterEmail: 'marina@vistaazul.com.br',
    requestedPlan: 'Business Pro',
    applicationNote: 'Requested to sell hosted stays and list experiences.',
    documentsSubmitted: 3,
    status: 'Pending',
    submittedAt: '2026-08-24T00:00:00.000Z',
  }),
  item({
    id: '00000000-0000-4000-8000-000000000002',
    businessName: 'Trilhas do Sul Turismo',
    city: 'Gramado, RS',
    taxId: '98.765.432/0001-21',
    category: 'Tour operator',
    requesterName: 'Diego Ramos',
    requesterEmail: 'diego@trilhasdosul.com',
    requestedPlan: 'Business',
    applicationNote: 'Missing operating licence (Cadastur).',
    documentsSubmitted: 2,
    status: 'Pending',
    submittedAt: '2026-08-23T00:00:00.000Z',
  }),
  item({
    id: '00000000-0000-4000-8000-000000000003',
    businessName: 'Sabor da Ilha Restaurante',
    city: 'Florianópolis, SC',
    taxId: '45.612.789/0001-33',
    category: 'Food & drink',
    requesterName: 'Carla Menezes',
    requesterEmail: 'contato@sabordailha.com.br',
    requestedPlan: 'Business',
    applicationNote: 'Verified by the trust team.',
    documentsSubmitted: 3,
    status: 'Approved',
    submittedAt: '2026-08-22T00:00:00.000Z',
  }),
  item({
    id: '00000000-0000-4000-8000-000000000004',
    businessName: 'Rota Norte Transfers',
    city: 'Natal, RN',
    taxId: '33.221.554/0001-77',
    category: 'Transport',
    requesterName: 'Fábio Lima',
    requesterEmail: 'fabio@rotanorte.com',
    requestedPlan: 'Business',
    applicationNote: 'Tax ID does not match the submitted company name.',
    documentsSubmitted: 1,
    status: 'More info',
    submittedAt: '2026-08-21T00:00:00.000Z',
  }),
  item({
    id: '00000000-0000-4000-8000-000000000005',
    businessName: 'Casa Mar Aluguéis',
    city: 'Búzios, RJ',
    taxId: '77.884.221/0001-05',
    category: 'Accommodation',
    requesterName: 'Renata Pires',
    requesterEmail: 'renata@casamar.com.br',
    requestedPlan: 'Business Pro',
    applicationNote: 'Duplicate of an existing business account.',
    documentsSubmitted: 3,
    status: 'Rejected',
    submittedAt: '2026-08-19T00:00:00.000Z',
  }),
];

const PENDING = SEED.filter((r) => r.status === 'Pending').map((r) => r.businessName!);
const MORE_INFO = SEED.filter((r) => r.status === 'More info').map((r) => r.businessName!);
const APPROVED = SEED.filter((r) => r.status === 'Approved').map((r) => r.businessName!);
const REJECTED = SEED.filter((r) => r.status === 'Rejected').map((r) => r.businessName!);
const ALL = SEED.map((r) => r.businessName!);

function tabButton(label: RegExp) {
  return screen.getByRole('button', { name: label });
}

function row(name: string) {
  const tr = screen.getByText(name).closest('tr');
  if (!tr) throw new Error(`No table row for "${name}"`);
  return tr;
}

function visibleBusinessNames() {
  return ALL.filter((name) => screen.queryByText(name) !== null);
}

// jsdom 20's CSSOM (cssstyle 2.x) drops any declaration whose value uses var(), so the
// color tokens this page uses can't be observed in tests (toHaveStyle would pass vacuously).
// Color tones are therefore not asserted here; behavioral state is asserted instead through
// aria-pressed (active tab) and data-incomplete (Documents cell).
function expectActiveTab(el: HTMLElement, active: boolean) {
  expect(el).toHaveAttribute('aria-pressed', String(active));
}

function kpiValue(label: string) {
  const card = screen.getByText(label).parentElement;
  if (!card) throw new Error(`No KPI card for "${label}"`);
  return within(card).getByTestId('kpi-value');
}

async function openDrawerFor(name: string) {
  const user = userEvent.setup();
  await user.click(within(row(name)).getByRole('button', { name: /^(Review|View)$/ }));
  return { user, drawer: screen.getByRole('dialog', { name }) };
}

function jsonResponse(status: number, body: unknown): Pick<Response, 'ok' | 'status' | 'json'> {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) };
}

type FetchMock = jest.Mock<
  Promise<Pick<Response, 'ok' | 'status' | 'json'>>,
  [RequestInfo | URL, RequestInit?]
>;
let fetchMock: FetchMock;
let state: ApiItem[];

function findById(id: string): ApiItem {
  const found = state.find((r) => r.id === id);
  if (!found) throw new Error(`No seeded item for id "${id}"`);
  return found;
}

function defaultFetchImpl(url: RequestInfo | URL, init?: RequestInit) {
  const href = String(url);
  const method = init?.method ?? 'GET';

  if (href.endsWith('/api/admin/business-accounts') && method === 'GET') {
    return Promise.resolve(jsonResponse(200, { items: state }));
  }
  const actionMatch = href.match(/business-accounts\/([^/]+)\/(request-info|approve|reject)$/);
  if (actionMatch && method === 'POST') {
    const [, id, action] = actionMatch;
    const target = findById(id!);
    if (action === 'approve') target.status = 'Approved';
    if (action === 'reject') target.status = 'Rejected';
    // request-info intentionally leaves status untouched (mirrors the real API).
    return Promise.resolve(jsonResponse(204, null));
  }
  return Promise.reject(new Error(`unexpected fetch: ${method} ${href}`));
}

beforeEach(() => {
  jest.clearAllMocks();
  state = SEED.map((r) => ({ ...r }));
  fetchMock = jest.fn(defaultFetchImpl);
  Object.defineProperty(globalThis, 'fetch', {
    value: fetchMock,
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'fetch');
});

async function renderLoaded() {
  render(<BusinessAccountsPage />);
  await screen.findByText(PENDING[0]!);
}

describe('admin.businessAccounts page locale coverage', () => {
  // Page keys only; the drawer namespace has its own coverage test.
  const pageKeys = (m: Record<string, unknown>) =>
    Object.keys(m)
      .filter((k) => k !== 'drawer')
      .sort();
  const en = enUS.admin.businessAccounts as Record<string, unknown>;

  it.each([
    ['ptBR', ptBR.admin.businessAccounts as Record<string, unknown>],
    ['esES', esES.admin.businessAccounts as Record<string, unknown>],
  ])('%s defines every enUS page key with a translated value', (_, loc) => {
    expect(pageKeys(loc)).toEqual(pageKeys(en));
    for (const key of pageKeys(en)) expect(loc[key]).toBeTruthy();
    expect(loc.title).not.toBe(en.title);
    expect(loc.subtitle).not.toBe(en.subtitle);
    expect(loc.emptyTitle).not.toBe(en.emptyTitle);
    expect(loc.toastRejectedDescription).not.toBe(en.toastRejectedDescription);
  });
});

describe('BusinessAccountsPage', () => {
  it('shows a loading state until the list arrives', async () => {
    render(<BusinessAccountsPage />);
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
    await screen.findByText(PENDING[0]!);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows an error state with retry when the list fails to load', async () => {
    fetchMock.mockImplementation((url, init) => {
      if (
        String(url).endsWith('/api/admin/business-accounts') &&
        (!init || init.method === undefined)
      ) {
        return Promise.resolve(jsonResponse(502, { error: 'boom' }));
      }
      return defaultFetchImpl(url, init);
    });
    const user = userEvent.setup();
    render(<BusinessAccountsPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn.t load/i);

    fetchMock.mockImplementation(defaultFetchImpl);
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByText(PENDING[0]!);
  });

  it('renders the header title and subtitle', async () => {
    await renderLoaded();
    expect(screen.getByRole('heading', { level: 1, name: 'Business accounts' })).toBeVisible();
    expect(
      screen.getByText(
        'Every business account request lands here for document review and approval.',
      ),
    ).toBeInTheDocument();
  });

  it('renders the 4 KPI cards with the seed counts', async () => {
    await renderLoaded();
    expect(kpiValue('Pending review')).toHaveTextContent(String(PENDING.length));
    expect(kpiValue('Waiting on documents')).toHaveTextContent(String(MORE_INFO.length));
    expect(kpiValue('Approved')).toHaveTextContent(String(APPROVED.length));
    expect(kpiValue('Rejected')).toHaveTextContent(String(REJECTED.length));
    expect([PENDING.length, MORE_INFO.length, APPROVED.length, REJECTED.length]).toEqual([
      2, 1, 1, 1,
    ]);
  });

  it('renders the 4 tabs with live counts, Pending active by default', async () => {
    await renderLoaded();
    const pending = tabButton(/^Pending \(2\)$/);
    expectActiveTab(pending, true);
    expectActiveTab(tabButton(/^Approved \(1\)$/), false);
    expectActiveTab(tabButton(/^Rejected \(1\)$/), false);
    expectActiveTab(tabButton(/^All requests$/), false);
    // No dedicated "More info" tab.
    expect(screen.queryByRole('button', { name: /^More info/ })).not.toBeInTheDocument();
    expect(visibleBusinessNames()).toEqual(PENDING);
  });

  it('filters the table when switching tabs', async () => {
    const user = userEvent.setup();
    await renderLoaded();

    await user.click(tabButton(/^Approved \(1\)$/));
    expect(visibleBusinessNames()).toEqual(APPROVED);
    expectActiveTab(tabButton(/^Approved \(1\)$/), true);
    expectActiveTab(tabButton(/^Pending \(2\)$/), false);

    await user.click(tabButton(/^Rejected \(1\)$/));
    expect(visibleBusinessNames()).toEqual(REJECTED);

    await user.click(tabButton(/^All requests$/));
    expect(visibleBusinessNames()).toEqual(ALL);
    expect(screen.getByText(MORE_INFO[0]!)).toBeInTheDocument();
    expectActiveTab(tabButton(/^All requests$/), true);

    await user.click(tabButton(/^Pending \(2\)$/));
    expect(visibleBusinessNames()).toEqual(PENDING);
  });

  it('renders the column headers and each column of a row', async () => {
    const user = userEvent.setup();
    await renderLoaded();
    for (const header of [
      'Business',
      'Tax ID',
      'Category',
      'Requested by',
      'Documents',
      'Status',
    ]) {
      expect(screen.getByRole('columnheader', { name: header })).toBeInTheDocument();
    }

    const r = within(row('Trilhas do Sul Turismo'));
    expect(r.getByText('Gramado, RS')).toBeInTheDocument();
    expect(r.getByText('98.765.432/0001-21')).toHaveClass('tabular-nums');
    expect(r.getByText('Tour operator')).toBeInTheDocument();
    expect(r.getByText('Diego Ramos')).toBeInTheDocument();
    expect(r.getByText('diego@trilhasdosul.com')).toBeInTheDocument();
    // Incomplete documents are highlighted; complete ones are not.
    expect(r.getByText('2 of 3')).toHaveAttribute('data-incomplete', 'true');
    expect(within(row('Pousada Vista Azul')).getByText('3 of 3')).toHaveAttribute(
      'data-incomplete',
      'false',
    );
    expect(r.getByText('Pending')).toBeInTheDocument();
    expect(r.getByRole('button', { name: 'Review' })).toBeInTheDocument();

    await user.click(tabButton(/^All requests$/));
    const moreInfo = within(row('Rota Norte Transfers'));
    expect(moreInfo.getByText('More info')).toBeInTheDocument();
    expect(moreInfo.getByText('1 of 3')).toHaveAttribute('data-incomplete', 'true');
    expect(moreInfo.getByRole('button', { name: 'Review' })).toBeInTheDocument();
    const approved = within(row('Sabor da Ilha Restaurante'));
    expect(approved.getByText('Approved')).toBeInTheDocument();
    expect(approved.getByRole('button', { name: 'View' })).toBeInTheDocument();
    const rejected = within(row('Casa Mar Aluguéis'));
    expect(rejected.getByText('Rejected')).toBeInTheDocument();
    expect(rejected.getByRole('button', { name: 'View' })).toBeInTheDocument();
  });

  it('shows the empty state when the active tab has no rows', async () => {
    const user = userEvent.setup();
    await renderLoaded();
    expect(screen.queryByText('No requests in this status')).not.toBeInTheDocument();

    // Empty the Pending tab by approving both of its rows, one at a time.
    const { drawer: first } = await openDrawerFor(PENDING[0]!);
    await user.click(within(first).getByRole('button', { name: 'Approve' }));
    await user.click(screen.getByRole('button', { name: 'Approve account' }));
    await screen.findByRole('button', { name: /^Pending \(1\)$/ });

    const { drawer: second } = await openDrawerFor(PENDING[1]!);
    await user.click(within(second).getByRole('button', { name: 'Approve' }));
    await user.click(screen.getByRole('button', { name: 'Approve account' }));
    await screen.findByRole('button', { name: /^Pending \(0\)$/ });
    expect(screen.getByText('No requests in this status')).toBeInTheDocument();
    expect(
      screen.getByText('Switch tabs to see requests in another review stage.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('opens the drawer for the clicked row via the button or the row itself', async () => {
    const user = userEvent.setup();
    await renderLoaded();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(within(row('Pousada Vista Azul')).getByRole('button', { name: 'Review' }));
    const drawer = screen.getByRole('dialog', { name: 'Pousada Vista Azul' });
    expect(within(drawer).getByText('Business Pro')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(within(row('Trilhas do Sul Turismo')).getByText('Tour operator'));
    const second = screen.getByRole('dialog', { name: 'Trilhas do Sul Turismo' });
    expect(within(second).getByText('Missing operating licence (Cadastur).')).toBeInTheDocument();
  });

  it('Request info toasts and keeps the status unchanged', async () => {
    await renderLoaded();
    const { user, drawer } = await openDrawerFor('Trilhas do Sul Turismo');
    await user.click(within(drawer).getByRole('button', { name: 'Request info' }));

    await screen.findByText('Trilhas do Sul Turismo');
    expect(toast.info).toHaveBeenCalledWith('Information requested', {
      description: 'Diego Ramos was notified about the missing documents.',
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(tabButton(/^Pending \(2\)$/)).toBeInTheDocument();
    expect(within(row('Trilhas do Sul Turismo')).getByText('Pending')).toBeInTheDocument();
  });

  it('Approve toasts and moves the row to Approved', async () => {
    await renderLoaded();
    const { user, drawer } = await openDrawerFor('Pousada Vista Azul');
    await user.click(within(drawer).getByRole('button', { name: 'Approve' }));
    await user.click(screen.getByRole('button', { name: 'Approve account' }));

    await screen.findByRole('button', { name: /^Pending \(1\)$/ });
    expect(toast.success).toHaveBeenCalledWith('Business account approved', {
      description: 'Pousada Vista Azul now has a verified business profile.',
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Pousada Vista Azul')).not.toBeInTheDocument();
    expect(kpiValue('Approved')).toHaveTextContent('2');

    await user.click(tabButton(/^Approved \(2\)$/));
    const r = within(row('Pousada Vista Azul'));
    expect(r.getByText('Approved')).toBeInTheDocument();
    expect(r.getByRole('button', { name: 'View' })).toBeInTheDocument();
  });

  it('Reject toasts and moves the row to Rejected, recording the reason', async () => {
    await renderLoaded();
    const { user, drawer } = await openDrawerFor('Trilhas do Sul Turismo');
    await user.click(within(drawer).getByRole('button', { name: 'Reject' }));
    const dialog = screen.getByRole('dialog', { name: 'Reject business account' });
    await user.selectOptions(within(dialog).getByRole('combobox'), 'Tax ID could not be validated');
    await user.type(within(dialog).getByRole('textbox'), 'CNPJ is inactive.');
    await user.click(within(dialog).getByRole('button', { name: 'Reject and send email' }));

    await screen.findByRole('button', { name: /^Rejected \(2\)$/ });
    expect(toast.error).toHaveBeenCalledWith('Request rejected', {
      description:
        'Trilhas do Sul Turismo was rejected — tax id could not be validated. Email sent to diego@trilhasdosul.com.',
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Trilhas do Sul Turismo')).not.toBeInTheDocument();

    await user.click(tabButton(/^Rejected \(2\)$/));
    expect(within(row('Trilhas do Sul Turismo')).getByText('Rejected')).toBeInTheDocument();
  });

  it('shows a translated toast and reloads the list when the account was already reviewed (409)', async () => {
    const user = userEvent.setup();
    await renderLoaded();
    const { drawer } = await openDrawerFor('Pousada Vista Azul');
    await user.click(within(drawer).getByRole('button', { name: 'Approve' }));

    fetchMock.mockImplementationOnce((url, init) => {
      const href = String(url);
      if (href.includes('/approve') && init?.method === 'POST') {
        return Promise.resolve(jsonResponse(409, { error: 'stale' }));
      }
      return defaultFetchImpl(url, init);
    });
    await user.click(screen.getByRole('button', { name: 'Approve account' }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Could not Approve', {
        description: 'This business account was already reviewed by someone else.',
      }),
    );
    // The list reloads after the conflict, since another admin already decided this row —
    // still Pending here because the mocked backend state was never actually mutated.
    expect(
      fetchMock.mock.calls.filter(([u]) => String(u).endsWith('/api/admin/business-accounts')),
    ).toHaveLength(2);
  });

  it('shows a "no email on file" description when rejecting a requester with no email', async () => {
    const user = userEvent.setup();
    state.find((r) => r.businessName === 'Trilhas do Sul Turismo')!.requesterEmail = null;
    await renderLoaded();

    const { drawer } = await openDrawerFor('Trilhas do Sul Turismo');
    await user.click(within(drawer).getByRole('button', { name: 'Reject' }));
    const dialog = screen.getByRole('dialog', { name: 'Reject business account' });
    await user.click(within(dialog).getByRole('button', { name: 'Reject and send email' }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Request rejected', {
        description:
          "Trilhas do Sul Turismo was rejected — documents don't match the company. No email on file, so the requester was not notified.",
      }),
    );
  });
});
