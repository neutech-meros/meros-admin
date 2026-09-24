// src/components/admin/users/__tests__/UsersTable.test.tsx
import { render, screen } from '@testing-library/react';
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

  it('calls onSortChange with the column key when a sortable header is clicked', async () => {
    const user = userEvent.setup();
    const onSortChange = jest.fn();
    render(
      <UsersTable
        users={users}
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

  it('renders the empty state when there are no users', () => {
    render(
      <UsersTable
        users={[]}
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
