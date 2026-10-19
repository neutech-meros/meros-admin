import { avatarColorForIndex, initialsOf } from './avatar';

export type CategoryRequestStatus = 'Pending' | 'More info' | 'Approved' | 'Rejected';

export interface CategoryRequest {
  id: string;
  name: string;
  parent: string;
  level: string;
  requester: string;
  handle: string;
  role: string;
  date: string;
  votes: number;
  status: CategoryRequestStatus;
  why: string;
  similar: string;
  initials: string;
  avatarColor: string;
}

// Literal values ported from Meros Admin (standalone).html, extracted template lines 4852-4864.
const SEED: Array<Omit<CategoryRequest, 'initials' | 'avatarColor'>> = [
  {
    id: 'vegan-food',
    name: 'Vegan food',
    parent: 'Food › Restaurant',
    level: 'Child category',
    requester: 'Marina Alves',
    handle: '@marina.alves',
    role: 'Creator · Verified',
    date: '25/08/2026',
    votes: 34,
    status: 'Pending',
    why: 'I keep tagging vegan restaurants as "Italian food" because there is no better fit. 12 places in my lists would move here.',
    similar: 'Closest existing: Food › Restaurant › Italian food',
  },
  {
    id: 'glamping',
    name: 'Glamping',
    parent: 'Stays › Vacation rentals',
    level: 'Child category',
    requester: 'Diego Ramos',
    handle: '@diego.ramos',
    role: 'Business · Trilhas do Sul',
    date: '25/08/2026',
    votes: 21,
    status: 'Pending',
    why: 'Glamping is not a cabin and not a hotel. Guests search for it by name.',
    similar: 'Closest existing: Stays › Vacation rentals › Cabins',
  },
  {
    id: 'wellness',
    name: 'Wellness',
    parent: 'Experiences',
    level: 'Subcategory',
    requester: 'Carla Menezes',
    handle: '@carla.m',
    role: 'Creator',
    date: '24/08/2026',
    votes: 58,
    status: 'Pending',
    why: 'Spas, hot springs and retreats have nowhere to live under Experiences today.',
    similar: 'No close match found',
  },
  {
    id: 'pet-friendly',
    name: 'Pet friendly',
    parent: 'Stays › Hotels',
    level: 'Child category',
    requester: 'Fábio Lima',
    handle: '@fabio.lima',
    role: 'Traveler',
    date: '23/08/2026',
    votes: 9,
    status: 'More info',
    why: 'Travelling with dogs is hard to filter for.',
    similar: 'Might be a filter attribute rather than a category',
  },
  {
    id: 'street-food',
    name: 'Street food',
    parent: 'Food',
    level: 'Subcategory',
    requester: 'Renata Pires',
    handle: '@renata.pires',
    role: 'Creator · Verified',
    date: '21/08/2026',
    votes: 76,
    status: 'Approved',
    why: 'Markets and food trucks do not fit under Restaurant or Cafés.',
    similar: 'Published as Food › Street food on 22/08/2026',
  },
  {
    id: 'instagrammable-spots',
    name: 'Instagrammable spots',
    parent: 'Experiences',
    level: 'Subcategory',
    requester: 'Thiago Costa',
    handle: '@thiago.costa',
    role: 'Traveler',
    date: '19/08/2026',
    votes: 4,
    status: 'Rejected',
    why: 'Places that look good in photos.',
    similar: 'Too subjective — overlaps with existing tags',
  },
];

export function getCategoryRequests(): CategoryRequest[] {
  return SEED.map((request, index) => ({
    ...request,
    initials: initialsOf(request.requester),
    avatarColor: avatarColorForIndex(index),
  }));
}
