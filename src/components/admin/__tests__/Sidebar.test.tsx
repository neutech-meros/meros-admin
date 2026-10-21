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

  it('expands an enabled group with sub-items on click and shows its leaves', async () => {
    const user = userEvent.setup();
    render(<Sidebar />);
    expect(screen.queryByText('Category requests')).not.toBeInTheDocument();
    await user.click(screen.getByText('Categories'));
    expect(screen.getByText('Category requests')).toBeInTheDocument();
  });

  describe('disabled nav keys', () => {
    it('renders a disabled nav key as a non-link that cannot be navigated to', () => {
      render(<Sidebar />);
      const overview = screen.getByText('Overview').closest('[data-nav-key]')!;
      expect(overview).toHaveAttribute('data-nav-disabled', 'true');
      expect(overview).toHaveAttribute('aria-disabled', 'true');
      expect(overview.tagName).not.toBe('A');
      expect(overview).not.toHaveAttribute('href');
    });

    it('keeps an enabled group as a real link', () => {
      render(<Sidebar />);
      const users = screen.getByText('Users & Creators').closest('[data-nav-key]')!;
      expect(users).toHaveAttribute('href', '/users');
      expect(users).not.toHaveAttribute('data-nav-disabled');
    });

    it('does not expand a disabled group on click', async () => {
      const user = userEvent.setup();
      render(<Sidebar />);
      await user.click(screen.getByText('Finance'));
      expect(screen.queryByText('Commissions')).not.toBeInTheDocument();
    });

    it('leaves the enabled leaves clickable', async () => {
      const user = userEvent.setup();
      render(<Sidebar />);
      await user.click(screen.getByText('Moderation & Trust'));
      expect(screen.getByText('Reported content').closest('a')).toHaveAttribute(
        'href',
        '/moderation/reported',
      );
    });
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
