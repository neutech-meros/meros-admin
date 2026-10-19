import { atom } from 'jotai';

import { getCategoryRequests, type CategoryRequest } from '@/lib/mocks/admin/category-requests';

export const categoryRequestsAtom = atom<CategoryRequest[]>(getCategoryRequests());
