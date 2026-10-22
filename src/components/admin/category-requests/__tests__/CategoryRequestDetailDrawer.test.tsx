import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import i18n from '@/i18n';
import type { CategoryRequestItem } from '@/lib/admin/category-requests-api';

import { CategoryRequestDetailDrawer } from '../CategoryRequestDetailDrawer';

beforeAll(async () => {
  await i18n.changeLanguage('en');
});
afterAll(async () => {
  await i18n.changeLanguage('pt');
});

function requestItem(overrides: Partial<CategoryRequestItem> = {}): CategoryRequestItem {
  return {
    id: 'r-1',
    name: 'Rooftop Bars',
    status: 'Pending',
    level: null,
    requester: 'ana souza',
    avatarUrl: null,
    date: 'Oct 1, 2026',
    decision: null,
    ...overrides,
  };
}

function field(label: string) {
  return screen.getByText(label).parentElement!;
}

describe('CategoryRequestDetailDrawer', () => {
  it('renders nothing when there is no request', () => {
    render(
      <CategoryRequestDetailDrawer
        request={null}
        onClose={jest.fn()}
        onApprove={jest.fn()}
        onReject={jest.fn()}
      />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the real fields of a pending request and no decision', () => {
    render(
      <CategoryRequestDetailDrawer
        request={requestItem()}
        onClose={jest.fn()}
        onApprove={jest.fn()}
        onReject={jest.fn()}
      />,
    );

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Rooftop Bars' })).toBeInTheDocument();
    expect(within(dialog).getByText('Pending')).toBeInTheDocument();
    expect(within(dialog).getByText('Requested by ana souza')).toBeInTheDocument();
    expect(field('Proposed name')).toHaveTextContent('Rooftop Bars');
    expect(field('Level')).toHaveTextContent('—');
    expect(field('Requested by')).toHaveTextContent('ana souza');
    expect(field('Requested on')).toHaveTextContent('Oct 1, 2026');
    expect(within(dialog).queryByText('Decided on')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('Rejection reason')).not.toBeInTheDocument();
  });

  it('shows the translated level when the request has one', () => {
    render(
      <CategoryRequestDetailDrawer
        request={requestItem({ level: 'Child category' })}
        onClose={jest.fn()}
        onApprove={jest.fn()}
        onReject={jest.fn()}
      />,
    );

    expect(field('Level')).toHaveTextContent('Child category');
  });

  it('shows when an approved request was decided, without a rejection reason', () => {
    render(
      <CategoryRequestDetailDrawer
        request={requestItem({
          status: 'Approved',
          level: 'Parent',
          decision: { reason: null, decidedAt: 'Oct 2, 2026', groupId: null, categoryId: null },
        })}
        onClose={jest.fn()}
        onApprove={jest.fn()}
        onReject={jest.fn()}
      />,
    );

    expect(field('Decided on')).toHaveTextContent('Oct 2, 2026');
    expect(screen.queryByText('Rejection reason')).not.toBeInTheDocument();
  });

  it('shows when a rejected request was decided and why', () => {
    render(
      <CategoryRequestDetailDrawer
        request={requestItem({
          status: 'Rejected',
          decision: {
            reason: 'Duplicate of Bars',
            decidedAt: 'Oct 2, 2026',
            groupId: null,
            categoryId: null,
          },
        })}
        onClose={jest.fn()}
        onApprove={jest.fn()}
        onReject={jest.fn()}
      />,
    );

    expect(field('Decided on')).toHaveTextContent('Oct 2, 2026');
    expect(field('Rejection reason')).toHaveTextContent('Duplicate of Bars');
  });

  it('marks a rejection without a reason as unavailable', () => {
    render(
      <CategoryRequestDetailDrawer
        request={requestItem({
          status: 'Rejected',
          decision: { reason: null, decidedAt: 'Oct 2, 2026', groupId: null, categoryId: null },
        })}
        onClose={jest.fn()}
        onApprove={jest.fn()}
        onReject={jest.fn()}
      />,
    );

    expect(field('Rejection reason')).toHaveTextContent('—');
  });

  it('does not show fields the API does not provide nor unsupported actions', () => {
    render(
      <CategoryRequestDetailDrawer
        request={requestItem()}
        onClose={jest.fn()}
        onApprove={jest.fn()}
        onReject={jest.fn()}
      />,
    );

    const dialog = screen.getByRole('dialog');
    for (const label of [
      'Parent path',
      'Account',
      'Community votes',
      'Why they need it',
      'Overlap check',
    ]) {
      expect(within(dialog).queryByText(label)).not.toBeInTheDocument();
    }
    expect(
      within(dialog).queryByRole('button', { name: 'Ask for details' }),
    ).not.toBeInTheDocument();
  });

  it('offers Reject and Create category for a pending request', async () => {
    const onApprove = jest.fn();
    const onReject = jest.fn();
    const user = userEvent.setup();
    const request = requestItem();
    render(
      <CategoryRequestDetailDrawer
        request={request}
        onClose={jest.fn()}
        onApprove={onApprove}
        onReject={onReject}
      />,
    );

    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Reject' }));
    await user.click(within(dialog).getByRole('button', { name: 'Create category' }));

    expect(onReject).toHaveBeenCalledWith(request);
    expect(onApprove).toHaveBeenCalledWith(request);
  });

  it('offers only Close for a decided request', () => {
    render(
      <CategoryRequestDetailDrawer
        request={requestItem({
          status: 'Approved',
          decision: { reason: null, decidedAt: 'Oct 2, 2026', groupId: null, categoryId: null },
        })}
        onClose={jest.fn()}
        onApprove={jest.fn()}
        onReject={jest.fn()}
      />,
    );

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
    expect(
      within(dialog).queryByRole('button', { name: 'Create category' }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog)
        .getAllByRole('button', { name: 'Close' })
        .some((button) => button.textContent === 'Close'),
    ).toBe(true);
  });

  it('shows the requester initials when there is no avatar', () => {
    render(
      <CategoryRequestDetailDrawer
        request={requestItem()}
        onClose={jest.fn()}
        onApprove={jest.fn()}
        onReject={jest.fn()}
      />,
    );

    expect(within(screen.getByRole('dialog')).getByText('AS')).toBeInTheDocument();
  });

  it('calls onClose from the Close button', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(
      <CategoryRequestDetailDrawer
        request={requestItem({ status: 'Rejected' })}
        onClose={onClose}
        onApprove={jest.fn()}
        onReject={jest.fn()}
      />,
    );

    const footerClose = within(screen.getByRole('dialog'))
      .getAllByRole('button', { name: 'Close' })
      .find((button) => button.textContent === 'Close')!;
    await user.click(footerClose);

    expect(onClose).toHaveBeenCalled();
  });
});
