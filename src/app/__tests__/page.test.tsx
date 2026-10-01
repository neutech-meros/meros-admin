/**
 * @jest-environment node
 */
const redirectMock = jest.fn();

jest.mock('next/navigation', () => ({
  redirect: (path: string) => redirectMock(path),
}));

import Home from '../page';

describe('/', () => {
  it('lands on the first sidebar-enabled screen, not on the locked Overview', () => {
    Home();
    expect(redirectMock).toHaveBeenCalledWith('/users');
  });
});
