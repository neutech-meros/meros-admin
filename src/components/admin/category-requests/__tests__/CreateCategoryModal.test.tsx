import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import i18n from '@/i18n';
import type { CategoriesTreeApiResponse } from '@/lib/admin/categories-api';
import type { CategoryRequestItem } from '@/lib/admin/category-requests-api';

import { CreateCategoryModal } from '../CreateCategoryModal';

beforeAll(async () => {
  await i18n.changeLanguage('en');
});
afterAll(async () => {
  await i18n.changeLanguage('pt');
});

const TREE: CategoriesTreeApiResponse = [
  {
    id: 'group-food',
    name: 'Food',
    key: 'food',
    status: 'ACTIVE',
    itemsCount: 3,
    categories: [
      {
        id: 'cat-restaurants',
        name: 'Restaurants',
        key: 'restaurants',
        status: 'ACTIVE',
        itemsCount: 2,
        subcategories: [],
      },
      {
        id: 'cat-bars',
        name: 'Bars',
        key: 'bars',
        status: 'ACTIVE',
        itemsCount: 1,
        subcategories: [],
      },
    ],
  },
  {
    id: 'group-stays',
    name: 'Stays',
    key: 'stays',
    status: 'ACTIVE',
    itemsCount: 0,
    categories: [],
  },
];

const REQUEST: CategoryRequestItem = {
  id: 'r-1',
  name: 'Rooftop Bars',
  status: 'Pending',
  level: null,
  requester: 'ana',
  avatarUrl: null,
  date: 'Oct 1, 2026',
  decision: null,
};

function serveTree(...responses: Array<{ status: number; body?: unknown }>) {
  const fetchMock = jest.fn();
  for (const { status, body } of responses) {
    fetchMock.mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    });
  }
  global.fetch = fetchMock;
  return fetchMock;
}

function renderModal(overrides: Partial<Parameters<typeof CreateCategoryModal>[0]> = {}) {
  const props = {
    request: REQUEST,
    submitting: false,
    onCancel: jest.fn(),
    onCreate: jest.fn(),
    ...overrides,
  };
  render(<CreateCategoryModal {...props} />);
  return props;
}

async function loaded() {
  await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  return screen.getByRole('button', { name: 'Create category' });
}

describe('CreateCategoryModal', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('loads the real tree and shows the proposed name read-only', async () => {
    const fetchMock = serveTree({ status: 200, body: TREE });
    renderModal();

    expect(screen.getByRole('status')).toHaveTextContent('Loading categories...');
    await loaded();
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/categories');
    expect(screen.getByText('Rooftop Bars', { selector: '[data-testid="proposed-name"]' }));
    expect(screen.queryByRole('textbox', { name: 'Category name' })).not.toBeInTheDocument();
  });

  it('shows an error with a retry when the tree fails to load', async () => {
    const fetchMock = serveTree(
      { status: 502, body: { error: 'Failed' } },
      { status: 200, body: TREE },
    );
    const user = userEvent.setup();
    renderModal();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't load the categories. Please try again.",
    );
    expect(screen.getByRole('button', { name: 'Create category' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: 'Create category' })).toBeEnabled();
  });

  it('creates a top-level category as a GROUP with the chosen icon and status', async () => {
    serveTree({ status: 200, body: TREE });
    const user = userEvent.setup();
    const { onCreate } = renderModal();
    await loaded();

    await user.click(screen.getByRole('button', { name: 'Deactivated' }));
    await user.click(screen.getByRole('button', { name: 'Create category' }));

    expect(onCreate).toHaveBeenCalledWith(
      { level: 'GROUP', iconKey: expect.any(String), status: 'INACTIVE' },
      { name: 'Rooftop Bars', parentPath: null },
    );
  });

  it('creates a subcategory as a CATEGORY under the chosen parent group', async () => {
    serveTree({ status: 200, body: TREE });
    const user = userEvent.setup();
    const { onCreate } = renderModal();
    await loaded();

    await user.click(screen.getByRole('button', { name: 'Subcategory' }));
    const parent = screen.getByLabelText('Parent category');
    expect(
      within(parent)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Food', 'Stays']);
    await user.selectOptions(parent, 'group-stays');
    await user.click(screen.getByRole('button', { name: 'Create category' }));

    expect(onCreate).toHaveBeenCalledWith(
      { level: 'CATEGORY', groupId: 'group-stays', iconKey: expect.any(String), status: 'ACTIVE' },
      { name: 'Rooftop Bars', parentPath: 'Stays' },
    );
  });

  it('creates a child category as a SUBCATEGORY under the chosen subcategory', async () => {
    serveTree({ status: 200, body: TREE });
    const user = userEvent.setup();
    const { onCreate } = renderModal();
    await loaded();

    await user.click(screen.getByRole('button', { name: 'Child category' }));
    const sub = screen.getByLabelText('Subcategory');
    expect(
      within(sub)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Restaurants', 'Bars']);
    await user.selectOptions(sub, 'cat-bars');
    await user.click(screen.getByRole('button', { name: 'Create category' }));

    expect(onCreate).toHaveBeenCalledWith(
      {
        level: 'SUBCATEGORY',
        categoryId: 'cat-bars',
        iconKey: expect.any(String),
        status: 'ACTIVE',
      },
      { name: 'Rooftop Bars', parentPath: 'Food › Bars' },
    );
  });

  it('sends the icon picked in the icon field', async () => {
    serveTree({ status: 200, body: TREE });
    const user = userEvent.setup();
    const { onCreate } = renderModal();
    await loaded();

    await user.selectOptions(screen.getByLabelText('Icon'), 'barNightlife');
    await user.click(screen.getByRole('button', { name: 'Create category' }));

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'GROUP', iconKey: 'barNightlife' }),
      expect.anything(),
    );
  });

  it('cannot create a child category under a parent without subcategories', async () => {
    serveTree({ status: 200, body: TREE });
    const user = userEvent.setup();
    renderModal();
    await loaded();

    await user.click(screen.getByRole('button', { name: 'Child category' }));
    await user.selectOptions(screen.getByLabelText('Parent category'), 'group-stays');

    expect(screen.getByRole('button', { name: 'Create category' })).toBeDisabled();
  });

  it('starts at the level the request already has', async () => {
    serveTree({ status: 200, body: TREE });
    renderModal({ request: { ...REQUEST, level: 'Subcategory' } });
    await loaded();

    expect(screen.getByRole('button', { name: 'Subcategory' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByLabelText('Parent category')).toHaveValue('group-food');
  });

  it('disables Create while the approval is being sent', async () => {
    serveTree({ status: 200, body: TREE });
    renderModal({ submitting: true });

    expect(await screen.findByRole('button', { name: 'Create category' })).toBeDisabled();
  });
});
