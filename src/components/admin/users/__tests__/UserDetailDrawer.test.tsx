import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import i18n from '@/i18n';
import type { UserRecord } from '@/lib/mocks/admin/users';

import { UserDetailDrawer } from '../UserDetailDrawer';

type FetchResult = Pick<Response, 'ok' | 'status' | 'json'>;
type RouteHandler = () => Promise<FetchResult>;

function jsonResponse(status: number, body: unknown): FetchResult {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) };
}

// Responses settle on a macrotask (like a real network round-trip), so a test
// that finishes synchronously leaves them for the act()-wrapped flush below.
function nextTick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function respond(status: number, body: unknown): RouteHandler {
  return () => nextTick().then(() => jsonResponse(status, body));
}

interface DetailRoutes {
  resetLogs: RouteHandler;
  events: RouteHandler;
  subscription: RouteHandler;
  cancellations: RouteHandler;
  deactivations: RouteHandler;
}

const EMPTY_ROUTES: DetailRoutes = {
  resetLogs: respond(200, { items: [] }),
  events: respond(200, { items: [] }),
  subscription: respond(200, { subscription: null }),
  cancellations: respond(200, { items: [] }),
  deactivations: respond(200, { items: [] }),
};

let fetchMock: jest.Mock<Promise<FetchResult>, [string]>;

function mockDetailRoutes(overrides: Partial<DetailRoutes> = {}) {
  const routes = { ...EMPTY_ROUTES, ...overrides };
  fetchMock.mockImplementation((url) => {
    if (url.endsWith('/password-reset-logs')) return routes.resetLogs();
    if (url.endsWith('/subscription-events')) return routes.events();
    if (url.endsWith('/subscription')) return routes.subscription();
    if (url.endsWith('/plan-cancellations')) return routes.cancellations();
    if (url.endsWith('/deactivation-history')) return routes.deactivations();
    return Promise.reject(new Error(`unexpected fetch: ${url}`));
  });
}

beforeEach(() => {
  fetchMock = jest.fn();
  mockDetailRoutes();
  Object.defineProperty(globalThis, 'fetch', {
    value: fetchMock,
    configurable: true,
    writable: true,
  });
});

afterEach(async () => {
  // Let any in-flight detail requests settle inside act() before RTL unmounts.
  await act(nextTick);
  Reflect.deleteProperty(globalThis, 'fetch');
});

const user: UserRecord = {
  id: 'u1',
  name: 'Camila Duarte',
  email: 'camila@mail.com',
  phone: '+55 21 98888-1234',
  location: 'Rio de Janeiro, RJ',
  bio: 'Travel creator.',
  account: 'Business',
  plan: 'Premium',
  followers: '48.3k',
  following: '210',
  joined: '12/03/2025',
  status: 'Active',
  type: 'Creator',
  initials: 'CD',
  avatarColor: '#7F00FF',
};

describe('UserDetailDrawer', () => {
  it('renders nothing reachable when user is null', () => {
    render(<UserDetailDrawer user={null} onClose={jest.fn()} onSaveProfile={jest.fn()} />);
    expect(screen.queryByText('Camila Duarte')).not.toBeInTheDocument();
  });

  it('shows the Profile tab by default with contact/account info', () => {
    render(<UserDetailDrawer user={user} onClose={jest.fn()} onSaveProfile={jest.fn()} />);
    // Name and email legitimately render twice — once in the header's
    // condensed identity summary, once in the Contact section's detailed
    // field list — so we pin the exact count instead of just "at least
    // one match" (which would also pass if the Contact row were removed).
    expect(screen.getAllByText('Camila Duarte')).toHaveLength(2);
    expect(screen.getAllByText('camila@mail.com')).toHaveLength(2);
    expect(screen.getByText('Rio de Janeiro, RJ')).toBeInTheDocument();
    expect(screen.getByText('Travel creator.')).toBeInTheDocument();
  });

  it('renders the role and status badges translated, not as the raw enum value', () => {
    render(<UserDetailDrawer user={user} onClose={jest.fn()} onSaveProfile={jest.fn()} />);
    // Header badge (role) + stats bar (status), both on the default Profile tab; each also
    // repeats elsewhere on the page (account-type row, status row), so assert presence
    // rather than a single match.
    expect(screen.getAllByText('Criador').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ativo').length).toBeGreaterThan(0);
    expect(screen.queryByText('Creator')).not.toBeInTheDocument();
    expect(screen.queryByText('Active')).not.toBeInTheDocument();
  });

  it('switches to the Subscriptions tab and shows its content', async () => {
    const uiUser = userEvent.setup();
    render(<UserDetailDrawer user={user} onClose={jest.fn()} onSaveProfile={jest.fn()} />);
    // "R$ 39,90/mo" only appears inside the Subscriptions tab's content (the
    // stats bar also shows "Premium", so asserting on that alone wouldn't
    // prove the tab actually switched — it's visible before any click too).
    expect(screen.queryByText('R$ 39,90/mo')).not.toBeInTheDocument();
    await uiUser.click(screen.getByRole('tab', { name: 'Assinaturas' }));
    expect(screen.getByText('R$ 39,90/mo')).toBeInTheDocument();
  });

  it('switches to the Reports tab and shows the empty state for a user with no reports', async () => {
    const uiUser = userEvent.setup();
    render(<UserDetailDrawer user={user} onClose={jest.fn()} onSaveProfile={jest.fn()} />);
    await uiUser.click(screen.getByRole('tab', { name: 'Denúncias' }));
    expect(screen.getByText('Nenhuma denúncia')).toBeInTheDocument();
  });

  describe('History tab for a real account with no seeded mock history', () => {
    const realUser: UserRecord = {
      ...user,
      id: 'real-account-id',
      createdAtIso: '2025-03-12T10:00:00.000Z',
    };

    afterEach(async () => {
      await act(() => i18n.changeLanguage('pt'));
    });

    it('shows a translated "Account created" entry with the Intl-formatted date', async () => {
      const uiUser = userEvent.setup();
      render(<UserDetailDrawer user={realUser} onClose={jest.fn()} onSaveProfile={jest.fn()} />);
      await uiUser.click(screen.getByRole('tab', { name: 'Histórico' }));
      expect(screen.getByText('Conta criada')).toBeInTheDocument();
      expect(screen.getByText('12 de mar. de 2025')).toBeInTheDocument();
    });

    it('follows the UI language for both the title and the date format', async () => {
      await act(() => i18n.changeLanguage('en'));
      const uiUser = userEvent.setup();
      render(<UserDetailDrawer user={realUser} onClose={jest.fn()} onSaveProfile={jest.fn()} />);
      await uiUser.click(screen.getByRole('tab', { name: 'History' }));
      expect(screen.getByText('Account created')).toBeInTheDocument();
      expect(screen.getByText('Mar 12, 2025')).toBeInTheDocument();
    });

    it('shows no synthetic entry for an account without createdAtIso', async () => {
      const uiUser = userEvent.setup();
      const withoutIso: UserRecord = { ...realUser };
      delete withoutIso.createdAtIso;
      render(<UserDetailDrawer user={withoutIso} onClose={jest.fn()} onSaveProfile={jest.fn()} />);
      await uiUser.click(screen.getByRole('tab', { name: 'Histórico' }));
      expect(screen.queryByText('Conta criada')).not.toBeInTheDocument();
    });
  });

  it('shows "—" in the plan/followers/following stat tiles and the account plan row for a real account', () => {
    render(
      <UserDetailDrawer
        user={{ ...user, id: 'real-1', plan: null, followers: '—', following: '—' }}
        onClose={jest.fn()}
        onSaveProfile={jest.fn()}
      />,
    );
    expect(screen.getAllByText('—')).toHaveLength(4);
    expect(screen.queryByText('Premium')).not.toBeInTheDocument();
  });

  it('keeps showing the seeded mock history for a seeded user', async () => {
    const uiUser = userEvent.setup();
    render(
      <UserDetailDrawer
        user={{ ...user, createdAtIso: '2025-03-12T10:00:00.000Z' }}
        onClose={jest.fn()}
        onSaveProfile={jest.fn()}
      />,
    );
    await uiUser.click(screen.getByRole('tab', { name: 'Histórico' }));
    expect(screen.getByText('Upgraded to Premium')).toBeInTheDocument();
    expect(screen.queryByText('Conta criada')).not.toBeInTheDocument();
  });

  it('enters edit mode and calls onSaveProfile with the edited draft', async () => {
    const uiUser = userEvent.setup();
    const onSaveProfile = jest.fn();
    render(<UserDetailDrawer user={user} onClose={jest.fn()} onSaveProfile={onSaveProfile} />);
    await uiUser.click(screen.getByRole('button', { name: /editar perfil/i }));
    const nameInput = screen.getByDisplayValue('Camila Duarte');
    await uiUser.clear(nameInput);
    await uiUser.type(nameInput, 'Camila D. Silva');
    await uiUser.click(screen.getByRole('button', { name: /salvar alterações/i }));
    expect(onSaveProfile).toHaveBeenCalledWith(
      user,
      expect.objectContaining({ name: 'Camila D. Silva' }),
    );
  });

  it('associates every edit-profile label with its field', async () => {
    const uiUser = userEvent.setup();
    render(<UserDetailDrawer user={user} onClose={jest.fn()} onSaveProfile={jest.fn()} />);
    await uiUser.click(screen.getByRole('button', { name: /editar perfil/i }));
    expect(screen.getByLabelText('Nome completo')).toHaveValue('Camila Duarte');
    expect(screen.getByLabelText('E-mail')).toHaveValue('camila@mail.com');
    expect(screen.getByLabelText('Telefone')).toHaveValue('+55 21 98888-1234');
    expect(screen.getByLabelText('Localização')).toHaveValue('Rio de Janeiro, RJ');
    expect(screen.getByLabelText('Bio')).toHaveValue('Travel creator.');
  });

  it('blocks saving with an empty name and shows a validation error', async () => {
    const uiUser = userEvent.setup();
    const onSaveProfile = jest.fn();
    render(<UserDetailDrawer user={user} onClose={jest.fn()} onSaveProfile={onSaveProfile} />);
    await uiUser.click(screen.getByRole('button', { name: /editar perfil/i }));
    await uiUser.clear(screen.getByLabelText('Nome completo'));
    await uiUser.type(screen.getByLabelText('Nome completo'), '   ');
    await uiUser.click(screen.getByRole('button', { name: /salvar alterações/i }));
    expect(await screen.findByText('Informe o nome completo.')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome completo')).toHaveAttribute('aria-invalid', 'true');
    expect(onSaveProfile).not.toHaveBeenCalled();
  });

  it('blocks saving with an invalid email and shows a validation error', async () => {
    const uiUser = userEvent.setup();
    const onSaveProfile = jest.fn();
    render(<UserDetailDrawer user={user} onClose={jest.fn()} onSaveProfile={onSaveProfile} />);
    await uiUser.click(screen.getByRole('button', { name: /editar perfil/i }));
    await uiUser.clear(screen.getByLabelText('E-mail'));
    await uiUser.type(screen.getByLabelText('E-mail'), 'camila@');
    await uiUser.click(screen.getByRole('button', { name: /salvar alterações/i }));
    expect(await screen.findByText('Informe um e-mail válido.')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true');
    expect(onSaveProfile).not.toHaveBeenCalled();
  });

  it('saves a valid name and email and leaves edit mode', async () => {
    const uiUser = userEvent.setup();
    const onSaveProfile = jest.fn();
    render(<UserDetailDrawer user={user} onClose={jest.fn()} onSaveProfile={onSaveProfile} />);
    await uiUser.click(screen.getByRole('button', { name: /editar perfil/i }));
    await uiUser.clear(screen.getByLabelText('E-mail'));
    await uiUser.type(screen.getByLabelText('E-mail'), 'camila.silva@mail.com');
    await uiUser.click(screen.getByRole('button', { name: /salvar alterações/i }));
    await waitFor(() =>
      expect(onSaveProfile).toHaveBeenCalledWith(user, {
        name: 'Camila Duarte',
        email: 'camila.silva@mail.com',
        phone: '+55 21 98888-1234',
        location: 'Rio de Janeiro, RJ',
        bio: 'Travel creator.',
      }),
    );
    expect(screen.queryByLabelText('Nome completo')).not.toBeInTheDocument();
  });

  it('links every tab to its tab panel via aria-controls', async () => {
    const uiUser = userEvent.setup();
    render(<UserDetailDrawer user={user} onClose={jest.fn()} onSaveProfile={jest.fn()} />);
    for (const name of ['Perfil', 'Assinaturas', 'Histórico', 'Denúncias']) {
      const tab = screen.getByRole('tab', { name });
      await uiUser.click(tab);
      const panel = screen.getByRole('tabpanel', { name });
      expect(tab).toHaveAttribute('aria-controls', panel.id);
      expect(panel.id).not.toBe('');
    }
  });

  it('moves between tabs with the arrow keys', async () => {
    const uiUser = userEvent.setup();
    render(<UserDetailDrawer user={user} onClose={jest.fn()} onSaveProfile={jest.fn()} />);
    screen.getByRole('tab', { name: 'Perfil' }).focus();
    await uiUser.keyboard('{ArrowRight}');
    const subscriptions = screen.getByRole('tab', { name: 'Assinaturas' });
    expect(subscriptions).toHaveFocus();
    expect(subscriptions).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('R$ 39,90/mo')).toBeInTheDocument();
    await uiUser.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Denúncias' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Nenhuma denúncia')).toBeInTheDocument();
  });

  it('describes the drawer without Radix accessibility warnings', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      render(<UserDetailDrawer user={user} onClose={jest.fn()} onSaveProfile={jest.fn()} />);
      expect(screen.getByRole('dialog')).toHaveAccessibleDescription('camila@mail.com');
      expect(warn).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
      error.mockRestore();
    }
  });

  it('resets to the Profile tab and exits edit mode when a different user is passed in', async () => {
    const uiUser = userEvent.setup();
    const { rerender } = render(
      <UserDetailDrawer user={user} onClose={jest.fn()} onSaveProfile={jest.fn()} />,
    );
    await uiUser.click(screen.getByRole('tab', { name: 'Assinaturas' }));
    const otherUser: UserRecord = { ...user, id: 'u2', name: 'Rafael Nogueira' };
    rerender(<UserDetailDrawer user={otherUser} onClose={jest.fn()} onSaveProfile={jest.fn()} />);
    // Back on the Profile tab by default for the new user — contact info
    // visible again. Name renders twice (header + Contact section), same
    // as in the "shows the Profile tab by default" test above; pin the
    // exact count so this fails loudly if the Contact row disappears.
    expect(screen.getAllByText('Rafael Nogueira')).toHaveLength(2);
    expect(screen.getByRole('tab', { name: 'Perfil' })).toHaveAttribute('aria-selected', 'true');
  });

  describe('real account details', () => {
    const realUser: UserRecord = {
      ...user,
      id: 'acc-real/1',
      plan: 'Premium',
      createdAtIso: '2025-03-12T10:00:00.000Z',
    };

    const realSubscription = {
      status: 'GRACE_PERIOD',
      period: 'MONTHLY',
      periodType: 'NORMAL',
      productId: 'com.meros.premium.monthly',
      subscriberSince: '2025-04-01T15:00:00.000Z',
      currentPeriodEnd: '2025-10-01T15:00:00.000Z',
      willRenew: true,
      fallbackPrice: '$7.00',
    };

    let consoleErrorMock: jest.SpyInstance<void, Parameters<typeof console.error>>;

    beforeEach(() => {
      consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorMock.mockRestore();
    });

    function renderRealUser(target: UserRecord = realUser) {
      return render(
        <UserDetailDrawer user={target} onClose={jest.fn()} onSaveProfile={jest.fn()} />,
      );
    }

    async function openTab(name: string) {
      await userEvent.setup().click(screen.getByRole('tab', { name }));
      return screen.getByRole('tabpanel', { name });
    }

    function timelineTitles(panel: HTMLElement): string[] {
      return Array.from(panel.querySelectorAll('.text-sm.font-medium')).map(
        (el) => el.textContent ?? '',
      );
    }

    it('requests the five same-origin detail routes with the encoded user id', async () => {
      renderRealUser();

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));
      expect(fetchMock.mock.calls.map(([url]) => url).sort()).toEqual([
        '/api/admin/users/acc-real%2F1/deactivation-history',
        '/api/admin/users/acc-real%2F1/password-reset-logs',
        '/api/admin/users/acc-real%2F1/plan-cancellations',
        '/api/admin/users/acc-real%2F1/subscription',
        '/api/admin/users/acc-real%2F1/subscription-events',
      ]);
    });

    it('shows a loading state in the History and Subscriptions tabs until the details load', async () => {
      fetchMock.mockImplementation(() => new Promise<FetchResult>(() => {}));
      renderRealUser();

      const history = await openTab('Histórico');
      expect(within(history).getByRole('status')).toHaveTextContent('Carregando...');
      expect(within(history).queryByText('Conta criada')).not.toBeInTheDocument();

      const subscriptions = await openTab('Assinaturas');
      expect(within(subscriptions).getByRole('status')).toHaveTextContent('Carregando...');
      expect(within(subscriptions).queryByText('Nenhuma assinatura ativa')).not.toBeInTheDocument();
    });

    it('merges account creation, successful password resets and plan changes oldest first', async () => {
      mockDetailRoutes({
        resetLogs: respond(200, {
          items: [
            {
              id: 'r1',
              ip: '203.0.113.7',
              outcome: 'SUCCESS',
              createdAt: '2025-06-01T15:00:00.000Z',
            },
          ],
        }),
        events: respond(200, {
          items: [
            {
              id: 'e3',
              type: 'PRODUCT_CHANGE',
              previousProductId: 'com.meros.premium.monthly',
              newProductId: 'com.meros.pro.legacy',
              createdAt: '2025-08-01T15:00:00.000Z',
            },
            {
              id: 'e2',
              type: 'PRODUCT_CHANGE',
              previousProductId: 'com.meros.freemium',
              newProductId: 'com.meros.premium.monthly',
              createdAt: '2025-05-01T15:00:00.000Z',
            },
            {
              id: 'e1',
              type: 'INITIAL_PURCHASE',
              previousProductId: null,
              newProductId: 'com.meros.trial.7d',
              createdAt: '2025-04-01T15:00:00.000Z',
            },
          ],
        }),
      });
      renderRealUser();
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));

      const history = await openTab('Histórico');

      await waitFor(() =>
        expect(timelineTitles(history)).toEqual([
          'Conta criada',
          'Assinou o plano Teste grátis',
          'Assinou o plano Premium',
          'Senha alterada',
          'Mudou para o plano com.meros.pro.legacy',
        ]),
      );
      for (const date of [
        '12 de mar. de 2025',
        '01 de abr. de 2025',
        '01 de mai. de 2025',
        '01 de jun. de 2025',
        '01 de ago. de 2025',
      ]) {
        expect(within(history).getByText(date)).toBeInTheDocument();
      }
      expect(consoleErrorMock).not.toHaveBeenCalled();
    });

    it('translates the merged history into the UI language', async () => {
      await act(() => i18n.changeLanguage('en'));
      try {
        mockDetailRoutes({
          resetLogs: respond(200, {
            items: [
              { id: 'r1', ip: null, outcome: 'SUCCESS', createdAt: '2025-06-01T15:00:00.000Z' },
            ],
          }),
          events: respond(200, {
            items: [
              {
                id: 'e1',
                type: 'INITIAL_PURCHASE',
                previousProductId: null,
                newProductId: 'com.meros.premium.monthly',
                createdAt: '2025-04-01T15:00:00.000Z',
              },
            ],
          }),
        });
        renderRealUser();

        const history = await openTab('History');

        await waitFor(() =>
          expect(timelineTitles(history)).toEqual([
            'Account created',
            'Subscribed to the Premium plan',
            'Password changed',
          ]),
        );
        expect(within(history).getByText('Jun 01, 2025')).toBeInTheDocument();
      } finally {
        await act(() => i18n.changeLanguage('pt'));
      }
    });

    it('shows a cancellation without a reason as "Cancelou a assinatura"', async () => {
      mockDetailRoutes({
        cancellations: respond(200, {
          items: [{ id: 'c1', cancelledAt: '2025-07-01T15:00:00.000Z', reason: null }],
        }),
      });
      renderRealUser();

      const history = await openTab('Histórico');

      await waitFor(() =>
        expect(timelineTitles(history)).toEqual(['Conta criada', 'Cancelou a assinatura']),
      );
      expect(within(history).getByText('01 de jul. de 2025')).toBeInTheDocument();
      expect(consoleErrorMock).not.toHaveBeenCalled();
    });

    it('shows a known cancel reason translated, not the raw enum', async () => {
      await act(() => i18n.changeLanguage('en'));
      try {
        mockDetailRoutes({
          cancellations: respond(200, {
            items: [{ id: 'c1', cancelledAt: '2025-07-01T15:00:00.000Z', reason: 'BILLING_ERROR' }],
          }),
        });
        renderRealUser();

        const history = await openTab('History');

        await waitFor(() =>
          expect(timelineTitles(history)).toEqual([
            'Account created',
            'Cancelled the subscription (a billing error)',
          ]),
        );
        expect(within(history).queryByText(/BILLING_ERROR/)).not.toBeInTheDocument();
      } finally {
        await act(() => i18n.changeLanguage('pt'));
      }
    });

    it('falls back to the plain cancellation copy for an unmapped reason', async () => {
      mockDetailRoutes({
        cancellations: respond(200, {
          items: [{ id: 'c1', cancelledAt: '2025-07-01T15:00:00.000Z', reason: 'SOME_NEW_REASON' }],
        }),
      });
      renderRealUser();

      const history = await openTab('Histórico');

      await waitFor(() =>
        expect(timelineTitles(history)).toEqual(['Conta criada', 'Cancelou a assinatura']),
      );
      expect(within(history).queryByText(/SOME_NEW_REASON/)).not.toBeInTheDocument();
    });

    it('merges cancellations with the other history sources oldest first', async () => {
      mockDetailRoutes({
        events: respond(200, {
          items: [
            {
              id: 'e2',
              type: 'INITIAL_PURCHASE',
              previousProductId: null,
              newProductId: 'com.meros.premium.monthly',
              createdAt: '2025-08-01T15:00:00.000Z',
            },
            {
              id: 'e1',
              type: 'INITIAL_PURCHASE',
              previousProductId: null,
              newProductId: 'com.meros.trial.7d',
              createdAt: '2025-04-01T15:00:00.000Z',
            },
          ],
        }),
        cancellations: respond(200, {
          items: [
            {
              id: 'c2',
              cancelledAt: '2025-09-01T15:00:00.000Z',
              reason: 'CUSTOMER_SUPPORT',
            },
            { id: 'c1', cancelledAt: '2025-05-01T15:00:00.000Z', reason: null },
          ],
        }),
      });
      renderRealUser();

      const history = await openTab('Histórico');

      await waitFor(() =>
        expect(timelineTitles(history)).toEqual([
          'Conta criada',
          'Assinou o plano Teste grátis',
          'Cancelou a assinatura',
          'Assinou o plano Premium',
          'Cancelou a assinatura (atendimento ao cliente)',
        ]),
      );
      expect(consoleErrorMock).not.toHaveBeenCalled();
    });

    it.each<[string, RouteHandler]>([
      ['the request rejects', () => Promise.reject(new TypeError('Failed to fetch'))],
      ['the proxy responds 502', respond(502, { error: 'Failed to reach the API' })],
      ['an item has a malformed shape', respond(200, { items: [{ id: 1, reason: 'X' }] })],
    ])(
      'still shows the other history sources when cancellations fail because %s',
      async (_label, failing) => {
        mockDetailRoutes({
          resetLogs: respond(200, {
            items: [
              { id: 'r1', ip: null, outcome: 'SUCCESS', createdAt: '2025-06-01T15:00:00.000Z' },
            ],
          }),
          cancellations: failing,
        });
        renderRealUser();

        const history = await openTab('Histórico');

        await waitFor(() =>
          expect(timelineTitles(history)).toEqual(['Conta criada', 'Senha alterada']),
        );
      },
    );

    it('shows a deactivation as "Conta desativada" with its date', async () => {
      mockDetailRoutes({
        deactivations: respond(200, {
          items: [{ id: 'd1', deactivatedAt: '2025-07-01T15:00:00.000Z', reason: null }],
        }),
      });
      renderRealUser();

      const history = await openTab('Histórico');

      await waitFor(() =>
        expect(timelineTitles(history)).toEqual(['Conta criada', 'Conta desativada']),
      );
      expect(within(history).getByText('01 de jul. de 2025')).toBeInTheDocument();
      expect(consoleErrorMock).not.toHaveBeenCalled();
    });

    it('translates the deactivation entry into the UI language', async () => {
      await act(() => i18n.changeLanguage('en'));
      try {
        mockDetailRoutes({
          deactivations: respond(200, {
            items: [{ id: 'd1', deactivatedAt: '2025-07-01T15:00:00.000Z', reason: null }],
          }),
        });
        renderRealUser();

        const history = await openTab('History');

        await waitFor(() =>
          expect(timelineTitles(history)).toEqual(['Account created', 'Account deactivated']),
        );
        expect(within(history).getByText('Jul 01, 2025')).toBeInTheDocument();
      } finally {
        await act(() => i18n.changeLanguage('pt'));
      }
    });

    it('merges deactivations with subscriptions and cancellations oldest first', async () => {
      mockDetailRoutes({
        events: respond(200, {
          items: [
            {
              id: 'e1',
              type: 'INITIAL_PURCHASE',
              previousProductId: null,
              newProductId: 'com.meros.premium.monthly',
              createdAt: '2025-04-01T15:00:00.000Z',
            },
          ],
        }),
        cancellations: respond(200, {
          items: [{ id: 'c1', cancelledAt: '2025-06-01T15:00:00.000Z', reason: null }],
        }),
        deactivations: respond(200, {
          items: [
            { id: 'd2', deactivatedAt: '2025-09-01T15:00:00.000Z', reason: null },
            { id: 'd1', deactivatedAt: '2025-05-01T15:00:00.000Z', reason: null },
          ],
        }),
      });
      renderRealUser();

      const history = await openTab('Histórico');

      await waitFor(() =>
        expect(timelineTitles(history)).toEqual([
          'Conta criada',
          'Assinou o plano Premium',
          'Conta desativada',
          'Cancelou a assinatura',
          'Conta desativada',
        ]),
      );
      for (const date of [
        '12 de mar. de 2025',
        '01 de abr. de 2025',
        '01 de mai. de 2025',
        '01 de jun. de 2025',
        '01 de set. de 2025',
      ]) {
        expect(within(history).getByText(date)).toBeInTheDocument();
      }
      expect(consoleErrorMock).not.toHaveBeenCalled();
    });

    it.each<[string, RouteHandler]>([
      ['the request rejects', () => Promise.reject(new TypeError('Failed to fetch'))],
      ['the proxy responds 502', respond(502, { error: 'Failed to reach the API' })],
      ['an item has a malformed shape', respond(200, { items: [{ id: 1, reason: 'X' }] })],
    ])(
      'still shows the other history sources when deactivations fail because %s',
      async (_label, failing) => {
        mockDetailRoutes({
          resetLogs: respond(200, {
            items: [
              { id: 'r1', ip: null, outcome: 'SUCCESS', createdAt: '2025-06-01T15:00:00.000Z' },
            ],
          }),
          deactivations: failing,
        });
        renderRealUser();

        const history = await openTab('Histórico');

        await waitFor(() =>
          expect(timelineTitles(history)).toEqual(['Conta criada', 'Senha alterada']),
        );
      },
    );

    it('leaves failed password reset attempts out of the history', async () => {
      mockDetailRoutes({
        resetLogs: respond(200, {
          items: [
            { id: 'r2', ip: null, outcome: 'FAILURE', createdAt: '2025-07-01T15:00:00.000Z' },
            { id: 'r1', ip: null, outcome: 'SUCCESS', createdAt: '2025-06-01T15:00:00.000Z' },
          ],
        }),
      });
      renderRealUser();

      const history = await openTab('Histórico');

      await waitFor(() =>
        expect(timelineTitles(history)).toEqual(['Conta criada', 'Senha alterada']),
      );
      expect(within(history).queryByText('01 de jul. de 2025')).not.toBeInTheDocument();
    });

    it('shows only the account-created event when every history source is empty', async () => {
      mockDetailRoutes({
        resetLogs: respond(200, {
          items: [
            { id: 'r2', ip: null, outcome: 'FAILURE', createdAt: '2025-07-01T15:00:00.000Z' },
          ],
        }),
      });
      renderRealUser();
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));

      const history = await openTab('Histórico');

      await waitFor(() => expect(timelineTitles(history)).toEqual(['Conta criada']));
      expect(within(history).getByText('12 de mar. de 2025')).toBeInTheDocument();
    });

    it('shows plan, amount, subscriber-since and a translated status for a real subscription', async () => {
      mockDetailRoutes({ subscription: respond(200, { subscription: realSubscription }) });
      renderRealUser();

      const subscriptions = await openTab('Assinaturas');

      expect(await within(subscriptions).findByText('$7.00')).toBeInTheDocument();
      const rows = Array.from(subscriptions.querySelectorAll('.border-b')).map((row) =>
        Array.from(row.children).map((cell) => cell.textContent),
      );
      expect(rows).toEqual([
        ['Plano', 'Premium'],
        ['Preço de tabela', '$7.00'],
        ['Assinante desde', '01 de abr. de 2025'],
        ['Status', 'Período de carência'],
      ]);
      expect(within(subscriptions).queryByText('Nenhuma assinatura ativa')).not.toBeInTheDocument();
    });

    it('shows the details block with an "Ativa" status for an ACTIVE subscription', async () => {
      mockDetailRoutes({
        subscription: respond(200, { subscription: { ...realSubscription, status: 'ACTIVE' } }),
      });
      renderRealUser();

      const subscriptions = await openTab('Assinaturas');

      expect(await within(subscriptions).findByText('Ativa')).toBeInTheDocument();
      expect(within(subscriptions).getByText('$7.00')).toBeInTheDocument();
      expect(within(subscriptions).getByText('Plano')).toBeInTheDocument();
      expect(within(subscriptions).queryByText('Nenhuma assinatura ativa')).not.toBeInTheDocument();
    });

    it.each(['CANCELLED', 'EXPIRED'])(
      'shows the "No active subscription" empty state for a %s subscription',
      async (status) => {
        mockDetailRoutes({
          subscription: respond(200, { subscription: { ...realSubscription, status } }),
        });
        renderRealUser();
        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));

        const subscriptions = await openTab('Assinaturas');

        expect(
          await within(subscriptions).findByText('Nenhuma assinatura ativa'),
        ).toBeInTheDocument();
        for (const hidden of ['Plano', 'Valor', 'Assinante desde', 'Status', '$7.00']) {
          expect(within(subscriptions).queryByText(hidden)).not.toBeInTheDocument();
        }
        expect(consoleErrorMock).not.toHaveBeenCalled();
      },
    );

    it('shows a cancelled subscription that is still inside its paid period, with the access end date', async () => {
      mockDetailRoutes({
        subscription: respond(200, {
          subscription: {
            ...realSubscription,
            status: 'CANCELLED',
            willRenew: false,
            currentPeriodEnd: '2999-01-15T15:00:00.000Z',
          },
        }),
      });
      renderRealUser();

      const subscriptions = await openTab('Assinaturas');

      expect(await within(subscriptions).findByText('Cancelada')).toBeInTheDocument();
      expect(within(subscriptions).getByText('Acesso até')).toBeInTheDocument();
      expect(within(subscriptions).getByText('15 de jan. de 2999')).toBeInTheDocument();
      expect(within(subscriptions).queryByText('Nenhuma assinatura ativa')).not.toBeInTheDocument();
    });

    it('does not call a Premium account with no store subscription "free plan"', async () => {
      renderRealUser({ ...realUser, plan: 'Premium' });
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));

      const subscriptions = await openTab('Assinaturas');

      expect(
        await within(subscriptions).findByText('Nenhuma assinatura ativa'),
      ).toBeInTheDocument();
      expect(
        within(subscriptions).queryByText('Este usuário está atualmente no plano gratuito.'),
      ).not.toBeInTheDocument();
      expect(
        within(subscriptions).getByText(
          'O acesso Premium desta conta não vem de uma assinatura da loja (teste grátis ou liberação manual).',
        ),
      ).toBeInTheDocument();
    });

    it('keeps the free-plan description for a Freemium account with no subscription', async () => {
      renderRealUser({ ...realUser, plan: 'Freemium' });
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));

      const subscriptions = await openTab('Assinaturas');

      expect(
        await within(subscriptions).findByText('Este usuário está atualmente no plano gratuito.'),
      ).toBeInTheDocument();
    });

    it('keeps the "No active subscription" empty state when the user has no subscription', async () => {
      renderRealUser();
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));

      const subscriptions = await openTab('Assinaturas');

      expect(
        await within(subscriptions).findByText('Nenhuma assinatura ativa'),
      ).toBeInTheDocument();
      expect(consoleErrorMock).not.toHaveBeenCalled();
    });

    const failures: [string, RouteHandler][] = [
      ['the request rejects', () => Promise.reject(new TypeError('Failed to fetch'))],
      ['the proxy responds 502', respond(502, { error: 'Failed to reach the API' })],
      ['the body has an unexpected shape', respond(200, { unexpected: true })],
    ];

    it.each(failures)(
      'shows a couldn’t-load state, not the "no subscription" empty state, when %s',
      async (_label, failing) => {
        mockDetailRoutes({ subscription: failing });
        renderRealUser();

        const subscriptions = await openTab('Assinaturas');

        expect(
          await within(subscriptions).findByText('Não foi possível carregar esses dados'),
        ).toBeInTheDocument();
        expect(
          within(subscriptions).queryByText('Nenhuma assinatura ativa'),
        ).not.toBeInTheDocument();
      },
    );

    it('retries loading when the subscription tab’s Retry button is clicked', async () => {
      let callCount = 0;
      mockDetailRoutes({
        subscription: () => {
          callCount += 1;
          return callCount === 1
            ? respond(502, { error: 'Failed to reach the API' })()
            : respond(200, { subscription: realSubscription })();
        },
      });
      renderRealUser();

      const subscriptions = await openTab('Assinaturas');
      const retryButton = await within(subscriptions).findByRole('button', {
        name: 'Tentar novamente',
      });

      await userEvent.setup().click(retryButton);

      expect(await within(subscriptions).findByText('$7.00')).toBeInTheDocument();
    });

    it.each(failures)(
      'shows a couldn’t-load state, not just "Conta criada", when every history source fails because %s',
      async (_label, failing) => {
        mockDetailRoutes({
          resetLogs: failing,
          events: failing,
          cancellations: failing,
          deactivations: failing,
        });
        renderRealUser();

        const history = await openTab('Histórico');

        expect(
          await within(history).findByText('Não foi possível carregar esses dados'),
        ).toBeInTheDocument();
        expect(within(history).queryByText('Conta criada')).not.toBeInTheDocument();
      },
    );

    it('still shows the sources that loaded when another one fails', async () => {
      mockDetailRoutes({
        resetLogs: respond(500, {}),
        events: respond(200, {
          items: [
            {
              id: 'e1',
              type: 'INITIAL_PURCHASE',
              previousProductId: null,
              newProductId: 'com.meros.premium.monthly',
              createdAt: '2025-04-01T15:00:00.000Z',
            },
          ],
        }),
        subscription: respond(200, { subscription: realSubscription }),
      });
      renderRealUser();

      const history = await openTab('Histórico');
      await waitFor(() =>
        expect(timelineTitles(history)).toEqual(['Conta criada', 'Assinou o plano Premium']),
      );
      const subscriptions = await openTab('Assinaturas');
      expect(await within(subscriptions).findByText('$7.00')).toBeInTheDocument();
    });

    it('does not show a previous user’s details after switching users', async () => {
      let resolveFirst: (value: FetchResult) => void = () => {};
      fetchMock.mockImplementation((url) => {
        if (url.includes('acc-first') && url.endsWith('/subscription')) {
          return new Promise<FetchResult>((resolve) => {
            resolveFirst = resolve;
          });
        }
        if (url.endsWith('/subscription')) return EMPTY_ROUTES.subscription();
        return Promise.resolve(jsonResponse(200, { items: [] }));
      });
      const { rerender } = renderRealUser({ ...realUser, id: 'acc-first' });
      rerender(
        <UserDetailDrawer
          user={{ ...realUser, id: 'acc-second' }}
          onClose={jest.fn()}
          onSaveProfile={jest.fn()}
        />,
      );
      await act(async () => {
        resolveFirst(jsonResponse(200, { subscription: realSubscription }));
      });

      const subscriptions = await openTab('Assinaturas');

      expect(
        await within(subscriptions).findByText('Nenhuma assinatura ativa'),
      ).toBeInTheDocument();
      expect(within(subscriptions).queryByText('$7.00')).not.toBeInTheDocument();
    });
  });
});
