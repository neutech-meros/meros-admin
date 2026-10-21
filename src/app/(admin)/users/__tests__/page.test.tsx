// src/app/(admin)/users/__tests__/page.test.tsx
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';

import type { DomainAccountRow } from '@/lib/admin/accounts';

import UsersPage from '../page';

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

const toastMock = jest.mocked(toast);

type NamedAccount = DomainAccountRow & { name: string };

function fixtureAccount(
  overrides: Partial<DomainAccountRow> & Pick<NamedAccount, 'id' | 'name'>,
): NamedAccount {
  return {
    profileId: `prof-${overrides.id}`,
    email: `${overrides.id}@mail.com`,
    phone: '+55 11 90000-0000',
    accountType: 'INDIVIDUAL',
    status: 'ACTIVE',
    createdAt: '2025-03-12T10:00:00.000Z',
    ...overrides,
  };
}

const FIXTURE_USERS: NamedAccount[] = [
  fixtureAccount({ id: 'acc-1', name: 'Lucas Pereira' }),
  fixtureAccount({ id: 'acc-2', name: 'Beatriz Costa', accountType: 'BUSINESS' }),
  fixtureAccount({ id: 'acc-3', name: 'Mateus Oliveira', status: 'INACTIVE' }),
  fixtureAccount({ id: 'acc-4', name: 'Fernanda Rocha' }),
];

const FIXTURE_TOTAL = 57;

const FIXTURE_NAME_PATTERN = /^(Lucas Pereira|Beatriz Costa|Mateus Oliveira|Fernanda Rocha)$/;

type FetchMock = jest.Mock<Promise<Pick<Response, 'ok' | 'status' | 'json'>>, [RequestInfo | URL]>;

function jsonResponse(status: number, body: unknown): Pick<Response, 'ok' | 'status' | 'json'> {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) };
}

let fetchMock: FetchMock;

beforeEach(() => {
  jest.clearAllMocks();
  fetchMock = jest.fn();
  fetchMock.mockResolvedValue(jsonResponse(200, { items: FIXTURE_USERS, total: FIXTURE_TOTAL }));
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
  render(<UsersPage />);
  await screen.findByText('Lucas Pereira');
}

describe('UsersPage', () => {
  it('renders the heading and every fetched user once loaded', async () => {
    render(<UsersPage />);
    expect(screen.getByText('Usuários e criadores')).toBeInTheDocument();
    for (const u of FIXTURE_USERS) {
      expect(await screen.findByText(u.name)).toBeInTheDocument();
    }
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/accounts');
  });

  it('maps the fetched domain rows in the browser, deriving joined from the local-time createdAt', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        items: [
          fixtureAccount({
            id: 'acc-late',
            name: 'Lucas Pereira',
            accountType: 'BUSINESS',
            createdAt: '2025-03-13T01:00:00.000Z',
          }),
        ],
        total: 1,
      }),
    );
    await renderLoaded();
    expect(screen.getByText('12/03/2025')).toBeInTheDocument();
    expect(screen.queryByText('13/03/2025')).not.toBeInTheDocument();
    expect(screen.getByText('LP')).toBeInTheDocument();
    // Translated via ROLE_LABEL_KEY (PR #2's b1777d2); pt is the test default locale.
    expect(screen.getByText('Criador')).toBeInTheDocument();
  });

  it('shows "—" instead of fabricated plan/followers/following for fetched accounts', async () => {
    const user = userEvent.setup();
    await renderLoaded();
    const row = screen.getByText('Lucas Pereira').closest('tr')!;
    const cells = within(row).getAllByRole('cell');
    expect(cells[2]).toHaveTextContent(/^—$/);
    expect(cells[3]).toHaveTextContent(/^—$/);
    expect(within(screen.getByRole('table')).queryByText('Freemium')).not.toBeInTheDocument();

    await user.click(screen.getByText('Lucas Pereira'));
    expect(within(screen.getByRole('dialog')).getAllByText('—')).toHaveLength(4);
  });

  it('disables the Plan filter now that real accounts have no plan data', async () => {
    await renderLoaded();
    expect(screen.getByRole('combobox', { name: /filtrar por plano/i })).toBeDisabled();
  });

  it('sorts by plan without crashing when every fetched account has a null plan', async () => {
    const user = userEvent.setup();
    await renderLoaded();
    await user.click(screen.getByText('Plano'));
    expect(screen.getAllByText(FIXTURE_NAME_PATTERN)).toHaveLength(FIXTURE_USERS.length);
  });

  it('shows an honest partial-load footer when fewer accounts loaded than the real fetched total', async () => {
    await renderLoaded();
    expect(
      screen.getByText(/exibindo 4 das últimas 4 de 57 contas.*apenas as contas carregadas/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/3\.482/)).not.toBeInTheDocument();
    expect(screen.queryByText(/exibindo 1–4 de/i)).not.toBeInTheDocument();
  });

  it('shows a loading state until the accounts arrive', async () => {
    render(<UsersPage />);
    expect(screen.getByRole('status')).toHaveTextContent(/carregando contas/i);
    expect(screen.queryByText('Lucas Pereira')).not.toBeInTheDocument();
    await screen.findByText('Lucas Pereira');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('narrows the table when searching', async () => {
    const user = userEvent.setup();
    await renderLoaded();
    await user.type(screen.getByPlaceholderText(/buscar por nome ou e-mail/i), 'beatriz');
    expect(screen.getByText('Beatriz Costa')).toBeInTheDocument();
    expect(screen.queryByText('Lucas Pereira')).not.toBeInTheDocument();
    expect(screen.queryByText('Mateus Oliveira')).not.toBeInTheDocument();
    expect(screen.queryByText('Fernanda Rocha')).not.toBeInTheDocument();
  });

  it('toggles sort direction when the same column header is clicked twice', async () => {
    const user = userEvent.setup();
    await renderLoaded();
    const nameOf = (i: number) => screen.getAllByText(FIXTURE_NAME_PATTERN)[i].textContent;
    expect(nameOf(0)).toBe('Lucas Pereira');

    await user.click(screen.getByText('Nome'));
    expect(nameOf(0)).toBe('Beatriz Costa');

    await user.click(screen.getByText('Nome'));
    expect(nameOf(0)).toBe('Mateus Oliveira');
  });

  it('shows Clear filters only once a filter is active, and resets on click', async () => {
    const user = userEvent.setup();
    await renderLoaded();
    expect(screen.queryByRole('button', { name: /limpar filtros/i })).not.toBeInTheDocument();
    await user.type(screen.getByPlaceholderText(/buscar por nome ou e-mail/i), 'beatriz');
    expect(screen.queryByText('Lucas Pereira')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /limpar filtros/i }));
    expect(screen.queryByRole('button', { name: /limpar filtros/i })).not.toBeInTheDocument();
    for (const u of FIXTURE_USERS) {
      expect(screen.getByText(u.name)).toBeInTheDocument();
    }
  });

  it('opens the drawer with the clicked user and closes it', async () => {
    const user = userEvent.setup();
    await renderLoaded();
    await user.click(screen.getByText('Beatriz Costa'));
    expect(screen.getByRole('tab', { name: 'Perfil' })).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveTextContent('Beatriz Costa');
    await user.click(screen.getByRole('button', { name: /close/i }));
    await waitFor(() =>
      expect(screen.queryByRole('tab', { name: 'Perfil' })).not.toBeInTheDocument(),
    );
  });

  it('opens the reset-password dialog from the kebab menu', async () => {
    const user = userEvent.setup();
    await renderLoaded();
    const menuButtons = screen.getAllByRole('button', { name: /ações para/i });
    expect(menuButtons).toHaveLength(FIXTURE_USERS.length);
    await user.click(menuButtons[0]);
    await user.click(screen.getByText('Redefinir senha'));
    expect(screen.getByText(/envie a.*um link de redefinição/i)).toBeInTheDocument();
  });

  it('keeps the drawer open and up to date after saving a profile edit', async () => {
    const user = userEvent.setup();
    await renderLoaded();
    await user.click(screen.getByText('Lucas Pereira'));
    await user.click(screen.getByRole('button', { name: /editar perfil/i }));
    const nameInput = screen.getByDisplayValue('Lucas Pereira');
    await user.clear(nameInput);
    await user.type(nameInput, 'Ana Souza');
    await user.click(screen.getByRole('button', { name: /salvar alterações/i }));
    expect(screen.getByRole('tab', { name: 'Perfil' })).toBeInTheDocument();
    expect(screen.getAllByText('Ana Souza').length).toBeGreaterThan(0);
    expect(screen.queryByText('Lucas Pereira')).not.toBeInTheDocument();
    expect(screen.getAllByText('AS').length).toBeGreaterThan(0);
    expect(screen.queryByText('LP')).not.toBeInTheDocument();
    expect(toastMock.success).not.toHaveBeenCalled();
    expect(toastMock.info).toHaveBeenCalledWith('Ainda não disponível', {
      description:
        'Salvar perfis ainda não foi implementado — as alterações em Ana Souza só ficam visíveis nesta sessão.',
    });
  });

  it('shows an honest not-implemented toast instead of claiming a deactivation happened', async () => {
    const user = userEvent.setup();
    await renderLoaded();
    await user.click(screen.getByRole('button', { name: 'Ações para Lucas Pereira' }));
    await user.click(screen.getByText('Desativar conta'));
    expect(toastMock.success).not.toHaveBeenCalled();
    expect(toastMock.info).toHaveBeenCalledWith('Ainda não disponível', {
      description: 'Desativar contas ainda não foi implementado — Lucas Pereira não foi alterada.',
    });
  });

  it('shows an honest not-implemented toast instead of claiming a reactivation happened', async () => {
    const user = userEvent.setup();
    await renderLoaded();
    await user.click(screen.getByRole('button', { name: 'Ações para Mateus Oliveira' }));
    await user.click(screen.getByText('Reativar conta'));
    expect(toastMock.success).not.toHaveBeenCalled();
    expect(toastMock.info).toHaveBeenCalledWith('Ainda não disponível', {
      description: 'Reativar contas ainda não foi implementado — Mateus Oliveira não foi alterada.',
    });
  });

  it('shows an honest not-implemented toast instead of claiming a deletion happened', async () => {
    const user = userEvent.setup();
    await renderLoaded();
    await user.click(screen.getByRole('button', { name: 'Ações para Beatriz Costa' }));
    await user.click(screen.getByText('Excluir conta'));
    expect(toastMock.success).not.toHaveBeenCalled();
    expect(toastMock.info).toHaveBeenCalledWith('Ainda não disponível', {
      description: 'Excluir contas ainda não foi implementado — Beatriz Costa não foi removida.',
    });
    expect(screen.getByText('Beatriz Costa')).toBeInTheDocument();
  });

  it('shows an inline error instead of crashing when the route responds with an error', async () => {
    fetchMock.mockResolvedValue(jsonResponse(502, { error: 'Failed to reach the accounts API' }));
    render(<UsersPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /não foi possível carregar as contas/i,
    );
    expect(screen.getByText('Usuários e criadores')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('button', { name: /ações para/i })).toHaveLength(0);
  });

  it('shows an inline error instead of rendering garbage when the proxy returns a malformed row', async () => {
    const rowWithoutStatus: Partial<NamedAccount> = { ...FIXTURE_USERS[0] };
    delete rowWithoutStatus.status;
    fetchMock.mockResolvedValue(jsonResponse(200, { items: [rowWithoutStatus], total: 1 }));
    render(<UsersPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /não foi possível carregar as contas/i,
    );
    expect(screen.queryByText('Lucas Pereira')).not.toBeInTheDocument();
  });

  it('shows an inline error when the proxy returns an invalid createdAt', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        items: [fixtureAccount({ id: 'acc-1', name: 'Lucas Pereira', createdAt: 'garbage' })],
        total: 1,
      }),
    );
    render(<UsersPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /não foi possível carregar as contas/i,
    );
    expect(screen.queryByText('NaN/NaN/NaN')).not.toBeInTheDocument();
  });

  it('retries the fetch from the error state and shows the data on success', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(502, { error: 'Failed to reach the accounts API' }),
    );
    render(<UsersPage />);
    await screen.findByRole('alert');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('Lucas Pereira')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the loading state while retrying', async () => {
    const user = userEvent.setup();
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    fetchMock.mockReturnValueOnce(new Promise(() => {}));
    render(<UsersPage />);
    await screen.findByRole('alert');

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(screen.getByRole('status')).toHaveTextContent(/carregando contas/i);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an inline error instead of crashing when the network request rejects', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    render(<UsersPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /não foi possível carregar as contas/i,
    );
    expect(screen.queryAllByRole('button', { name: /ações para/i })).toHaveLength(0);
  });
});
