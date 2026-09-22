import { render, screen } from '@testing-library/react';

import { DrawerBlocks, type DrawerBlock } from '../DrawerBlocks';

describe('DrawerBlocks', () => {
  it('renders a kv block as a label/value row', () => {
    const blocks: DrawerBlock[] = [{ kind: 'kv', label: 'Plan', value: 'Premium' }];
    render(<DrawerBlocks blocks={blocks} />);
    expect(screen.getByText('Plan')).toBeInTheDocument();
    expect(screen.getByText('Premium')).toBeInTheDocument();
  });

  it('renders a kv block value as a badge when badge is true', () => {
    const blocks: DrawerBlock[] = [
      {
        kind: 'kv',
        label: 'Status',
        value: 'Active',
        badge: true,
        toneColor: 'var(--success)',
        toneBackground: 'var(--success-bg)',
      },
    ];
    render(<DrawerBlocks blocks={blocks} />);
    const badge = screen.getByText('Active');
    expect(badge).toHaveStyle({ color: 'var(--success)' });
  });

  it('renders a table block with columns and rows', () => {
    const blocks: DrawerBlock[] = [
      {
        kind: 'table',
        columns: ['Type', 'Reason'],
        rows: [{ cells: [{ text: 'Received' }, { text: 'Spam' }] }],
      },
    ];
    render(<DrawerBlocks blocks={blocks} />);
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Received')).toBeInTheDocument();
    expect(screen.getByText('Spam')).toBeInTheDocument();
  });

  it('renders a timeline block as a list of title/time events', () => {
    const blocks: DrawerBlock[] = [
      { kind: 'timeline', events: [{ title: 'Account created', time: '01 Jan 2026' }] },
    ];
    render(<DrawerBlocks blocks={blocks} />);
    expect(screen.getByText('Account created')).toBeInTheDocument();
    expect(screen.getByText('01 Jan 2026')).toBeInTheDocument();
  });

  it('renders an empty block with title and description', () => {
    const blocks: DrawerBlock[] = [
      { kind: 'empty', title: 'No reports', description: 'Nothing to show yet.' },
    ];
    render(<DrawerBlocks blocks={blocks} />);
    expect(screen.getByText('No reports')).toBeInTheDocument();
    expect(screen.getByText('Nothing to show yet.')).toBeInTheDocument();
  });
});
