import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ResetPasswordDialog } from '../ResetPasswordDialog';

const target = { name: 'Camila Duarte', email: 'camila@mail.com', phone: '+55 21 98888-1234' };

describe('ResetPasswordDialog', () => {
  it('renders nothing reachable when target is null', () => {
    render(<ResetPasswordDialog target={null} onClose={jest.fn()} />);
    expect(screen.queryByText(/reset password/i)).not.toBeInTheDocument();
  });

  it('shows the target name and email channel by default', () => {
    render(<ResetPasswordDialog target={target} onClose={jest.fn()} />);
    expect(screen.getByText(/camila duarte/i)).toBeInTheDocument();
    expect(screen.getByText('camila@mail.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send email link/i })).toBeInTheDocument();
  });

  it('switches the send button label when SMS is picked', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordDialog target={target} onClose={jest.fn()} />);
    await user.click(screen.getByText('SMS'));
    expect(screen.getByRole('button', { name: /send sms link/i })).toBeInTheDocument();
  });

  it('closes and calls onClose on a valid send', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<ResetPasswordDialog target={target} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /send email link/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('does not close and switches the email field to edit mode on an invalid email', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<ResetPasswordDialog target={{ ...target, email: '' }} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /send email link/i }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText('name@mail.com')).toBeInTheDocument();
  });

  it('closes on Cancel', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<ResetPasswordDialog target={target} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
