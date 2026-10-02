import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';

import enUS from '@/locales/enUS.json';
import esES from '@/locales/esES.json';
import ptBR from '@/locales/ptBR.json';

import ReportedContentPage from '../page';

// The Toaster is mounted by AdminShell, not by this page, so toasts would be silent here
// anyway; mocking lets us assert the page actually fires them.
jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

// The test setup initializes i18n with lng 'pt', so assertions below use the ptBR strings.
// All fixture instants fall in August 2026, so every formatted date shares the same
// locale-formatted month ("de ago. de 2026") and only the day/time vary — and those vary
// with the test runner's local timezone, so assertions match the shape, not an exact clock time.
const DATE_RE = /^\d{2} de ago\. de 2026, \d{2}:\d{2}$/;

const QUEUE_TITLES = [
  'Beaches secretas do litoral norte da Bahia',
  'Comment on "Vale dos Vinhedos wineries"',
  'Duplicate profile suspected',
];
const REVIEWED_TITLES = [
  'Photo on list "Lisbon food itinerary"',
  'Comment on "A Family Weekend in Paraty"',
];

function queueItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'LIST:report-1',
    targetType: 'LIST',
    targetId: 'report-1',
    title: QUEUE_TITLES[0],
    excerpt: 'Includes exact GPS pins for a closed trail.',
    itemCount: 14,
    publishedAt: '2026-08-01T00:00:00.000Z',
    listTitle: null,
    venueCity: null,
    venueCountry: null,
    bio: null,
    profileCreatedAt: null,
    reason: 'inappropriate_content',
    severity: 'HIGH',
    owner: {
      name: 'Marina Alves',
      handle: '@marina.alves',
      accountType: 'BUSINESS',
      accountStatus: 'ACTIVE',
    },
    priorRemovals: 0,
    reporters: [
      {
        name: 'Beatriz Lima',
        handle: '@bia.lima',
        reason: 'inappropriate_content',
        details: 'Protected area exposed',
        reportedAt: '2026-08-12T09:14:00.000Z',
      },
      {
        name: 'Tiago Fonseca',
        handle: '@tiago.f',
        reason: 'inappropriate_content',
        details: 'Encourages illegal access',
        reportedAt: '2026-08-13T18:42:00.000Z',
      },
    ],
    ...overrides,
  };
}

const QUEUE_FIXTURE = [
  queueItem(),
  queueItem({
    id: 'PLACE_IN_LIST:report-2',
    targetType: 'PLACE_IN_LIST',
    targetId: 'report-2',
    title: QUEUE_TITLES[1],
    excerpt: null,
    itemCount: null,
    publishedAt: null,
    listTitle: 'Vale dos Vinhedos wineries',
    venueCity: 'Bento Gonçalves',
    venueCountry: 'BR',
    severity: 'AVERAGE',
    reason: 'spam_or_misleading',
    reporters: [
      {
        name: 'Automatic detection',
        handle: null,
        reason: 'spam_or_misleading',
        details: 'score 0.91',
        reportedAt: '2026-08-22T11:03:00.000Z',
      },
      {
        name: 'Beatriz Lima',
        handle: '@bia.lima',
        reason: 'inappropriate_content',
        details: null,
        reportedAt: '2026-08-22T12:20:00.000Z',
      },
      {
        name: 'Larissa Prado',
        handle: '@larissa.p',
        reason: 'spam_or_misleading',
        details: null,
        reportedAt: '2026-08-23T08:55:00.000Z',
      },
    ],
  }),
  queueItem({
    id: 'PROFILE:report-3',
    targetType: 'PROFILE',
    targetId: 'report-3',
    title: QUEUE_TITLES[2],
    excerpt: null,
    itemCount: null,
    publishedAt: null,
    bio: 'Traveler and photographer',
    profileCreatedAt: '2026-01-01T00:00:00.000Z',
    severity: 'LOW',
    reason: 'other',
    owner: {
      name: 'Rafael Nogueira',
      handle: '@rafael.n',
      accountType: 'INDIVIDUAL',
      accountStatus: 'INACTIVE',
    },
    reporters: [
      {
        name: 'Marina Alves',
        handle: '@marina.alves',
        reason: 'other',
        details: 'Impersonation / duplicate account',
        reportedAt: '2026-08-20T15:31:00.000Z',
      },
    ],
  }),
];

const REVIEWED_FIXTURE: Array<{
  id: string;
  title: string;
  owner: string;
  reportCount: number;
  decision: 'KEPT' | 'REMOVED';
  reviewedBy: string | null;
  reviewedAt: string;
}> = [
  {
    id: 'reviewed-1',
    title: REVIEWED_TITLES[0],
    owner: 'Larissa Prado',
    reportCount: 3,
    decision: 'REMOVED',
    reviewedBy: 'Ana Martins',
    reviewedAt: '2026-08-19T16:40:00.000Z',
  },
  {
    id: 'reviewed-2',
    title: REVIEWED_TITLES[1],
    owner: 'Eduardo Costa',
    reportCount: 1,
    decision: 'KEPT',
    reviewedBy: 'Lucas Pereira',
    reviewedAt: '2026-08-17T10:12:00.000Z',
  },
];

function jsonResponse(status: number, body: unknown): Pick<Response, 'ok' | 'status' | 'json'> {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) };
}

type FetchMock = jest.Mock<
  Promise<Pick<Response, 'ok' | 'status' | 'json'>>,
  [RequestInfo | URL, RequestInit?]
>;
let fetchMock: FetchMock;
let queueState: typeof QUEUE_FIXTURE;
let reviewedState: typeof REVIEWED_FIXTURE;

function defaultFetchImpl(url: RequestInfo | URL, init?: RequestInit) {
  const href = String(url);
  if (href.endsWith('/api/admin/moderation/reports') && (!init || init.method === undefined)) {
    return Promise.resolve(jsonResponse(200, { items: queueState, total: queueState.length }));
  }
  if (href.endsWith('/api/admin/moderation/reviewed')) {
    return Promise.resolve(jsonResponse(200, { items: reviewedState }));
  }
  if (href.includes('/decision') && init?.method === 'POST') {
    const body = JSON.parse(String(init.body)) as { decision: 'KEPT' | 'REMOVED' };
    // reviewedBy is intentionally absent from the request: there's no admin-identity concept
    // yet, and the client must not fabricate a reviewer name (see MER-796 PR #5's review).
    expect(body).not.toHaveProperty('reviewedBy');
    const match = href.match(/reports\/([A-Z_]+)\/([^/]+)\/decision/);
    const [, targetType, targetId] = match ?? [];
    const decided = queueState.find((q) => q.targetType === targetType && q.targetId === targetId);
    if (!decided) return Promise.resolve(jsonResponse(404, { error: 'not found' }));
    queueState = queueState.filter((q) => q !== decided);
    reviewedState = [
      {
        id: decided.id,
        title: decided.title,
        owner: decided.owner!.name,
        reportCount: decided.reporters.length,
        decision: body.decision,
        reviewedBy: null,
        reviewedAt: new Date().toISOString(),
      },
      ...reviewedState,
    ];
    return Promise.resolve(jsonResponse(204, null));
  }
  return Promise.reject(new Error(`unexpected fetch: ${href}`));
}

beforeEach(() => {
  jest.clearAllMocks();
  queueState = QUEUE_FIXTURE.map((item) => ({ ...item, reporters: [...item.reporters] }));
  reviewedState = [...REVIEWED_FIXTURE];
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
  render(<ReportedContentPage />);
  await screen.findByText(QUEUE_TITLES[0]);
}

function tab(name: 'Fila' | 'Revisados') {
  return screen.getByRole('tab', { name: new RegExp(`^${name}`) });
}

function expectCounts(queue: number, reviewed: number) {
  expect(within(tab('Fila')).getByText(String(queue))).toBeInTheDocument();
  expect(within(tab('Revisados')).getByText(String(reviewed))).toBeInTheDocument();
}

function queueRow(title: string) {
  // While the drawer for this same item is open, its title also renders in the drawer's
  // header and cover banner — pick the match that's actually inside a table row.
  const row = screen
    .getAllByText(title)
    .map((el) => el.closest('tr'))
    .find((el): el is HTMLTableRowElement => el !== null);
  if (!row) throw new Error(`No table row for "${title}"`);
  return row;
}

async function decide(title: string, action: 'Manter conteúdo' | 'Remover conteúdo') {
  const user = userEvent.setup();
  await user.click(within(queueRow(title)).getByRole('button', { name: 'Revisar' }));
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: action }));
  if (action === 'Remover conteúdo') {
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Sim, remover' }),
    );
  }
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
}

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
  it('shows a loading state until the queue and reviewed lists arrive', async () => {
    render(<ReportedContentPage />);
    expect(screen.getByRole('status')).toHaveTextContent(/carregando/i);
    await screen.findByText(QUEUE_TITLES[0]);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders the header', async () => {
    await renderLoaded();
    expect(screen.getByRole('heading', { level: 1, name: 'Conteúdo denunciado' })).toBeVisible();
  });

  it('renders the 3 fetched queue items with their severity badges by default', async () => {
    await renderLoaded();
    for (const title of QUEUE_TITLES) expect(screen.getByText(title)).toBeInTheDocument();
    expect(within(queueRow(QUEUE_TITLES[0])).getByText('Alta')).toBeInTheDocument();
    expect(within(queueRow(QUEUE_TITLES[1])).getByText('Média')).toBeInTheDocument();
    expect(within(queueRow(QUEUE_TITLES[2])).getByText('Baixa')).toBeInTheDocument();
    expect(within(queueRow(QUEUE_TITLES[0])).getByText('Lista de viagem')).toBeInTheDocument();
    expect(within(queueRow(QUEUE_TITLES[0])).getByText('Marina Alves')).toBeInTheDocument();
    expect(within(queueRow(QUEUE_TITLES[0])).getByText('@marina.alves')).toBeInTheDocument();
    expect(within(queueRow(QUEUE_TITLES[0])).getByText('MA')).toBeInTheDocument();
    for (const title of REVIEWED_TITLES) expect(screen.queryByText(title)).not.toBeInTheDocument();
  });

  it('shows singular and plural reporter counts', async () => {
    await renderLoaded();
    expect(within(queueRow(QUEUE_TITLES[0])).getByText('2 denúncias')).toBeInTheDocument();
    expect(within(queueRow(QUEUE_TITLES[1])).getByText('3 denúncias')).toBeInTheDocument();
    expect(within(queueRow(QUEUE_TITLES[2])).getByText('1 denúncia')).toBeInTheDocument();
  });

  it('shows the initial tab counts and switches between tables', async () => {
    const user = userEvent.setup();
    await renderLoaded();
    expectCounts(3, 2);

    await user.click(tab('Revisados'));
    for (const title of REVIEWED_TITLES) expect(screen.getByText(title)).toBeInTheDocument();
    for (const title of QUEUE_TITLES) expect(screen.queryByText(title)).not.toBeInTheDocument();
    expect(screen.getByText('Removido')).toBeInTheDocument();
    expect(screen.getByText('Mantido')).toBeInTheDocument();
    expect(screen.getByText('3 denúncias')).toBeInTheDocument();
    expect(screen.getByText('Ana Martins')).toBeInTheDocument();
    expect(screen.getAllByText(DATE_RE)).toHaveLength(2);
    expectCounts(3, 2);

    await user.click(tab('Fila'));
    for (const title of QUEUE_TITLES) expect(screen.getByText(title)).toBeInTheDocument();
    for (const title of REVIEWED_TITLES) expect(screen.queryByText(title)).not.toBeInTheDocument();
  });

  it('opens the drawer with the item data from the Review button', async () => {
    const user = userEvent.setup();
    await renderLoaded();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(within(queueRow(QUEUE_TITLES[1])).getByRole('button', { name: 'Revisar' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Denúncia: Lugar')).toBeInTheDocument();
    expect(within(dialog).getByText('Conteúdo denunciado')).toBeInTheDocument();
  });

  it('opens the drawer when the row itself is clicked', async () => {
    const user = userEvent.setup();
    await renderLoaded();
    await user.click(screen.getByText(QUEUE_TITLES[2]));
    expect(within(screen.getByRole('dialog')).getByText('Denúncia: Perfil')).toBeInTheDocument();
  });

  it('keeping content moves the item from Queue to Reviewed', async () => {
    const user = userEvent.setup();
    await renderLoaded();
    await decide(QUEUE_TITLES[0], 'Manter conteúdo');

    expect(screen.queryByText(QUEUE_TITLES[0])).not.toBeInTheDocument();
    expect(screen.getByText(QUEUE_TITLES[1])).toBeInTheDocument();
    expectCounts(2, 3);
    expect(toast.success).toHaveBeenCalledWith('Conteúdo mantido', {
      description: QUEUE_TITLES[0],
    });

    await user.click(tab('Revisados'));
    const row = queueRow(QUEUE_TITLES[0]);
    expect(within(row).getByText('Mantido')).toBeInTheDocument();
    expect(within(row).getByText('Marina Alves')).toBeInTheDocument();
    expect(within(row).getByText('2 denúncias')).toBeInTheDocument();
  });

  it('removing content requires confirmation and records a Removed decision', async () => {
    const user = userEvent.setup();
    await renderLoaded();
    await decide(QUEUE_TITLES[2], 'Remover conteúdo');

    expect(screen.queryByText(QUEUE_TITLES[2])).not.toBeInTheDocument();
    expectCounts(2, 3);
    expect(toast.error).toHaveBeenCalledWith('Conteúdo removido', {
      description: QUEUE_TITLES[2],
    });

    await user.click(tab('Revisados'));
    const row = queueRow(QUEUE_TITLES[2]);
    expect(within(row).getByText('Removido')).toBeInTheDocument();
    expect(within(row).getByText('1 denúncia')).toBeInTheDocument();
  });

  it('cancelling the remove confirmation keeps the item in the queue', async () => {
    const user = userEvent.setup();
    await renderLoaded();
    await user.click(within(queueRow(QUEUE_TITLES[0])).getByRole('button', { name: 'Revisar' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Remover conteúdo' }),
    );
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }),
    );

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // The title appears in the queue row plus twice inside the still-open drawer (the
    // header description and the cover block), proving neither closed. (Counts aren't
    // re-checked here: the drawer's open Sheet marks the rest of the page aria-hidden,
    // so the tabs are correctly unreachable by role while it's open.)
    expect(screen.getAllByText(QUEUE_TITLES[0])).toHaveLength(3);
  });

  it('shows the empty state once every queue item is decided', async () => {
    await renderLoaded();
    expect(screen.queryByText('A fila está vazia')).not.toBeInTheDocument();

    await decide(QUEUE_TITLES[0], 'Manter conteúdo');
    await decide(QUEUE_TITLES[1], 'Remover conteúdo');
    await decide(QUEUE_TITLES[2], 'Manter conteúdo');

    expect(screen.getByText('A fila está vazia')).toBeInTheDocument();
    expect(screen.getByText('Todas as denúncias foram revisadas.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expectCounts(0, 5);
  });

  it('shows an error state with retry when the queue fails to load', async () => {
    fetchMock.mockImplementation((url) => {
      if (String(url).endsWith('/api/admin/moderation/reports')) {
        return Promise.resolve(jsonResponse(502, { error: 'boom' }));
      }
      return defaultFetchImpl(url);
    });
    const user = userEvent.setup();
    render(<ReportedContentPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível carregar/i);

    fetchMock.mockImplementation(defaultFetchImpl);
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await screen.findByText(QUEUE_TITLES[0]);
  });

  it('shows a decision-recorded toast but a distinct refresh-failed toast when the post-decision refetch fails', async () => {
    const user = userEvent.setup();
    await renderLoaded();

    let decisionPosted = false;
    fetchMock.mockImplementation((url, init) => {
      const href = String(url);
      if (href.includes('/decision') && init?.method === 'POST') {
        decisionPosted = true;
        return Promise.resolve(jsonResponse(204, null));
      }
      if (decisionPosted) return Promise.resolve(jsonResponse(502, { error: 'boom' }));
      return defaultFetchImpl(url, init);
    });

    await user.click(within(queueRow(QUEUE_TITLES[0])).getByRole('button', { name: 'Revisar' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Manter conteúdo' }),
    );

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Conteúdo mantido', {
        description: QUEUE_TITLES[0],
      }),
    );
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Decisão registrada, mas não foi possível atualizar as listas — recarregue a página para ver o estado mais recente.',
        { description: QUEUE_TITLES[0] },
      ),
    );
  });

  it('keeps the drawer open and lets the admin retry when the decision request itself fails', async () => {
    const user = userEvent.setup();
    await renderLoaded();

    fetchMock.mockImplementation((url, init) => {
      const href = String(url);
      if (href.includes('/decision') && init?.method === 'POST') {
        return Promise.resolve(jsonResponse(500, { error: 'boom' }));
      }
      return defaultFetchImpl(url, init);
    });

    await user.click(within(queueRow(QUEUE_TITLES[0])).getByRole('button', { name: 'Revisar' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Manter conteúdo' }),
    );

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Não foi possível registrar a decisão', {
        description: QUEUE_TITLES[0],
      }),
    );
    // Unlike a successful decision, the drawer stays open (it never remounts and loses its
    // busy guard) and the buttons are re-enabled so the admin can retry.
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Manter conteúdo' }),
    ).not.toBeDisabled();
    expect(screen.getAllByText(QUEUE_TITLES[0]).length).toBeGreaterThan(0);
  });

  it('disables the row while its decision is in flight, re-enabling it once settled', async () => {
    const user = userEvent.setup();
    await renderLoaded();

    let resolveDecision!: () => void;
    fetchMock.mockImplementation((url, init) => {
      const href = String(url);
      if (href.includes('/decision') && init?.method === 'POST') {
        return new Promise((resolve) => {
          resolveDecision = () => {
            // Mirror what the real upstream does on a KEPT decision, so the refetch this
            // triggers actually reflects the item moving out of the queue.
            const decided = queueState.find((q) => q.title === QUEUE_TITLES[0]);
            queueState = queueState.filter((q) => q.title !== QUEUE_TITLES[0]);
            if (decided) {
              reviewedState = [
                {
                  id: decided.id,
                  title: decided.title,
                  owner: decided.owner!.name,
                  reportCount: decided.reporters.length,
                  decision: 'KEPT',
                  reviewedBy: null,
                  reviewedAt: new Date().toISOString(),
                },
                ...reviewedState,
              ];
            }
            resolve(jsonResponse(204, null));
          };
        });
      }
      return defaultFetchImpl(url, init);
    });

    await user.click(within(queueRow(QUEUE_TITLES[0])).getByRole('button', { name: 'Revisar' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Manter conteúdo' }),
    );

    // The row sits behind the still-open drawer's modal overlay (aria-hidden), so the
    // disabled check needs `hidden: true` to reach it the same way an assistive tech user
    // couldn't, but a direct DOM assertion still can.
    await waitFor(() =>
      expect(
        within(queueRow(QUEUE_TITLES[0])).getByRole('button', { name: 'Revisar', hidden: true }),
      ).toBeDisabled(),
    );

    resolveDecision();
    await waitFor(() => expect(screen.queryByText(QUEUE_TITLES[0])).not.toBeInTheDocument());
  });

  it('shows an "already resolved" toast and refreshes the queue when the decision 404s', async () => {
    const user = userEvent.setup();
    await renderLoaded();

    fetchMock.mockImplementation((url, init) => {
      const href = String(url);
      if (href.includes('/decision') && init?.method === 'POST') {
        // Someone else already resolved this report between page load and this click.
        queueState = queueState.filter((q) => q.title !== QUEUE_TITLES[0]);
        return Promise.resolve(jsonResponse(404, { error: 'No pending reports found' }));
      }
      return defaultFetchImpl(url, init);
    });

    await user.click(within(queueRow(QUEUE_TITLES[0])).getByRole('button', { name: 'Revisar' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Manter conteúdo' }),
    );

    await waitFor(() =>
      expect(toast.info).toHaveBeenCalledWith('Já foi resolvido por outra pessoa', {
        description: QUEUE_TITLES[0],
      }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByText(QUEUE_TITLES[0])).not.toBeInTheDocument();
  });
});
