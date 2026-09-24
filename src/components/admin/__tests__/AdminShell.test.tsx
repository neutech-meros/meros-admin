import { render, screen } from '@testing-library/react';

jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ push: jest.fn() }),
}));

import { AdminShell } from '../AdminShell';

describe('AdminShell', () => {
  it('renders the sidebar, header, and page content together', () => {
    render(
      <AdminShell>
        <div>page content</div>
      </AdminShell>,
    );
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByText('page content')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument(); // from Header's breadcrumb
  });
});
