import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';

import CategoryRequestsPage from '../page';

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

function row(name: string) {
  return screen.getByText(name).closest('tr')!;
}

describe('CategoryRequestsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the heading, KPI counts and defaults to the Pending tab', () => {
    render(<CategoryRequestsPage />);
    expect(screen.getByText('Solicitações de categoria')).toBeInTheDocument();
    expect(screen.getByText('Vegan food')).toBeInTheDocument();
    expect(screen.getByText('Glamping')).toBeInTheDocument();
    expect(screen.getByText('Wellness')).toBeInTheDocument();
    expect(screen.queryByText('Pet friendly')).not.toBeInTheDocument();
    expect(screen.queryByText('Street food')).not.toBeInTheDocument();
    expect(screen.queryByText('Instagrammable spots')).not.toBeInTheDocument();
  });

  it('KPI counts match the seed data', () => {
    render(<CategoryRequestsPage />);
    expect(screen.getByText('Aguardando revisão').nextSibling).toHaveTextContent('3');
    expect(screen.getByText('Aguardando o solicitante').nextSibling).toHaveTextContent('1');
    expect(screen.getByText('Aprovadas').nextSibling).toHaveTextContent('1');
    expect(screen.getByText('Rejeitadas').nextSibling).toHaveTextContent('1');
  });

  it('switches tabs and filters the table, with "all" showing everything', async () => {
    const user = userEvent.setup();
    render(<CategoryRequestsPage />);

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
    render(<CategoryRequestsPage />);
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

  it('row-level Create toasts and does not move the row to another tab', async () => {
    const user = userEvent.setup();
    render(<CategoryRequestsPage />);
    await user.click(within(row('Vegan food')).getByRole('button', { name: 'Criar' }));

    expect(toast.success).toHaveBeenCalledWith(
      'Categoria criada',
      expect.objectContaining({
        description: '"Vegan food" foi adicionada sob Food › Restaurant.',
      }),
    );
    expect(screen.getByText('Vegan food')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pendentes \(3\)/ })).toBeInTheDocument();
  });

  it('row-level Reject toasts and does not move the row to another tab', async () => {
    const user = userEvent.setup();
    render(<CategoryRequestsPage />);
    await user.click(within(row('Glamping')).getByRole('button', { name: 'Rejeitar' }));

    expect(toast.error).toHaveBeenCalledWith(
      'Solicitação rejeitada',
      expect.objectContaining({ description: 'Diego Ramos foi notificado(a).' }),
    );
    expect(screen.getByText('Glamping')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pendentes \(3\)/ })).toBeInTheDocument();
  });

  it('opens the drawer on row click with the right title, badge and details', async () => {
    const user = userEvent.setup();
    render(<CategoryRequestsPage />);
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
    render(<CategoryRequestsPage />);
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
    render(<CategoryRequestsPage />);
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
    render(<CategoryRequestsPage />);
    await user.click(screen.getByRole('button', { name: /Aguardando o solicitante \(1\)/ }));
    await user.click(within(row('Pet friendly')).getByRole('button', { name: 'Ver' }));

    expect(screen.getByRole('button', { name: 'Pedir mais detalhes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rejeitar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar categoria' })).toBeInTheDocument();
  });
});
