import { render, screen } from '@testing-library/react';

// AlertsCard calls useRouter() from next/navigation, which throws
// "invariant expected app router to be mounted" outside a real Next.js app
// router tree. jsdom/RTL has no app router to mount, so we stub it the same
// way Header.test.tsx already does for the same reason — this is a test
// environment accommodation, not a behavior change.
const push = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

// recharts needs a real layout size in jsdom; ResponsiveContainer no-ops without it,
// which is fine for these assertions (we're checking content, not pixel layout).
jest.mock('recharts', () => {
  const actual = jest.requireActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 400, height: 300 }}>{children}</div>
    ),
  };
});

import DashboardPage from '../page';

describe('DashboardPage', () => {
  it('renders the 4 KPI cards with their exact values', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Total revenue')).toBeInTheDocument();
    expect(screen.getByText('R$ 1.842.900')).toBeInTheDocument();
    expect(screen.getByText('Business Account')).toBeInTheDocument();
    expect(screen.getByText('3.140')).toBeInTheDocument();
  });

  it('renders both subscription summary cards', () => {
    render(<DashboardPage />);
    expect(screen.getByText('App subscriptions')).toBeInTheDocument();
    expect(screen.getByText('Creator subscriptions')).toBeInTheDocument();
  });

  it('renders the latest sales and recent users tables', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Latest sales')).toBeInTheDocument();
    expect(screen.getByText('Latest users')).toBeInTheDocument();
    expect(screen.getByText('Marina Alves')).toBeInTheDocument();
    expect(screen.getByText('Camila Duarte')).toBeInTheDocument();
  });

  it('renders the alerts card', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Alertas importantes')).toBeInTheDocument();
    expect(screen.getByText('Pagamento Stripe falhou')).toBeInTheDocument();
  });
});
