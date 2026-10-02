import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'jotai';
import { toast } from 'sonner';

import CategoriesPage from '../page';

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

function row(name: string) {
  return screen.getByText(name).closest('tr')!;
}

function renderPage() {
  // A fresh Provider per test isolates the shared category tree atom, matching the
  // isolation the previous per-render useState gave each test.
  return render(
    <Provider>
      <CategoriesPage />
    </Provider>,
  );
}

describe('CategoriesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the heading and the default-open branches, with others collapsed', () => {
    renderPage();
    expect(screen.getByText('Categorias')).toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Restaurant')).toBeInTheDocument();
    expect(screen.getByText('Italian food')).toBeInTheDocument();
    expect(screen.queryByText('Rooftop bars')).not.toBeInTheDocument();
    expect(screen.getByText('Stays')).toBeInTheDocument();
    expect(screen.queryByText('Hotels')).not.toBeInTheDocument();
  });

  it('expands a collapsed branch on row click and collapses it again', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(row('Stays'));
    expect(screen.getByText('Hotels')).toBeInTheDocument();
    await user.click(row('Stays'));
    expect(screen.queryByText('Hotels')).not.toBeInTheDocument();
  });

  it('expand all opens every branch, collapse all closes everything', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Expandir tudo' }));
    expect(screen.getByText('Hotels')).toBeInTheDocument();
    expect(screen.getByText('Rooftop bars')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Recolher tudo' }));
    expect(screen.queryByText('Restaurant')).not.toBeInTheDocument();
    expect(screen.queryByText('Hotels')).not.toBeInTheDocument();
  });

  it('search filters to matching nodes and force-expands their ancestors', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByPlaceholderText('Buscar categorias'), 'boutique');
    expect(screen.getByText('Stays')).toBeInTheDocument();
    expect(screen.getByText('Hotels')).toBeInTheDocument();
    expect(screen.getByText('Boutique hotels')).toBeInTheDocument();
    expect(screen.queryByText('Food')).not.toBeInTheDocument();
  });

  it('clearing the search restores whatever the tree looked like before searching, not a full reset', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(row('Stays'));
    expect(screen.getByText('Hotels')).toBeInTheDocument();
    expect(screen.queryByText('Rooftop bars')).not.toBeInTheDocument();

    const search = screen.getByPlaceholderText('Buscar categorias');
    await user.type(search, 'boutique');
    await user.clear(search);

    expect(screen.getByText('Hotels')).toBeInTheDocument();
    expect(screen.queryByText('Rooftop bars')).not.toBeInTheDocument();
  });

  it('creates a new top-level parent category', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Nova categoria principal' }));
    expect(screen.getByText('Nova categoria')).toBeInTheDocument();
    expect(screen.getByText('Será criada como uma categoria principal.')).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText('ex.: Comida italiana'), 'Wellness');
    await user.click(screen.getByRole('button', { name: 'Criar categoria' }));

    expect(toast.success).toHaveBeenCalledWith(
      'Categoria principal criada',
      expect.objectContaining({ description: '"Wellness" foi adicionada à árvore.' }),
    );
    expect(screen.getByText('Wellness')).toBeInTheDocument();
  });

  it('defaults a new category to the generic-place icon and lets the admin pick a different one', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Nova categoria principal' }));
    expect(screen.getByDisplayValue('Local genérico')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Ícone'), 'Praia');

    expect(screen.getByDisplayValue('Praia')).toBeInTheDocument();
  });

  it("adds a child under the clicked row's parent", async () => {
    const user = userEvent.setup();
    renderPage();
    const foodRow = row('Food');
    await user.click(within(foodRow).getByRole('button', { name: 'Adicionar filha' }));
    await user.type(screen.getByPlaceholderText('ex.: Comida italiana'), 'Street food');
    await user.click(screen.getByRole('button', { name: 'Criar categoria' }));

    expect(toast.success).toHaveBeenCalledWith(
      'Categoria criada',
      expect.objectContaining({ description: '"Street food" foi adicionada sob Food.' }),
    );
  });

  it("pre-fills the edit dialog's icon picker with the category's current icon", async () => {
    const user = userEvent.setup();
    renderPage();
    const foodRow = row('Food');
    await user.click(within(foodRow).getByRole('button', { name: 'Editar' }));
    expect(screen.getByDisplayValue('Restaurante')).toBeInTheDocument();
  });

  it('renames a category', async () => {
    const user = userEvent.setup();
    renderPage();
    const barsRow = row('Bars & nightlife');
    await user.click(within(barsRow).getByRole('button', { name: 'Editar' }));
    const nameInput = screen.getByDisplayValue('Bars & nightlife');
    await user.clear(nameInput);
    await user.type(nameInput, 'Nightlife');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(toast.success).toHaveBeenCalledWith(
      'Categoria renomeada',
      expect.objectContaining({ description: '"Bars & nightlife" agora é "Nightlife".' }),
    );
    expect(screen.getByText('Nightlife')).toBeInTheDocument();
  });

  it('blocks an empty name with an error toast and keeps the dialog open', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Nova categoria principal' }));
    await user.click(screen.getByRole('button', { name: 'Criar categoria' }));

    expect(toast.error).toHaveBeenCalledWith(
      'Nome obrigatório',
      expect.objectContaining({ description: 'Digite um nome de categoria antes de salvar.' }),
    );
    expect(screen.getByRole('button', { name: 'Criar categoria' })).toBeInTheDocument();
  });

  it('blocks a duplicate slug with an error toast', async () => {
    const user = userEvent.setup();
    renderPage();
    const foodRow = row('Food');
    await user.click(within(foodRow).getByRole('button', { name: 'Adicionar filha' }));
    await user.type(screen.getByPlaceholderText('ex.: Comida italiana'), 'Restaurant');
    await user.click(screen.getByRole('button', { name: 'Criar categoria' }));

    expect(toast.error).toHaveBeenCalledWith(
      'Já existe',
      expect.objectContaining({ description: 'Já existe uma categoria com esse slug.' }),
    );
  });

  it('deactivating a node with active descendants shows the cascade dialog and cancel leaves it untouched', async () => {
    const user = userEvent.setup();
    renderPage();
    const foodRow = row('Food');
    await user.click(within(foodRow).getByRole('button', { name: 'Editar' }));
    await user.click(screen.getByRole('button', { name: 'Desativada' }));
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    const dialog = screen.getByText('Desativar Food?').closest('[role="dialog"]') as HTMLElement;
    expect(within(dialog).getByText('Restaurant')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.queryByText('Desativar Food?')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeInTheDocument();
  });

  it('confirming the cascade dialog deactivates the node and every active descendant', async () => {
    const user = userEvent.setup();
    renderPage();
    const foodRow = row('Food');
    await user.click(within(foodRow).getByRole('button', { name: 'Editar' }));
    await user.click(screen.getByRole('button', { name: 'Desativada' }));
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await user.click(screen.getByRole('button', { name: 'Desativar todas' }));

    expect(toast.success).toHaveBeenCalledWith(
      'Categoria desativada',
      expect.objectContaining({
        description: expect.stringContaining('"Food" e'),
      }),
    );
    await waitFor(() => expect(screen.queryByText('Desativar Food?')).not.toBeInTheDocument());
  });

  it('deactivating a node with no active descendants saves immediately, no cascade dialog', async () => {
    const user = userEvent.setup();
    renderPage();
    const italianRow = row('Italian food');
    await user.click(within(italianRow).getByRole('button', { name: 'Editar' }));
    await user.click(screen.getByRole('button', { name: 'Ativa' }));
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(screen.queryByText(/Desativar/)).not.toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith('Categoria atualizada', expect.anything());
  });

  it('hides Add child on a child-level (depth 2) row', () => {
    renderPage();
    const italianRow = row('Italian food');
    expect(
      within(italianRow).queryByRole('button', { name: 'Adicionar filha' }),
    ).not.toBeInTheDocument();
    expect(within(italianRow).getByRole('button', { name: 'Editar' })).toBeInTheDocument();
  });
});
