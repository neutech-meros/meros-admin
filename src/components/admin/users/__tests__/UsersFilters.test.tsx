import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DEFAULT_FILTERS } from '@/lib/admin/users-table';

import { UsersFilters } from '../UsersFilters';

describe('UsersFilters', () => {
  it('calls onFiltersChange with the typed query on search input', async () => {
    const user = userEvent.setup();
    const onFiltersChange = jest.fn();
    render(
      <UsersFilters
        filters={DEFAULT_FILTERS}
        onFiltersChange={onFiltersChange}
        showClear={false}
        onClear={jest.fn()}
      />,
    );
    await user.type(screen.getByPlaceholderText(/search by name or email/i), 'a');
    expect(onFiltersChange).toHaveBeenLastCalledWith({ ...DEFAULT_FILTERS, query: 'a' });
  });

  it('calls onFiltersChange when the Account filter changes', async () => {
    const user = userEvent.setup();
    const onFiltersChange = jest.fn();
    render(
      <UsersFilters
        filters={DEFAULT_FILTERS}
        onFiltersChange={onFiltersChange}
        showClear={false}
        onClear={jest.fn()}
      />,
    );
    await user.selectOptions(screen.getByTitle(/filter by account/i), 'Business');
    expect(onFiltersChange).toHaveBeenCalledWith({ ...DEFAULT_FILTERS, account: 'Business' });
  });

  it('hides the Clear filters button when showClear is false', () => {
    render(
      <UsersFilters
        filters={DEFAULT_FILTERS}
        onFiltersChange={jest.fn()}
        showClear={false}
        onClear={jest.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();
  });

  it('shows and wires the Clear filters button when showClear is true', async () => {
    const user = userEvent.setup();
    const onClear = jest.fn();
    render(
      <UsersFilters
        filters={DEFAULT_FILTERS}
        onFiltersChange={jest.fn()}
        showClear={true}
        onClear={onClear}
      />,
    );
    await user.click(screen.getByRole('button', { name: /clear filters/i }));
    expect(onClear).toHaveBeenCalled();
  });
});
