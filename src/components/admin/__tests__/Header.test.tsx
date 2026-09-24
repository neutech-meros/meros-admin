import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const push = jest.fn();
jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ push }),
}));

import i18n from '@/i18n';

import { Header } from '../Header';

describe('Header', () => {
  it('renders the breadcrumb for the current route', () => {
    render(<Header />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
  });

  it('opens the command palette from the search trigger and filters NAV items', async () => {
    const user = userEvent.setup();
    render(<Header />);
    await user.click(screen.getByRole('button', { name: /search/i }));
    const input = screen.getByPlaceholderText(/search users, lists, orders, creators/i);
    await user.type(input, 'finance');
    expect(screen.getByText('Finance')).toBeInTheDocument();
    expect(screen.queryByText('Users & Creators')).not.toBeInTheDocument();
  });

  it('opens the command palette on Ctrl+K from anywhere', async () => {
    const user = userEvent.setup();
    render(<Header />);
    await user.keyboard('{Control>}k{/Control}');
    expect(
      screen.getByPlaceholderText(/search users, lists, orders, creators/i),
    ).toBeInTheDocument();
  });

  describe('language switcher', () => {
    // The language atom persists to localStorage and i18next is a shared singleton, so a
    // selection made here would otherwise leak into every test that runs after this one.
    // Explicit cleanup() first, so changeLanguage's re-render doesn't land on a component
    // that's still mounted outside of act() (RTL's own automatic cleanup runs later).
    afterEach(() => {
      cleanup();
      window.localStorage.clear();
      i18n.changeLanguage('pt');
    });

    it('switches the active language via the profile menu', async () => {
      const user = userEvent.setup();
      render(<Header />);
      // "Alternar tema" (pt) vs "Toggle theme" (en) — an admin.header string that actually
      // differs between locales, so it proves the switch took effect (unlike e.g. "Search…",
      // which is identical in both and would pass even if changeLanguage were never called).
      expect(screen.getByTitle('Alternar tema')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'AM' }));
      await user.click(screen.getByRole('menuitemradio', { name: 'English' }));

      expect(await screen.findByTitle('Toggle theme')).toBeInTheDocument();
      expect(i18n.language).toBe('en');
    });
  });
});
