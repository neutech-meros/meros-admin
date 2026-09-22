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
    await user.click(screen.getByText('Followers'));
    expect(onSortChange).toHaveBeenCalledWith('followers');
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
    const menuButtons = screen.getAllByRole('button', { name: /actions for/i });
    await user.click(menuButtons[0]);
    expect(screen.getByText('View profile')).toBeInTheDocument();
    expect(screen.getByText('Reset password')).toBeInTheDocument();
    expect(screen.getByText('Deactivate account')).toBeInTheDocument();
    expect(screen.getByText('Delete account')).toBeInTheDocument();
    await user.click(screen.getByText('Reset password'));
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
    const menuButtons = screen.getAllByRole('button', { name: /actions for/i });
    await user.click(menuButtons[1]); // Rafael, Deactivated
    expect(screen.getByText('Reactivate account')).toBeInTheDocument();
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
    expect(screen.getByText('No user found')).toBeInTheDocument();
  });
});
