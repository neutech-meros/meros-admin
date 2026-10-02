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
    await user.type(screen.getByPlaceholderText(/buscar por nome ou e-mail/i), 'a');
    expect(onFiltersChange).toHaveBeenLastCalledWith({ ...DEFAULT_FILTERS, query: 'a' });
  });

  it('gives the search input an accessible name', () => {
    render(
      <UsersFilters
        filters={DEFAULT_FILTERS}
        onFiltersChange={jest.fn()}
        showClear={false}
        onClear={jest.fn()}
      />,
    );
    expect(screen.getByRole('textbox', { name: 'Buscar usuários' })).toBeInTheDocument();
    expect(screen.getByLabelText('Buscar usuários')).toHaveAttribute(
      'placeholder',
      'Buscar por nome ou e-mail...',
    );
  });

  it('renders translated account, plan and status option labels', () => {
    render(
      <UsersFilters
        filters={DEFAULT_FILTERS}
        onFiltersChange={jest.fn()}
        showClear={false}
        onClear={jest.fn()}
      />,
    );
    const optionsOf = (title: RegExp) =>
      Array.from((screen.getByTitle(title) as HTMLSelectElement).options).map((o) => [
        o.value,
        o.textContent,
      ]);
    expect(optionsOf(/filtrar por conta/i)).toEqual([
      ['all', 'Todas as contas'],
      ['Personal', 'Pessoal'],
      ['Business', 'Empresarial'],
    ]);
    expect(optionsOf(/filtrar por plano/i)).toEqual([
      ['all', 'Todos os planos'],
      ['Free trial', 'Teste grátis'],
      ['Freemium', 'Freemium'],
      ['Premium', 'Premium'],
    ]);
    expect(optionsOf(/filtrar por status/i)).toEqual([
      ['all', 'Todos os status'],
      ['Active', 'Ativo'],
      ['Deactivated', 'Desativado'],
      ['Suspended', 'Suspenso'],
      ['Deleted', 'Excluído'],
    ]);
  });

  it('disables the Plan filter, since real accounts have no plan data yet', () => {
    render(
      <UsersFilters
        filters={DEFAULT_FILTERS}
        onFiltersChange={jest.fn()}
        showClear={false}
        onClear={jest.fn()}
      />,
    );
    expect(screen.getByTitle(/filtrar por plano/i)).toBeDisabled();
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
    await user.selectOptions(screen.getByTitle(/filtrar por conta/i), 'Business');
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
    expect(screen.queryByRole('button', { name: /limpar filtros/i })).not.toBeInTheDocument();
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
    await user.click(screen.getByRole('button', { name: /limpar filtros/i }));
    expect(onClear).toHaveBeenCalled();
  });
});
