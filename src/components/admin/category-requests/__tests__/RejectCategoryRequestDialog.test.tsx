import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import i18n from '@/i18n';
import type { CategoryRequestItem } from '@/lib/admin/category-requests-api';

import { RejectCategoryRequestDialog } from '../RejectCategoryRequestDialog';

beforeAll(async () => {
  await i18n.changeLanguage('en');
});
afterAll(async () => {
  await i18n.changeLanguage('pt');
});

const REQUEST: CategoryRequestItem = {
  id: 'r-1',
  name: 'Rooftop Bars',
  status: 'Pending',
  level: null,
  requester: 'ana',
  avatarUrl: null,
  date: 'Oct 1, 2026',
  decision: null,
};

function renderDialog(overrides: Partial<Parameters<typeof RejectCategoryRequestDialog>[0]> = {}) {
  const props = {
    request: REQUEST,
    submitting: false,
    onCancel: jest.fn(),
    onConfirm: jest.fn(),
    ...overrides,
  };
  render(<RejectCategoryRequestDialog {...props} />);
  return props;
}

describe('RejectCategoryRequestDialog', () => {
  it('renders nothing without a request', () => {
    renderDialog({ request: null });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('asks to confirm the rejection of the request', () => {
    renderDialog();

    expect(screen.getByRole('heading', { name: 'Reject this request?' })).toBeInTheDocument();
    expect(
      screen.getByText('"Rooftop Bars" will be rejected and ana will be notified.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Reason/)).toHaveValue('');
  });

  it('confirms without a reason when the field is left empty', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Reject request' }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(undefined));
  });

  it('confirms with the trimmed reason', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog();

    await user.type(screen.getByLabelText(/Reason/), '  Duplicate of Bars  ');
    await user.click(screen.getByRole('button', { name: 'Reject request' }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('Duplicate of Bars'));
  });

  it('blocks a reason longer than 500 characters', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog();

    await user.click(screen.getByLabelText(/Reason/));
    await user.paste('x'.repeat(501));
    await user.click(screen.getByRole('button', { name: 'Reject request' }));

    expect(await screen.findByText('Keep the reason under 500 characters.')).toBeInTheDocument();
    expect(screen.getByText('501/500')).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('disables both buttons while the rejection is being sent', () => {
    renderDialog({ submitting: true });

    expect(screen.getByRole('button', { name: 'Reject request' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('cancels from the Cancel button', async () => {
    const user = userEvent.setup();
    const { onCancel, onConfirm } = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
