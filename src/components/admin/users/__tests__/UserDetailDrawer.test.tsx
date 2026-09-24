import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { UserRecord } from '@/lib/mocks/admin/users';

import { UserDetailDrawer } from '../UserDetailDrawer';

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
});
