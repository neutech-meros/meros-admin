import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const push = jest.fn();
jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ push }),
}));

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
});
