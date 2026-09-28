import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';

import enUS from '@/locales/enUS.json';
import esES from '@/locales/esES.json';
import ptBR from '@/locales/ptBR.json';

import ReportedContentPage from '../page';

// The Toaster is mounted by AdminShell, not by this page, so toasts would be silent here
// anyway; mocking lets us assert the page actually fires them.
jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

// The test setup initializes i18n with lng 'pt', so assertions below use the ptBR strings.

const QUEUE_TITLES = [
  'Beaches secretas do litoral norte da Bahia',
  'Comment on "Vale dos Vinhedos wineries"',
  'Duplicate profile suspected',
];
const REVIEWED_TITLES = [
  'Photo on list "Lisbon food itinerary"',
  'Comment on "A Family Weekend in Paraty"',
];

function tab(name: 'Fila' | 'Revisados') {
  return screen.getByRole('button', { name: new RegExp(`^${name}`) });
}

function expectCounts(queue: number, reviewed: number) {
  expect(within(tab('Fila')).getByText(String(queue))).toBeInTheDocument();
  expect(within(tab('Revisados')).getByText(String(reviewed))).toBeInTheDocument();
}

function queueRow(title: string) {
  const row = screen.getByText(title).closest('tr');
  if (!row) throw new Error(`No table row for "${title}"`);
  return row;
}

async function decide(title: string, action: 'Manter conteúdo' | 'Remover conteúdo') {
  const user = userEvent.setup();
  await user.click(within(queueRow(title)).getByRole('button', { name: 'Revisar' }));
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: action }));
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('admin.moderation page locale coverage', () => {
  // Page keys only; the drawer namespace has its own coverage test.
  const pageKeys = (m: Record<string, unknown>) =>
    Object.keys(m)
      .filter((k) => k !== 'drawer')
      .sort();
  const en = enUS.admin.moderation as Record<string, unknown>;

  it.each([
    ['ptBR', ptBR.admin.moderation as Record<string, unknown>],
    ['esES', esES.admin.moderation as Record<string, unknown>],
  ])('%s defines every enUS page key', (_, loc) => {
    expect(pageKeys(loc)).toEqual(pageKeys(en));
    for (const key of pageKeys(en)) expect(loc[key]).toBeTruthy();
    // Spot-check that the headline strings are genuinely translated, not English copies.
    expect(loc.title).not.toBe(en.title);
    expect(loc.subtitle).not.toBe(en.subtitle);
  });
});

describe('ReportedContentPage', () => {
  it('renders the header', () => {
    render(<ReportedContentPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Conteúdo denunciado' })).toBeVisible();
  });

  it('renders the 3 seeded queue items with their severity badges by default', () => {
    render(<ReportedContentPage />);
    for (const title of QUEUE_TITLES) expect(screen.getByText(title)).toBeInTheDocument();
    expect(within(queueRow(QUEUE_TITLES[0])).getByText('High')).toBeInTheDocument();
    expect(within(queueRow(QUEUE_TITLES[1])).getByText('Average')).toBeInTheDocument();
    expect(within(queueRow(QUEUE_TITLES[2])).getByText('Low')).toBeInTheDocument();
    // Kind subtitle + account cell.
    expect(within(queueRow(QUEUE_TITLES[0])).getByText('Travel list')).toBeInTheDocument();
    expect(within(queueRow(QUEUE_TITLES[0])).getByText('Marina Alves')).toBeInTheDocument();
    expect(within(queueRow(QUEUE_TITLES[0])).getByText('@marina.alves')).toBeInTheDocument();
    expect(within(queueRow(QUEUE_TITLES[0])).getByText('MA')).toBeInTheDocument();
    // Reviewed table is not shown.
    for (const title of REVIEWED_TITLES) expect(screen.queryByText(title)).not.toBeInTheDocument();
  });

  it('shows singular and plural reporter counts', () => {
    render(<ReportedContentPage />);
    expect(within(queueRow(QUEUE_TITLES[0])).getByText('2 denúncias')).toBeInTheDocument();
    expect(within(queueRow(QUEUE_TITLES[1])).getByText('3 denúncias')).toBeInTheDocument();
    expect(within(queueRow(QUEUE_TITLES[2])).getByText('1 denúncia')).toBeInTheDocument();
  });

  it('shows the initial tab counts and switches between tables', async () => {
    const user = userEvent.setup();
    render(<ReportedContentPage />);
    expectCounts(3, 2);

    await user.click(tab('Revisados'));
    for (const title of REVIEWED_TITLES) expect(screen.getByText(title)).toBeInTheDocument();
    for (const title of QUEUE_TITLES) expect(screen.queryByText(title)).not.toBeInTheDocument();
    expect(screen.getByText('Removed')).toBeInTheDocument();
    expect(screen.getByText('Kept')).toBeInTheDocument();
    expect(screen.getByText('3 user reports')).toBeInTheDocument();
    expect(screen.getByText('Ana Martins')).toBeInTheDocument();
    expect(screen.getByText('19 Aug 2026, 16:40')).toBeInTheDocument();
    expectCounts(3, 2);

    await user.click(tab('Fila'));
    for (const title of QUEUE_TITLES) expect(screen.getByText(title)).toBeInTheDocument();
    for (const title of REVIEWED_TITLES) expect(screen.queryByText(title)).not.toBeInTheDocument();
  });

  it('opens the drawer with the item data from the Review button', async () => {
    const user = userEvent.setup();
    render(<ReportedContentPage />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(within(queueRow(QUEUE_TITLES[1])).getByRole('button', { name: 'Revisar' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Denúncia: Comment')).toBeInTheDocument();
    expect(within(dialog).getByText('Conteúdo denunciado')).toBeInTheDocument();
    expect(within(dialog).getByText(/comment flagged for offensive language/)).toBeInTheDocument();
  });

  it('opens the drawer when the row itself is clicked', async () => {
    const user = userEvent.setup();
    render(<ReportedContentPage />);
    await user.click(screen.getByText(QUEUE_TITLES[2]));
    expect(within(screen.getByRole('dialog')).getByText('Denúncia: Profile')).toBeInTheDocument();
  });

  it('keeping content moves the item from Queue to Reviewed', async () => {
    const user = userEvent.setup();
    render(<ReportedContentPage />);
    await decide(QUEUE_TITLES[0], 'Manter conteúdo');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText(QUEUE_TITLES[0])).not.toBeInTheDocument();
    expect(screen.getByText(QUEUE_TITLES[1])).toBeInTheDocument();
    expectCounts(2, 3);
    expect(toast.success).toHaveBeenCalledWith('Conteúdo mantido', {
      description: QUEUE_TITLES[0],
    });

    await user.click(tab('Revisados'));
    const row = queueRow(QUEUE_TITLES[0]);
    expect(within(row).getByText('Kept')).toBeInTheDocument();
    expect(within(row).getByText('Marina Alves')).toBeInTheDocument();
    expect(within(row).getByText('2 user reports')).toBeInTheDocument();
    expect(within(row).getByText('Ana Martins')).toBeInTheDocument();
    expect(within(row).getByText(/^\d{2} [A-Z][a-z]{2} \d{4}, \d{2}:\d{2}$/)).toBeInTheDocument();
    // Newest decision goes first.
    const bodyRows = screen.getAllByRole('row').slice(1);
    expect(bodyRows[0]).toBe(row);
  });

  it('removing content records a Removed decision with singular report label', async () => {
    const user = userEvent.setup();
    render(<ReportedContentPage />);
    await decide(QUEUE_TITLES[2], 'Remover conteúdo');

    expect(screen.queryByText(QUEUE_TITLES[2])).not.toBeInTheDocument();
    expectCounts(2, 3);
    expect(toast.error).toHaveBeenCalledWith('Conteúdo removido', {
      description: QUEUE_TITLES[2],
    });

    await user.click(tab('Revisados'));
    const row = queueRow(QUEUE_TITLES[2]);
    expect(within(row).getByText('Removed')).toBeInTheDocument();
    expect(within(row).getByText('1 user report')).toBeInTheDocument();
  });

  it('shows the empty state once every queue item is decided', async () => {
    render(<ReportedContentPage />);
    expect(screen.queryByText('A fila está vazia')).not.toBeInTheDocument();

    await decide(QUEUE_TITLES[0], 'Manter conteúdo');
    await decide(QUEUE_TITLES[1], 'Remover conteúdo');
    await decide(QUEUE_TITLES[2], 'Manter conteúdo');

    expect(screen.getByText('A fila está vazia')).toBeInTheDocument();
    expect(screen.getByText('Todas as denúncias foram revisadas.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expectCounts(0, 5);
  });
});
