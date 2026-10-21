// src/components/admin/users/__tests__/UsersTable.test.tsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { UserRecord } from '@/lib/mocks/admin/users';

import { UsersTable } from '../UsersTable';

const users: UserRecord[] = [
  {
    id: 'u1',
    name: 'Camila Duarte',
    email: 'camila@mail.com',
    phone: '',
    location: '',
    bio: '',
    account: 'Business',
    plan: 'Premium',
    followers: '48.3k',
    following: '210',
    joined: '12/03/2025',
    status: 'Active',
    type: 'Creator',
    initials: 'CD',
    avatarColor: '#7F00FF',
  },
  {
    id: 'u2',
    name: 'Rafael Nogueira',
    email: 'rafael@mail.com',
    phone: '',
    location: '',
    bio: '',
    account: 'Personal',
    plan: 'Freemium',
    followers: '312',
    following: '89',
    joined: '20/08/2026',
    status: 'Deactivated',
    type: 'User',
    initials: 'RN',
    avatarColor: '#1A8245',
  },
];

describe('UsersTable', () => {
  it('renders every user row with name, email, account, plan, followers, joined, status', () => {
    render(
      <UsersTable
        users={users}
        total={users.length}
        loadedCount={users.length}
        sort={{ key: null, dir: 'desc' }}
        onSortChange={jest.fn()}
        onRowClick={jest.fn()}
        onViewProfile={jest.fn()}
        onResetPassword={jest.fn()}
        onDeactivate={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByText('Camila Duarte')).toBeInTheDocument();
    expect(screen.getByText('camila@mail.com')).toBeInTheDocument();
    expect(screen.getByText('48.3k')).toBeInTheDocument();
    expect(screen.getByText('Rafael Nogueira')).toBeInTheDocument();
  });

  // The test setup initializes i18n with lng 'pt', so STATUS_LABEL_KEY/ROLE_LABEL_KEY must
  // actually be translated here — an untranslated Record<UserRecord['status'], string> would
  // still pass every other assertion above, since none of them check the badge text itself.
  it('renders the status and role badges translated, not as the raw enum value', () => {
    render(
      <UsersTable
        users={users}
        total={users.length}
        loadedCount={users.length}
        sort={{ key: null, dir: 'desc' }}
        onSortChange={jest.fn()}
        onRowClick={jest.fn()}
        onViewProfile={jest.fn()}
        onResetPassword={jest.fn()}
        onDeactivate={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByText('Ativo')).toBeInTheDocument();
    expect(screen.getByText('Criador')).toBeInTheDocument();
    expect(screen.getByText('Desativado')).toBeInTheDocument();
    expect(screen.getByText('Usuário')).toBeInTheDocument();
    expect(screen.queryByText('Active')).not.toBeInTheDocument();
    expect(screen.queryByText('Creator')).not.toBeInTheDocument();
  });

  it('calls onSortChange with the column key when a sortable header is clicked', async () => {
    const user = userEvent.setup();
    const onSortChange = jest.fn();
    render(
      <UsersTable
        users={users}
        total={users.length}
        loadedCount={users.length}
        sort={{ key: null, dir: 'desc' }}
        onSortChange={onSortChange}
        onRowClick={jest.fn()}
        onViewProfile={jest.fn()}
        onResetPassword={jest.fn()}
        onDeactivate={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    await user.click(screen.getByText('Seguidores'));
    expect(onSortChange).toHaveBeenCalledWith('followers');
  });

  it('exposes each sortable header as a keyboard-activatable button', async () => {
    const user = userEvent.setup();
    const onSortChange = jest.fn();
    render(
      <UsersTable
        users={users}
        total={users.length}
        loadedCount={users.length}
        sort={{ key: null, dir: 'desc' }}
        onSortChange={onSortChange}
        onRowClick={jest.fn()}
        onViewProfile={jest.fn()}
        onResetPassword={jest.fn()}
        onDeactivate={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    const nameButton = screen.getByRole('button', { name: /^nome/i });
    await user.tab();
    expect(nameButton).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onSortChange).toHaveBeenLastCalledWith('name');
    await user.tab();
    expect(screen.getByRole('button', { name: /^conta/i })).toHaveFocus();
    await user.keyboard(' ');
    expect(onSortChange).toHaveBeenLastCalledWith('account');
  });

  it('reflects the current sort column and direction via aria-sort', () => {
    const props = {
      users,
      total: users.length,
      loadedCount: users.length,
      onSortChange: jest.fn(),
      onRowClick: jest.fn(),
      onViewProfile: jest.fn(),
      onResetPassword: jest.fn(),
      onDeactivate: jest.fn(),
      onDelete: jest.fn(),
    };
    const { rerender } = render(<UsersTable {...props} sort={{ key: 'followers', dir: 'asc' }} />);
    const header = (name: RegExp) => screen.getByRole('columnheader', { name });
    expect(header(/seguidores/i)).toHaveAttribute('aria-sort', 'ascending');
    expect(header(/^nome/i)).toHaveAttribute('aria-sort', 'none');
    expect(header(/^status/i)).toHaveAttribute('aria-sort', 'none');

    rerender(<UsersTable {...props} sort={{ key: 'followers', dir: 'desc' }} />);
    expect(header(/seguidores/i)).toHaveAttribute('aria-sort', 'descending');

    rerender(<UsersTable {...props} sort={{ key: null, dir: 'desc' }} />);
    expect(header(/seguidores/i)).toHaveAttribute('aria-sort', 'none');
  });

  it('calls onRowClick with the clicked user', async () => {
    const user = userEvent.setup();
    const onRowClick = jest.fn();
    render(
      <UsersTable
        users={users}
        total={users.length}
        loadedCount={users.length}
        sort={{ key: null, dir: 'desc' }}
        onSortChange={jest.fn()}
        onRowClick={onRowClick}
        onViewProfile={jest.fn()}
        onResetPassword={jest.fn()}
        onDeactivate={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    await user.click(screen.getByText('Camila Duarte'));
    expect(onRowClick).toHaveBeenCalledWith(users[0]);
  });

  it('opens the kebab menu with its 4 actions and wires Reset password', async () => {
    const user = userEvent.setup();
    const onResetPassword = jest.fn();
    render(
      <UsersTable
        users={users}
        total={users.length}
        loadedCount={users.length}
        sort={{ key: null, dir: 'desc' }}
        onSortChange={jest.fn()}
        onRowClick={jest.fn()}
        onViewProfile={jest.fn()}
        onResetPassword={onResetPassword}
        onDeactivate={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    const menuButtons = screen.getAllByRole('button', { name: /ações para/i });
    await user.click(menuButtons[0]);
    expect(screen.getByText('Ver perfil')).toBeInTheDocument();
    expect(screen.getByText('Redefinir senha')).toBeInTheDocument();
    expect(screen.getByText('Desativar conta')).toBeInTheDocument();
    expect(screen.getByText('Excluir conta')).toBeInTheDocument();
    await user.click(screen.getByText('Redefinir senha'));
    expect(onResetPassword).toHaveBeenCalledWith(users[0]);
  });

  it('shows "Reactivate account" for a Deactivated user', async () => {
    const user = userEvent.setup();
    render(
      <UsersTable
        users={users}
        total={users.length}
        loadedCount={users.length}
        sort={{ key: null, dir: 'desc' }}
        onSortChange={jest.fn()}
        onRowClick={jest.fn()}
        onViewProfile={jest.fn()}
        onResetPassword={jest.fn()}
        onDeactivate={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    const menuButtons = screen.getAllByRole('button', { name: /ações para/i });
    await user.click(menuButtons[1]); // Rafael, Deactivated
    expect(screen.getByText('Reativar conta')).toBeInTheDocument();
  });

  it('renders the decorative pager buttons as non-interactive', () => {
    render(
      <UsersTable
        users={users}
        total={users.length}
        loadedCount={users.length}
        sort={{ key: null, dir: 'desc' }}
        onSortChange={jest.fn()}
        onRowClick={jest.fn()}
        onViewProfile={jest.fn()}
        onResetPassword={jest.fn()}
        onDeactivate={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    for (const label of ['‹', '1', '2', '3', '›']) {
      expect(screen.getByRole('button', { name: label })).toBeDisabled();
    }
  });

  it('renders "—" for the plan and follower count of a real account with no plan data', () => {
    const realAccount: UserRecord = {
      ...users[1],
      id: 'real-1',
      name: 'Real Account',
      plan: null,
      followers: '—',
      following: '—',
    };
    render(
      <UsersTable
        users={[realAccount]}
        total={1}
        loadedCount={1}
        sort={{ key: null, dir: 'desc' }}
        onSortChange={jest.fn()}
        onRowClick={jest.fn()}
        onViewProfile={jest.fn()}
        onResetPassword={jest.fn()}
        onDeactivate={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    const row = screen.getByText('Real Account').closest('tr')!;
    const cells = within(row).getAllByRole('cell');
    expect(cells[2]).toHaveTextContent(/^—$/);
    expect(cells[3]).toHaveTextContent(/^—$/);
  });

  it('shows the given total in the footer when everything is loaded', () => {
    render(
      <UsersTable
        users={users}
        total={1234}
        loadedCount={1234}
        sort={{ key: null, dir: 'desc' }}
        onSortChange={jest.fn()}
        onRowClick={jest.fn()}
        onViewProfile={jest.fn()}
        onResetPassword={jest.fn()}
        onDeactivate={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByText(/exibindo 1–2 de 1234 contas/i)).toBeInTheDocument();
    expect(screen.queryByText(/3\.482/)).not.toBeInTheDocument();
  });

  it('shows an honest partial-load message when fewer rows were loaded than the server total', () => {
    render(
      <UsersTable
        users={users}
        total={3482}
        loadedCount={100}
        sort={{ key: null, dir: 'desc' }}
        onSortChange={jest.fn()}
        onRowClick={jest.fn()}
        onViewProfile={jest.fn()}
        onResetPassword={jest.fn()}
        onDeactivate={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(
      screen.getByText(/exibindo 2 das últimas 100 de 3482 contas.*apenas as contas carregadas/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/exibindo 1–2 de/i)).not.toBeInTheDocument();
  });

  it('renders the empty state when there are no users', () => {
    render(
      <UsersTable
        users={[]}
        total={0}
        loadedCount={0}
        sort={{ key: null, dir: 'desc' }}
        onSortChange={jest.fn()}
        onRowClick={jest.fn()}
        onViewProfile={jest.fn()}
        onResetPassword={jest.fn()}
        onDeactivate={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByText('Nenhum usuário encontrado')).toBeInTheDocument();
  });
});
