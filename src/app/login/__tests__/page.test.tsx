import { act, fireEvent, render, screen } from '@testing-library/react';

import { Provider } from 'jotai';

import { HOME_PATH } from '@/components/admin/nav-config';

import LoginPage from '../page';

const pushMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    pushMock.mockClear();
    window.localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('lands on the home screen after a successful login, not on the locked Overview', async () => {
    const { container } = render(
      <Provider>
        <LoginPage />
      </Provider>,
    );
    fireEvent.change(container.querySelector('#email')!, {
      target: { name: 'email', value: 'admin@example.com' },
    });
    fireEvent.change(container.querySelector('#password')!, {
      target: { name: 'password', value: '123456' },
    });
    fireEvent.submit(container.querySelector('form')!);
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(pushMock).toHaveBeenCalledWith(HOME_PATH);
    expect(pushMock).not.toHaveBeenCalledWith('/dashboard');
    expect(screen.queryByText('Credenciais inválidas')).toBeNull();
  });
});
