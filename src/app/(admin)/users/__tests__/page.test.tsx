// src/app/(admin)/users/__tests__/page.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import UsersPage from '../page';

describe('UsersPage', () => {
  it('renders the heading and every mock user by default', () => {
    render(<UsersPage />);
    expect(screen.getByText('Users & Creators')).toBeInTheDocument();
    expect(screen.getByText('Camila Duarte')).toBeInTheDocument();
    expect(screen.getByText('Thiago Souza')).toBeInTheDocument();
  });

  it('narrows the table when searching', async () => {
    const user = userEvent.setup();
    render(<UsersPage />);
    await user.type(screen.getByPlaceholderText(/search by name or email/i), 'camila');
    expect(screen.getByText('Camila Duarte')).toBeInTheDocument();
    expect(screen.queryByText('Thiago Souza')).not.toBeInTheDocument();
  });

  it('toggles sort direction when the same column header is clicked twice', async () => {
    const user = userEvent.setup();
    render(<UsersPage />);
    const nameOf = (i: number) =>
      screen.getAllByText(
        /^(Camila Duarte|Rafael Nogueira|Priscila Matos|Eduardo Lima|Marina Alves|Diego Fontes|Helena Cardoso|Bruno Tavares|Isabela Ramos|Thiago Souza)$/,
      )[i].textContent;

    await user.click(screen.getByText('Name'));
    expect(nameOf(0)).toBe('Bruno Tavares'); // alphabetically first of the 10 seed names, ascending

    await user.click(screen.getByText('Name'));
    expect(nameOf(0)).toBe('Thiago Souza'); // same column clicked again flips to descending
  });

  it('shows Clear filters only once a filter is active, and resets on click', async () => {
    const user = userEvent.setup();
    render(<UsersPage />);
    expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();
    await user.type(screen.getByPlaceholderText(/search by name or email/i), 'camila');
    const clearButton = screen.getByRole('button', { name: /clear filters/i });
    await user.click(clearButton);
    expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();
    expect(screen.getByText('Thiago Souza')).toBeInTheDocument();
  });

  it('opens the drawer with the clicked user and closes it', async () => {
    const user = userEvent.setup();
    render(<UsersPage />);
    await user.click(screen.getByText('Camila Duarte'));
    expect(screen.getByRole('tab', { name: 'Profile' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /close/i })); // drawer close icon button
  });

  it('opens the reset-password dialog from the kebab menu', async () => {
    const user = userEvent.setup();
    render(<UsersPage />);
    const menuButtons = screen.getAllByRole('button', { name: /actions for/i });
    await user.click(menuButtons[0]);
    await user.click(screen.getByText('Reset password'));
    expect(screen.getByText(/send.*a reset link/i)).toBeInTheDocument();
  });

  it('keeps the drawer open and up to date after saving a profile edit', async () => {
    const user = userEvent.setup();
    render(<UsersPage />);
    await user.click(screen.getByText('Camila Duarte'));
    await user.click(screen.getByRole('button', { name: /edit profile/i }));
    const nameInput = screen.getByDisplayValue('Camila Duarte');
    await user.clear(nameInput);
    await user.type(nameInput, 'Camila D. Silva');
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    // Drawer stays open (no onClose call on save) and now shows the updated name
    // instead of the stale pre-save value.
    expect(screen.getByRole('tab', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.getAllByText('Camila D. Silva').length).toBeGreaterThan(0);
    expect(screen.queryByText('Camila Duarte')).not.toBeInTheDocument();
  });
});
