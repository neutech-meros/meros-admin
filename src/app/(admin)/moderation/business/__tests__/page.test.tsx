import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';

import i18n from '@/i18n';
import { getBusinessAccountRequests } from '@/lib/mocks/admin/businessAccounts';
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

beforeEach(() => {
  jest.clearAllMocks();
});

const SEED = getBusinessAccountRequests();
const namesWith = (status: string) => SEED.filter((r) => r.status === status).map((r) => r.name);
const PENDING = namesWith('Pending');
const MORE_INFO = namesWith('More info');
const APPROVED = namesWith('Approved');
const REJECTED = namesWith('Rejected');
const ALL = SEED.map((r) => r.name);

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
  it('renders the header title and subtitle', () => {
    render(<BusinessAccountsPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Business accounts' })).toBeVisible();
    expect(
      screen.getByText(
        'Every business account request lands here for document review and approval.',
      ),
    ).toBeInTheDocument();
  });

  it('renders the 4 KPI cards with the seed counts', () => {
    render(<BusinessAccountsPage />);
    expect(kpiValue('Pending review')).toHaveTextContent(String(PENDING.length));
    expect(kpiValue('Waiting on documents')).toHaveTextContent(String(MORE_INFO.length));
    expect(kpiValue('Approved (30d)')).toHaveTextContent(String(APPROVED.length));
    expect(kpiValue('Rejected (30d)')).toHaveTextContent(String(REJECTED.length));
    // Sanity check against the known seed so a silent seed change can't mask a bug.
    expect([PENDING.length, MORE_INFO.length, APPROVED.length, REJECTED.length]).toEqual([
      2, 1, 2, 1,
    ]);
  });

  it('renders the 4 tabs with live counts, Pending active by default', () => {
    render(<BusinessAccountsPage />);
    const pending = tabButton(/^Pending \(2\)$/);
    expectActiveTab(pending, true);
    expectActiveTab(tabButton(/^Approved \(2\)$/), false);
    expectActiveTab(tabButton(/^Rejected \(1\)$/), false);
    expectActiveTab(tabButton(/^All requests$/), false);
    expect(tabButton(/^Rejected \(1\)$/)).toBeInTheDocument();
    expect(tabButton(/^All requests$/)).toBeInTheDocument();
    // No dedicated "More info" tab.
    expect(screen.queryByRole('button', { name: /^More info/ })).not.toBeInTheDocument();
    expect(visibleBusinessNames()).toEqual(PENDING);
  });

  it('filters the table when switching tabs', async () => {
    const user = userEvent.setup();
    render(<BusinessAccountsPage />);

    await user.click(tabButton(/^Approved \(2\)$/));
    expect(visibleBusinessNames()).toEqual(APPROVED);
    expectActiveTab(tabButton(/^Approved \(2\)$/), true);
    expectActiveTab(tabButton(/^Pending \(2\)$/), false);

    await user.click(tabButton(/^Rejected \(1\)$/));
    expect(visibleBusinessNames()).toEqual(REJECTED);

    await user.click(tabButton(/^All requests$/));
    expect(visibleBusinessNames()).toEqual(ALL);
    expect(screen.getByText(MORE_INFO[0])).toBeInTheDocument();
    expectActiveTab(tabButton(/^All requests$/), true);

    await user.click(tabButton(/^Pending \(2\)$/));
    expect(visibleBusinessNames()).toEqual(PENDING);
  });

  it('renders the column headers and each column of a row', async () => {
    const user = userEvent.setup();
    render(<BusinessAccountsPage />);
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
    render(<BusinessAccountsPage />);
    expect(screen.queryByText('No requests in this status')).not.toBeInTheDocument();

    // Empty the Pending tab by approving both of its rows.
    for (const name of PENDING) {
      const { drawer } = await openDrawerFor(name);
      await user.click(within(drawer).getByRole('button', { name: 'Approve' }));
    }
    expect(tabButton(/^Pending \(0\)$/)).toBeInTheDocument();
    expect(screen.getByText('No requests in this status')).toBeInTheDocument();
    expect(
      screen.getByText('Switch tabs to see requests in another review stage.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('opens the drawer for the clicked row via the button or the row itself', async () => {
    const user = userEvent.setup();
    render(<BusinessAccountsPage />);
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
    render(<BusinessAccountsPage />);
    const { user, drawer } = await openDrawerFor('Trilhas do Sul Turismo');
    await user.click(within(drawer).getByRole('button', { name: 'Request info' }));

    expect(toast.info).toHaveBeenCalledWith('Information requested', {
      description: 'Diego Ramos was notified about the missing documents.',
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(tabButton(/^Pending \(2\)$/)).toBeInTheDocument();
    expect(within(row('Trilhas do Sul Turismo')).getByText('Pending')).toBeInTheDocument();
    expect(kpiValue('Pending review')).toHaveTextContent('2');
  });

  it('Approve toasts and moves the row to Approved', async () => {
    render(<BusinessAccountsPage />);
    const { user, drawer } = await openDrawerFor('Pousada Vista Azul');
    await user.click(within(drawer).getByRole('button', { name: 'Approve' }));

    expect(toast.success).toHaveBeenCalledWith('Business account approved', {
      description: 'Pousada Vista Azul now has a verified business profile.',
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Pousada Vista Azul')).not.toBeInTheDocument();
    expect(kpiValue('Pending review')).toHaveTextContent('1');
    expect(kpiValue('Approved (30d)')).toHaveTextContent('3');

    await user.click(tabButton(/^Approved \(3\)$/));
    const r = within(row('Pousada Vista Azul'));
    expect(r.getByText('Approved')).toBeInTheDocument();
    expect(r.getByRole('button', { name: 'View' })).toBeInTheDocument();
    expect(tabButton(/^Pending \(1\)$/)).toBeInTheDocument();
  });

  it('Reject toasts and moves the row to Rejected, recording the reason', async () => {
    render(<BusinessAccountsPage />);
    const { user, drawer } = await openDrawerFor('Trilhas do Sul Turismo');
    await user.click(within(drawer).getByRole('button', { name: 'Reject' }));
    const dialog = screen.getByRole('dialog', { name: 'Reject business account' });
    await user.selectOptions(within(dialog).getByRole('combobox'), 'Tax ID could not be validated');
    await user.type(within(dialog).getByRole('textbox'), 'CNPJ is inactive.');
    await user.click(within(dialog).getByRole('button', { name: 'Reject and send email' }));

    expect(toast.error).toHaveBeenCalledWith('Request rejected', {
      description:
        'Trilhas do Sul Turismo was rejected — tax id could not be validated. Email sent to diego@trilhasdosul.com.',
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Trilhas do Sul Turismo')).not.toBeInTheDocument();
    expect(kpiValue('Rejected (30d)')).toHaveTextContent('2');

    await user.click(tabButton(/^Rejected \(2\)$/));
    expect(within(row('Trilhas do Sul Turismo')).getByText('Rejected')).toBeInTheDocument();

    // The rejection reason and details are kept on the row, visible in its drawer.
    await user.click(within(row('Trilhas do Sul Turismo')).getByRole('button', { name: 'View' }));
    const reopened = screen.getByRole('dialog', { name: 'Trilhas do Sul Turismo' });
    expect(
      within(reopened).getByText('Tax ID could not be validated — CNPJ is inactive.'),
    ).toBeInTheDocument();
  });
});
