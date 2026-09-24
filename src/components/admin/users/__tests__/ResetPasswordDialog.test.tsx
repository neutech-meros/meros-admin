import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ResetPasswordDialog } from '../ResetPasswordDialog';

const target = { name: 'Camila Duarte', email: 'camila@mail.com', phone: '+55 21 98888-1234' };

describe('ResetPasswordDialog', () => {
  it('renders nothing reachable when target is null', () => {
    render(<ResetPasswordDialog target={null} onClose={jest.fn()} />);
    expect(screen.queryByText(/redefinir senha/i)).not.toBeInTheDocument();
  });

  it('shows the target name and email channel by default', () => {
    render(<ResetPasswordDialog target={target} onClose={jest.fn()} />);
    expect(screen.getByText(/camila duarte/i)).toBeInTheDocument();
    expect(screen.getByText('camila@mail.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enviar link por e-mail/i })).toBeInTheDocument();
  });

  it('switches the send button label when SMS is picked', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordDialog target={target} onClose={jest.fn()} />);
    await user.click(screen.getByText('SMS'));
    expect(screen.getByRole('button', { name: /enviar link por sms/i })).toBeInTheDocument();
  });

  it('exposes the channel picker as a radio group switchable via keyboard', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordDialog target={target} onClose={jest.fn()} />);
    expect(screen.getByRole('radiogroup', { name: /enviar link para/i })).toBeInTheDocument();
    const emailRadio = screen.getByRole('radio', { name: /^e-mail/i });
    const smsRadio = screen.getByRole('radio', { name: /^sms/i });
    expect(emailRadio).toBeChecked();
    expect(smsRadio).not.toBeChecked();

    emailRadio.focus();
    await user.keyboard('{ArrowDown}');
    expect(smsRadio).toBeChecked();
    expect(smsRadio).toHaveFocus();
    expect(screen.getByRole('button', { name: /enviar link por sms/i })).toBeInTheDocument();

    await user.keyboard('{ArrowUp}');
    expect(emailRadio).toBeChecked();
    expect(screen.getByRole('button', { name: /enviar link por e-mail/i })).toBeInTheDocument();
  });

  it('gives each pencil button an accessible name', () => {
    render(<ResetPasswordDialog target={target} onClose={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Editar e-mail' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar telefone' })).toBeInTheDocument();
  });

  it('labels the inline email and phone inputs', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordDialog target={target} onClose={jest.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Editar e-mail' }));
    expect(screen.getByLabelText('Endereço de e-mail')).toHaveValue('camila@mail.com');
    await user.click(screen.getByRole('button', { name: 'Editar telefone' }));
    expect(screen.getByLabelText('Número de telefone')).toHaveValue('+55 21 98888-1234');
  });

  it('describes the dialog without Radix accessibility warnings', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      render(<ResetPasswordDialog target={target} onClose={jest.fn()} />);
      expect(screen.getByRole('dialog')).toHaveAccessibleDescription(
        /^Envie a Camila Duarte um link de redefinição/,
      );
      expect(warn).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
      error.mockRestore();
    }
  });

  it('closes and calls onClose on a valid send', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<ResetPasswordDialog target={target} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /enviar link por e-mail/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('does not close and switches the email field to edit mode on an invalid email', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<ResetPasswordDialog target={{ ...target, email: '' }} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /enviar link por e-mail/i }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText('name@mail.com')).toBeInTheDocument();
  });

  it('closes on Cancel', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<ResetPasswordDialog target={target} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /^cancelar$/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
