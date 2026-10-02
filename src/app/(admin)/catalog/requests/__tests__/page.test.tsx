import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import { toast } from 'sonner';

import { getCategoryTree } from '@/lib/mocks/admin/categories';
import { getCategoryRequests } from '@/lib/mocks/admin/category-requests';
import { categoryTreeAtom } from '@/store/atoms/categories';
import { categoryRequestsAtom } from '@/store/atoms/category-requests';

import CategoriesPage from '../../categories/page';
import CategoryRequestsPage from '../page';

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

function row(name: string) {
  return screen.getByText(name).closest('tr')!;
}

function renderPage() {
  // A fresh Provider per test isolates the shared category/category-request atoms,
  // matching the isolation the previous per-render useState gave each test.
  return render(
    <Provider>
      <CategoryRequestsPage />
    </Provider>,
  );
}

describe('CategoryRequestsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the heading, KPI counts and defaults to the Pending tab', () => {
    renderPage();
    expect(screen.getByText('Solicitações de categoria')).toBeInTheDocument();
    expect(screen.getByText('Vegan food')).toBeInTheDocument();
    expect(screen.getByText('Glamping')).toBeInTheDocument();
    expect(screen.getByText('Wellness')).toBeInTheDocument();
    expect(screen.queryByText('Pet friendly')).not.toBeInTheDocument();
    expect(screen.queryByText('Street food')).not.toBeInTheDocument();
    expect(screen.queryByText('Instagrammable spots')).not.toBeInTheDocument();
  });

  it('KPI counts match the seed data', () => {
    renderPage();
    expect(screen.getByText('Aguardando revisão').nextSibling).toHaveTextContent('3');
    expect(screen.getByText('Aguardando o solicitante').nextSibling).toHaveTextContent('1');
    expect(screen.getByText('Aprovadas').nextSibling).toHaveTextContent('1');
    expect(screen.getByText('Rejeitadas').nextSibling).toHaveTextContent('1');
  });

  it('switches tabs and filters the table, with "all" showing everything', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /Aguardando o solicitante \(1\)/ }));
    expect(screen.getByText('Pet friendly')).toBeInTheDocument();
    expect(screen.queryByText('Vegan food')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Aprovadas \(1\)/ }));
    expect(screen.getByText('Street food')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Rejeitadas \(1\)/ }));
    expect(screen.getByText('Instagrammable spots')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Todas as solicitações' }));
    expect(screen.getByText('Vegan food')).toBeInTheDocument();
    expect(screen.getByText('Glamping')).toBeInTheDocument();
    expect(screen.getByText('Wellness')).toBeInTheDocument();
    expect(screen.getByText('Pet friendly')).toBeInTheDocument();
    expect(screen.getByText('Street food')).toBeInTheDocument();
    expect(screen.getByText('Instagrammable spots')).toBeInTheDocument();
  });

  it('shows Create/Reject only for Pending rows, and View for every other status', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Todas as solicitações' }));

    const pendingRow = row('Vegan food');
    expect(within(pendingRow).getByRole('button', { name: 'Criar' })).toBeInTheDocument();
    expect(within(pendingRow).getByRole('button', { name: 'Rejeitar' })).toBeInTheDocument();

    for (const name of ['Pet friendly', 'Street food', 'Instagrammable spots']) {
      const otherRow = row(name);
      expect(within(otherRow).queryByRole('button', { name: 'Criar' })).not.toBeInTheDocument();
      expect(within(otherRow).getByRole('button', { name: 'Ver' })).toBeInTheDocument();
    }
  });

  it('row-level Create opens the create-category modal, prefilled from the request and the tree', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(within(row('Vegan food')).getByRole('button', { name: 'Criar' }));

    expect(screen.getByRole('heading', { name: 'Criar categoria' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Solicitado por Marina Alves. Confirme onde ela deve ficar na árvore antes de criar.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue('Vegan food')).toBeInTheDocument();
    expect(screen.getByLabelText('Categoria principal')).toHaveValue('food');
    expect(screen.getByLabelText('Subcategoria')).toHaveValue('food/restaurant');
    expect(screen.getByDisplayValue('Restaurante')).toBeInTheDocument();
    expect(screen.getByText('Food › Restaurant › Vegan food')).toBeInTheDocument();
  });

  it('confirming the create-category modal toasts and moves the row to Approved', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(within(row('Vegan food')).getByRole('button', { name: 'Criar' }));
    await user.click(screen.getByRole('button', { name: 'Criar categoria' }));

    expect(toast.success).toHaveBeenCalledWith(
      'Categoria criada',
      expect.objectContaining({
        description: '"Vegan food" foi adicionada sob Food › Restaurant.',
      }),
    );
    expect(screen.queryByRole('heading', { name: 'Criar categoria' })).not.toBeInTheDocument();
    expect(screen.queryByText('Vegan food')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pendentes \(2\)/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Aprovadas \(2\)/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Aprovadas \(2\)/ }));
    expect(screen.getByText('Vegan food')).toBeInTheDocument();
  });

  it('switching the create-category modal to "Parent" level creates a top-level category', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(within(row('Wellness')).getByRole('button', { name: 'Criar' }));
    await user.click(screen.getByRole('button', { name: 'Categoria principal' }));

    expect(screen.queryByLabelText('Categoria principal')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog').textContent).toContain('Wellness');

    await user.click(screen.getByRole('button', { name: 'Criar categoria' }));

    expect(toast.success).toHaveBeenCalledWith(
      'Categoria principal criada',
      expect.objectContaining({ description: '"Wellness" foi adicionada à árvore.' }),
    );
  });

  it('row-level Reject toasts and moves the row to Rejected', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(within(row('Glamping')).getByRole('button', { name: 'Rejeitar' }));

    expect(toast.error).toHaveBeenCalledWith(
      'Solicitação rejeitada',
      expect.objectContaining({ description: 'Diego Ramos foi notificado(a).' }),
    );
    expect(screen.queryByText('Glamping')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pendentes \(2\)/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Rejeitadas \(2\)/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Rejeitadas \(2\)/ }));
    expect(screen.getByText('Glamping')).toBeInTheDocument();
  });

  it('opens the drawer on row click with the right title, badge and details', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(row('Vegan food'));

    expect(screen.getByRole('heading', { name: 'Vegan food' })).toBeInTheDocument();
    expect(screen.getByText('Proposta sob Food › Restaurant')).toBeInTheDocument();
    expect(screen.getByText('Marina Alves · @marina.alves')).toBeInTheDocument();
    expect(screen.getByText('34 usuários pediram isso')).toBeInTheDocument();
    expect(
      screen.getByText(
        'I keep tagging vegan restaurants as "Italian food" because there is no better fit. 12 places in my lists would move here.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Closest existing: Food › Restaurant › Italian food'),
    ).toBeInTheDocument();
  });

  it('shows 3 action buttons for a Pending request in the drawer, and toasts + closes on each', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(row('Vegan food'));

    expect(screen.getByRole('button', { name: 'Pedir mais detalhes' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Pedir mais detalhes' }));

    expect(toast.info).toHaveBeenCalledWith(
      'Detalhes solicitados',
      expect.objectContaining({
        description: 'Marina Alves foi solicitado(a) a esclarecer o pedido.',
      }),
    );
    expect(screen.queryByRole('heading', { name: 'Vegan food' })).not.toBeInTheDocument();
  });

  it('shows only Close for an Approved request in the drawer', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /Aprovadas \(1\)/ }));
    await user.click(within(row('Street food')).getByRole('button', { name: 'Ver' }));

    expect(screen.getByRole('button', { name: 'Fechar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Criar categoria' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rejeitar' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByRole('heading', { name: 'Street food' })).not.toBeInTheDocument();
  });

  it("shows 3 action buttons for a 'More info' request opened from its row", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /Aguardando o solicitante \(1\)/ }));
    await user.click(within(row('Pet friendly')).getByRole('button', { name: 'Ver' }));

    expect(screen.getByRole('button', { name: 'Pedir mais detalhes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rejeitar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar categoria' })).toBeInTheDocument();
  });

  it('creating a category from a request makes it show up for real on the Categories screen', async () => {
    const user = userEvent.setup();
    render(
      <Provider>
        <CategoryRequestsPage />
        <CategoriesPage />
      </Provider>,
    );

    // "Food" and "Food > Restaurant" are open by default on the Categories screen, so the
    // new child is visible immediately, no expand click needed.
    expect(screen.queryByText('food/restaurant/vegan-food')).not.toBeInTheDocument();

    await user.click(within(row('Vegan food')).getByRole('button', { name: 'Criar' }));
    await user.click(screen.getByRole('button', { name: 'Criar categoria' }));

    expect(screen.getByText('food/restaurant/vegan-food')).toBeInTheDocument();
  });

  it('switching back from Parent to Subcategory creates under the parent shown, not at the top level', async () => {
    const user = userEvent.setup();
    render(
      <Provider>
        <CategoryRequestsPage />
        <CategoriesPage />
      </Provider>,
    );
    await user.click(within(row('Wellness')).getByRole('button', { name: 'Criar' }));
    await user.click(screen.getByRole('button', { name: 'Categoria principal' }));
    await user.click(screen.getByRole('button', { name: 'Subcategoria' }));

    const parentSelect = screen.getByLabelText('Categoria principal') as HTMLSelectElement;
    const shownParent = parentSelect.value;
    expect(shownParent).not.toBe('');

    await user.click(screen.getByRole('button', { name: 'Criar categoria' }));

    expect(toast.success).not.toHaveBeenCalledWith('Categoria principal criada', expect.anything());
    expect(screen.getByText(`${shownParent}/wellness`)).toBeInTheDocument();
  });

  it('refuses to approve into a name that already exists under the same parent', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(within(row('Wellness')).getByRole('button', { name: 'Criar' }));
    const nameInput = screen.getByLabelText('Nome da categoria');
    await user.clear(nameInput);
    await user.type(nameInput, 'Outdoor');
    await user.click(screen.getByRole('button', { name: 'Criar categoria' }));

    expect(toast.error).toHaveBeenCalledWith('Já existe', expect.anything());
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Criar categoria' })).toBeInTheDocument();
  });

  it('falls back to the first parent shown when the request parent no longer exists', async () => {
    const user = userEvent.setup();
    const store = createStore();
    store.set(
      categoryRequestsAtom,
      getCategoryRequests().map((r) =>
        r.id === 'wellness' ? { ...r, parent: 'Renamed group' } : r,
      ),
    );
    render(
      <Provider store={store}>
        <CategoryRequestsPage />
        <CategoriesPage />
      </Provider>,
    );
    await user.click(within(row('Wellness')).getByRole('button', { name: 'Criar' }));

    const parentSelect = screen.getByLabelText('Categoria principal') as HTMLSelectElement;
    const firstParent = store.get(categoryTreeAtom)[0]!.slug;
    expect(parentSelect.value).toBe(firstParent);
    expect(screen.getByRole('button', { name: 'Criar categoria' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Criar categoria' }));

    expect(screen.getByText(`${firstParent}/wellness`)).toBeInTheDocument();
  });

  it('disables Create while the chosen parent has no subcategory to nest a child under', async () => {
    const user = userEvent.setup();
    const store = createStore();
    store.set(categoryTreeAtom, [
      {
        name: 'Empty group',
        slug: 'empty-group',
        items: 0,
        status: 'Active',
        icon: 'tag',
        children: [],
      },
      ...getCategoryTree(),
    ]);
    render(
      <Provider store={store}>
        <CategoryRequestsPage />
      </Provider>,
    );
    await user.click(within(row('Wellness')).getByRole('button', { name: 'Criar' }));
    await user.selectOptions(screen.getByLabelText('Categoria principal'), 'empty-group');
    await user.click(screen.getByRole('button', { name: 'Categoria filha' }));

    expect(screen.getByRole('button', { name: 'Criar categoria' })).toBeDisabled();
  });
});
