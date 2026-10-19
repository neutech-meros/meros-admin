import { atom } from 'jotai';

import { getCategoryTree, type CategoryNode } from '@/lib/mocks/admin/categories';

// Shared across /catalog/categories and /catalog/requests so an approval made from the
// requests screen is reflected in the categories tree without a page reload.
export const categoryTreeAtom = atom<CategoryNode[]>(getCategoryTree());
