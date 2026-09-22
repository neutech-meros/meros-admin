import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

import { Sidebar } from '../Sidebar';

describe('Sidebar', () => {
  it('renders every top-level NAV label', () => {
    render(<Sidebar />);
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Users & Creators')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
  });

  it('highlights the group matching the current route', () => {
    render(<Sidebar />);
    const overview = screen.getByText('Overview').closest('[data-nav-key]');
    expect(overview).toHaveAttribute('data-active', 'true');
  });

  it('expands a group with sub-items on click and shows its leaves', async () => {
    const user = userEvent.setup();
    render(<Sidebar />);
    expect(screen.queryByText('Commissions')).not.toBeInTheDocument();
    await user.click(screen.getByText('Finance'));
    expect(screen.getByText('Commissions')).toBeInTheDocument();
  });

  it('collapses to icon-only width when the collapse toggle is clicked', async () => {
    const user = userEvent.setup();
    render(<Sidebar />);
    const nav = screen.getByRole('navigation');
    await user.click(screen.getByRole('button', { name: /recolher menu/i }));
    expect(nav.parentElement).toHaveAttribute('data-collapsed', 'true');
    expect(screen.queryByText('Users & Creators')).not.toBeInTheDocument();
  });
});
