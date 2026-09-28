import { fireEvent, render, screen } from '@testing-library/react';
import { toast } from 'sonner';

import type { ReportedItem } from '@/lib/mocks/admin/moderation';
import enUS from '@/locales/enUS.json';
import esES from '@/locales/esES.json';
import ptBR from '@/locales/ptBR.json';

import { ReportDetailDrawer } from '../ReportDetailDrawer';

jest.mock('sonner', () => ({
  toast: { info: jest.fn(), success: jest.fn(), error: jest.fn() },
}));

// The test setup initializes i18n with lng 'pt', so assertions below use the ptBR strings.

const baseReport: ReportedItem = {
  id: 'report-42',
  title: 'Hidden waterfalls of Chapada',
  kind: 'Travel list',
  reason: 'Illegal or dangerous content',
  severity: 'High',
  excerpt: 'Includes exact GPS pins for a closed trail.',
  where: 'Travel list · 9 stops · published 01/08/2026',
  owner: 'Marina Alves',
  handle: '@marina.alves',
  account: 'Creator · Verified',
  accountStatus: 'Active',
  priorAction: '1 warning issued in June 2026.',
  reporters: [
    {
      name: 'Beatriz Lima',
      handle: '@bia.lima',
      reason: 'Protected area exposed',
      date: '12 Aug 2026, 09:14',
    },
    {
      name: 'Tiago Fonseca',
      handle: '@tiago.f',
      reason: 'Encourages illegal access',
      date: '13 Aug 2026, 18:42',
    },
  ],
  initials: 'MA',
  avatarColor: '#7F00FF',
};

function renderDrawer(report: ReportedItem | null) {
  const onClose = jest.fn();
  const onKeep = jest.fn();
  const onRemove = jest.fn();
  render(
    <ReportDetailDrawer report={report} onClose={onClose} onKeep={onKeep} onRemove={onRemove} />,
  );
  return { onClose, onKeep, onRemove };
}

describe('admin.moderation.drawer locale coverage', () => {
  const en = enUS.admin.moderation.drawer as Record<string, string>;
  const locales = {
    ptBR: ptBR.admin.moderation.drawer as Record<string, string>,
    esES: esES.admin.moderation.drawer as Record<string, string>,
  };

  it.each(Object.entries(locales))(
    '%s defines every enUS key with a translated value',
    (_, loc) => {
      expect(Object.keys(loc).sort()).toEqual(Object.keys(en).sort());
      // accountLine is mostly interpolation placeholders, but still contains a translated word.
      for (const key of Object.keys(en)) {
        expect(loc[key]).toBeTruthy();
        expect(loc[key]).not.toBe(en[key]);
      }
    },
  );
});

describe('ReportDetailDrawer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders no drawer content when report is null', () => {
    renderDrawer(null);
    expect(screen.queryByText(/^Denúncia:/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Manter conteúdo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders every block of the report', () => {
    renderDrawer(baseReport);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Denúncia: Travel list')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    // Title appears in both the header description and the cover block.
    expect(screen.getAllByText('Hidden waterfalls of Chapada')).toHaveLength(2);
    expect(screen.getByText('Conteúdo denunciado')).toBeInTheDocument();
    expect(screen.getByText('Includes exact GPS pins for a closed trail.')).toBeInTheDocument();
    expect(screen.getByText('Tipo de conteúdo')).toBeInTheDocument();
    expect(screen.getByText('Travel list')).toBeInTheDocument();
    expect(screen.getByText('Onde está publicado')).toBeInTheDocument();
    expect(screen.getByText('Travel list · 9 stops · published 01/08/2026')).toBeInTheDocument();
    expect(screen.getByText('Conta')).toBeInTheDocument();
    expect(
      screen.getByText('Marina Alves · @marina.alves · Creator · Verified · conta active'),
    ).toBeInTheDocument();
    expect(screen.getByText('Motivo')).toBeInTheDocument();
    expect(screen.getByText('Illegal or dangerous content')).toBeInTheDocument();
    expect(screen.getByText('Denunciado por 2 usuários')).toBeInTheDocument();
    expect(screen.getByText('Beatriz Lima')).toBeInTheDocument();
    expect(screen.getByText('Protected area exposed')).toBeInTheDocument();
    expect(screen.getByText('12 Aug 2026, 09:14')).toBeInTheDocument();
    expect(screen.getByText('Tiago Fonseca')).toBeInTheDocument();
    expect(screen.getByText('Encourages illegal access')).toBeInTheDocument();
    expect(screen.getByText('Histórico da conta')).toBeInTheDocument();
    expect(screen.getByText('1 warning issued in June 2026.')).toBeInTheDocument();
  });

  it('uses the singular heading for exactly one reporter', () => {
    renderDrawer({ ...baseReport, reporters: [baseReport.reporters[0]] });
    expect(screen.getByText('Denunciado por 1 usuário')).toBeInTheDocument();
    expect(screen.queryByText('Denunciado por 1 usuários')).not.toBeInTheDocument();
  });

  it('calls onKeep with the report id and does not call onClose', () => {
    const { onKeep, onRemove, onClose } = renderDrawer(baseReport);
    fireEvent.click(screen.getByRole('button', { name: 'Manter conteúdo' }));
    expect(onKeep).toHaveBeenCalledTimes(1);
    expect(onKeep).toHaveBeenCalledWith('report-42');
    expect(onRemove).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onRemove with the report id and does not call onClose', () => {
    const { onKeep, onRemove, onClose } = renderDrawer(baseReport);
    fireEvent.click(screen.getByRole('button', { name: 'Remover conteúdo' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith('report-42');
    expect(onKeep).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows an "Open account" button that toasts instead of navigating (Users & Creators isn\'t built here yet)', () => {
    const { onKeep, onRemove, onClose } = renderDrawer(baseReport);
    const button = screen.getByRole('button', { name: 'Abrir conta' });
    fireEvent.click(button);
    expect(toast.info).toHaveBeenCalledTimes(1);
    expect(toast.info).toHaveBeenCalledWith(
      'Abrir conta',
      expect.objectContaining({
        description: expect.stringContaining('Marina Alves') as string,
      }),
    );
    expect(onKeep).not.toHaveBeenCalled();
    expect(onRemove).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
