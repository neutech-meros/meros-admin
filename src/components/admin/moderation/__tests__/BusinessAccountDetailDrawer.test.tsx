import { fireEvent, render, screen, within } from '@testing-library/react';

import i18n from '@/i18n';
import type {
  BusinessAccountRequest,
  BusinessAccountRequestStatus,
} from '@/lib/admin/business-accounts-api';
import enUS from '@/locales/enUS.json';
import esES from '@/locales/esES.json';
import ptBR from '@/locales/ptBR.json';

import { BusinessAccountDetailDrawer } from '../BusinessAccountDetailDrawer';

// The test setup initializes i18n with lng 'pt'. English is this app's source-of-truth
// locale and matches the mockup copy verbatim, so these tests switch to 'en' and assert
// the mockup's literal strings, then restore 'pt' for the other suites.
beforeAll(async () => {
  await i18n.changeLanguage('en');
});
afterAll(async () => {
  await i18n.changeLanguage('pt');
});

const REASONS = [
  "Documents don't match the company",
  'Tax ID could not be validated',
  'Business not eligible for the platform',
  'Suspected fraudulent request',
  'Other',
];

const baseRequest: BusinessAccountRequest = {
  id: 'br1',
  name: 'Pousada Vista Azul',
  city: 'Paraty, RJ',
  cnpj: '12.345.678/0001-90',
  category: 'Accommodation',
  requester: 'Marina Alves',
  email: 'marina@vistaazul.com.br',
  documentsSubmitted: 3,
  documentsRequired: 3,
  submitted: '24/08/2026',
  status: 'Pending',
  plan: 'Business Pro',
  note: 'Requested to sell hosted stays and list experiences.',
  initials: 'PV',
  avatarColor: '#7F00FF',
};

function withStatus(status: BusinessAccountRequestStatus): BusinessAccountRequest {
  return { ...baseRequest, status };
}

function renderDrawer(request: BusinessAccountRequest | null) {
  const handlers = {
    onClose: jest.fn(),
    onRequestInfo: jest.fn(),
    onApprove: jest.fn(),
    onReject: jest.fn(),
  };
  const utils = render(<BusinessAccountDetailDrawer request={request} {...handlers} />);
  return { ...handlers, ...utils };
}

function openRejectDialog() {
  fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
  return screen.getByRole('dialog', { name: 'Reject business account' });
}

function openApproveDialog() {
  fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
  return screen.getByRole('dialog', { name: 'Approve this business account?' });
}

describe('admin.businessAccounts.drawer locale coverage', () => {
  const en = enUS.admin.businessAccounts.drawer as Record<string, string>;
  const locales = {
    ptBR: ptBR.admin.businessAccounts.drawer as Record<string, string>,
    esES: esES.admin.businessAccounts.drawer as Record<string, string>,
  };

  it.each(Object.entries(locales))(
    '%s defines every enUS key with a translated value',
    (_, loc) => {
      expect(Object.keys(loc).sort()).toEqual(Object.keys(en).sort());
      for (const key of Object.keys(en)) {
        expect(loc[key]).toBeTruthy();
        expect(loc[key]).not.toBe(en[key]);
      }
    },
  );
});

describe('BusinessAccountDetailDrawer', () => {
  it('renders nothing interactive when request is null', () => {
    renderDrawer(null);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders the header and every info row in order for a Pending request', () => {
    renderDrawer(baseRequest);
    const drawer = screen.getByRole('dialog', { name: 'Pousada Vista Azul' });
    expect(within(drawer).getByText('Paraty, RJ')).toBeInTheDocument();
    expect(within(drawer).getByText('Pending')).toBeInTheDocument();

    const expectedRows: Array<[string, string]> = [
      ['Tax ID', '12.345.678/0001-90'],
      ['Category', 'Accommodation'],
      ['Requested plan', 'Business Pro'],
      ['Requested by', 'Marina Alves'],
      ['Contact email', 'marina@vistaazul.com.br'],
      ['Submitted on', '24/08/2026'],
      ['Documents received', '3 of 3'],
      ['Review note', 'Requested to sell hosted stays and list experiences.'],
    ];

    const labels = within(drawer).getAllByTestId('info-row-label');
    const values = within(drawer).getAllByTestId('info-row-value');
    expect(labels.map((el) => el.textContent)).toEqual(expectedRows.map(([label]) => label));
    expect(values.map((el) => el.textContent)).toEqual(expectedRows.map(([, value]) => value));
  });

  it('shows a "no email on file" placeholder in the Contact email row when email is null', () => {
    renderDrawer({ ...baseRequest, email: null });
    const drawer = screen.getByRole('dialog', { name: 'Pousada Vista Azul' });
    expect(within(drawer).getByText('No email on file')).toBeInTheDocument();
  });

  it('does not render a fixed verification checklist', () => {
    renderDrawer(baseRequest);
    expect(screen.queryByText(/Tax ID validated/)).not.toBeInTheDocument();
    expect(screen.queryByText('Checklist')).not.toBeInTheDocument();
  });

  it.each<BusinessAccountRequestStatus>(['Pending', 'More info'])(
    'shows Request info / Reject / Approve (not Close) for a %s request',
    (status) => {
      renderDrawer(withStatus(status));
      expect(screen.getByRole('button', { name: 'Request info' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
      // The Sheet's own icon close button is labeled "Close" via sr-only text, so match
      // the footer action by its exact visible text instead of by accessible name.
      expect(screen.queryByTestId('drawer-close-action')).not.toBeInTheDocument();
    },
  );

  it.each<BusinessAccountRequestStatus>(['Approved', 'Rejected'])(
    'shows only Close for a %s request',
    (status) => {
      const { onClose } = renderDrawer(withStatus(status));
      expect(screen.queryByRole('button', { name: 'Request info' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
      const close = screen.getByTestId('drawer-close-action');
      expect(close).toHaveTextContent('Close');
      fireEvent.click(close);
      expect(onClose).toHaveBeenCalledTimes(1);
    },
  );

  it('Request info calls onRequestInfo with the id, closes the drawer, and opens no dialog', () => {
    const { onRequestInfo, onApprove, onReject, onClose } = renderDrawer(baseRequest);
    fireEvent.click(screen.getByRole('button', { name: 'Request info' }));
    expect(onRequestInfo).toHaveBeenCalledWith('br1');
    expect(onClose).toHaveBeenCalled();
    expect(onApprove).not.toHaveBeenCalled();
    expect(onReject).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('dialog', { name: 'Reject business account' }),
    ).not.toBeInTheDocument();
  });

  it('Approve opens a confirmation dialog without calling anything or closing the drawer', () => {
    const { onApprove, onClose } = renderDrawer(baseRequest);
    const dialog = openApproveDialog();

    expect(
      within(dialog).getByText(
        "Pousada Vista Azul will become active and verified. This can't be undone.",
      ),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Approve account' })).toBeInTheDocument();

    expect(onApprove).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('confirming Approve calls onApprove with the id, closes the drawer, and opens no dialog', () => {
    const { onRequestInfo, onApprove, onReject, onClose } = renderDrawer(baseRequest);
    const dialog = openApproveDialog();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Approve account' }));

    expect(onApprove).toHaveBeenCalledWith('br1');
    expect(onClose).toHaveBeenCalled();
    expect(onRequestInfo).not.toHaveBeenCalled();
    expect(onReject).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('dialog', { name: 'Approve this business account?' }),
    ).not.toBeInTheDocument();
  });

  it('Cancel on the Approve dialog does not call onApprove and keeps the drawer open', () => {
    const { onApprove, onClose } = renderDrawer(baseRequest);
    const dialog = openApproveDialog();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(
      screen.queryByRole('dialog', { name: 'Approve this business account?' }),
    ).not.toBeInTheDocument();
    expect(onApprove).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Pousada Vista Azul' })).toBeInTheDocument();
  });

  it('Reject opens the confirmation dialog without calling anything or closing the drawer', () => {
    const { onReject, onClose } = renderDrawer(baseRequest);
    const dialog = openRejectDialog();

    expect(
      within(dialog).getByText(
        'Marina Alves receives an email explaining the decision. Pousada Vista Azul stays on a personal account.',
      ),
    ).toBeInTheDocument();

    const reason = within(dialog).getByLabelText('Reason') as HTMLSelectElement;
    expect(reason).toBeRequired();
    expect(reason.value).toBe(REASONS[0]);
    expect(Array.from(reason.options).map((o) => o.textContent)).toEqual(REASONS);

    const details = within(dialog).getByLabelText(/Additional details/) as HTMLTextAreaElement;
    expect(details).toHaveAttribute(
      'placeholder',
      'Add anything that helps the requester fix and resubmit...',
    );
    expect(within(dialog).getByText(/optional/)).toBeInTheDocument();
    expect(
      within(dialog).getByText('This text is included in the email, word for word.'),
    ).toBeInTheDocument();
    expect(within(dialog).getByText('Sending to marina@vistaazul.com.br')).toBeInTheDocument();

    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Reject and send email' }),
    ).toBeInTheDocument();

    expect(onReject).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows a "no email on file" note in the Reject dialog when email is null', () => {
    renderDrawer({ ...baseRequest, email: null });
    const dialog = openRejectDialog();
    expect(
      within(dialog).getByText("No email on file — the requester won't be notified."),
    ).toBeInTheDocument();
    expect(within(dialog).queryByText(/^Sending to/)).not.toBeInTheDocument();
  });

  it('confirming calls onReject with the id, selected reason, and trimmed details, then closes', () => {
    const { onReject, onClose } = renderDrawer(baseRequest);
    const dialog = openRejectDialog();

    fireEvent.change(within(dialog).getByLabelText('Reason'), {
      target: { value: 'Suspected fraudulent request' },
    });
    fireEvent.change(within(dialog).getByLabelText(/Additional details/), {
      target: { value: '  Please resend the contract.  ' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reject and send email' }));

    expect(onReject).toHaveBeenCalledTimes(1);
    expect(onReject).toHaveBeenCalledWith(
      'br1',
      'Suspected fraudulent request',
      'Please resend the contract.',
    );
    expect(onClose).toHaveBeenCalled();
    expect(
      screen.queryByRole('dialog', { name: 'Reject business account' }),
    ).not.toBeInTheDocument();
  });

  it('confirming with blank details passes null as the note and the default reason', () => {
    const { onReject } = renderDrawer(baseRequest);
    const dialog = openRejectDialog();
    fireEvent.change(within(dialog).getByLabelText(/Additional details/), {
      target: { value: '   ' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reject and send email' }));
    expect(onReject).toHaveBeenCalledWith('br1', REASONS[0], null);
  });

  it('Cancel closes the dialog without calling onReject or closing the drawer', () => {
    const { onReject, onClose } = renderDrawer(baseRequest);
    const dialog = openRejectDialog();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(
      screen.queryByRole('dialog', { name: 'Reject business account' }),
    ).not.toBeInTheDocument();
    expect(onReject).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Pousada Vista Azul' })).toBeInTheDocument();
  });

  it('resets a half-filled reject form when switching to a different request', () => {
    const { rerender, onClose, onRequestInfo, onApprove, onReject } = renderDrawer(baseRequest);
    let dialog = openRejectDialog();
    fireEvent.change(within(dialog).getByLabelText('Reason'), { target: { value: 'Other' } });
    fireEvent.change(within(dialog).getByLabelText(/Additional details/), {
      target: { value: 'draft' },
    });

    const next: BusinessAccountRequest = {
      ...baseRequest,
      id: 'br2',
      name: 'Trilhas do Sul Turismo',
      requester: 'Diego Ramos',
      email: 'diego@trilhasdosul.com',
    };
    rerender(
      <BusinessAccountDetailDrawer
        request={next}
        onClose={onClose}
        onRequestInfo={onRequestInfo}
        onApprove={onApprove}
        onReject={onReject}
      />,
    );
    expect(
      screen.queryByRole('dialog', { name: 'Reject business account' }),
    ).not.toBeInTheDocument();

    dialog = openRejectDialog();
    expect((within(dialog).getByLabelText('Reason') as HTMLSelectElement).value).toBe(REASONS[0]);
    expect((within(dialog).getByLabelText(/Additional details/) as HTMLTextAreaElement).value).toBe(
      '',
    );
    expect(within(dialog).getByText('Sending to diego@trilhasdosul.com')).toBeInTheDocument();
  });
});
