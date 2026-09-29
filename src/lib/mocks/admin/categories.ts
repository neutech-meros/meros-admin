export interface CategoryNode {
  name: string;
  slug: string;
  items: number;
  status: 'Active' | 'Deactivated';
  icon: string;
  children?: CategoryNode[];
}

// Literal values ported from Meros Admin (standalone).html, extracted template lines 4802-4851.
// Icon values are semantic keys from the curated set in src/lib/admin/category-icons.ts
// (admin.categories.modal.iconOptions.*), not raw Lucide component names.
const SEED: CategoryNode[] = [
  {
    name: 'Food',
    slug: 'food',
    items: 4820,
    status: 'Active',
    icon: 'restaurant',
    children: [
      {
        name: 'Restaurant',
        slug: 'food/restaurant',
        items: 2610,
        status: 'Active',
        icon: 'restaurant',
        children: [
          {
            name: 'Italian food',
            slug: 'food/restaurant/italian',
            items: 486,
            status: 'Active',
            icon: 'restaurant',
          },
          {
            name: 'Japanese food',
            slug: 'food/restaurant/japanese',
            items: 402,
            status: 'Active',
            icon: 'restaurant',
          },
          {
            name: 'Seafood',
            slug: 'food/restaurant/seafood',
            items: 318,
            status: 'Active',
            icon: 'restaurant',
          },
          {
            name: 'Steakhouse',
            slug: 'food/restaurant/steakhouse',
            items: 244,
            status: 'Deactivated',
            icon: 'restaurant',
          },
        ],
      },
      {
        name: 'Bars & nightlife',
        slug: 'food/bars',
        items: 1310,
        status: 'Active',
        icon: 'barNightlife',
        children: [
          {
            name: 'Rooftop bars',
            slug: 'food/bars/rooftop',
            items: 212,
            status: 'Active',
            icon: 'barNightlife',
          },
          {
            name: 'Live music',
            slug: 'food/bars/live-music',
            items: 168,
            status: 'Active',
            icon: 'barNightlife',
          },
        ],
      },
      {
        name: 'Cafés',
        slug: 'food/cafes',
        items: 900,
        status: 'Active',
        icon: 'cafe',
        children: [
          {
            name: 'Specialty coffee',
            slug: 'food/cafes/specialty',
            items: 331,
            status: 'Active',
            icon: 'cafe',
          },
          {
            name: 'Bakeries',
            slug: 'food/cafes/bakeries',
            items: 289,
            status: 'Active',
            icon: 'cafe',
          },
        ],
      },
    ],
  },
  {
    name: 'Stays',
    slug: 'stays',
    items: 3140,
    status: 'Active',
    icon: 'stay',
    children: [
      {
        name: 'Hotels',
        slug: 'stays/hotels',
        items: 1720,
        status: 'Active',
        icon: 'hotel',
        children: [
          {
            name: 'Boutique hotels',
            slug: 'stays/hotels/boutique',
            items: 402,
            status: 'Active',
            icon: 'hotel',
          },
          {
            name: 'Resorts',
            slug: 'stays/hotels/resorts',
            items: 265,
            status: 'Active',
            icon: 'hotel',
          },
        ],
      },
      {
        name: 'Vacation rentals',
        slug: 'stays/rentals',
        items: 1420,
        status: 'Active',
        icon: 'rental',
        children: [
          {
            name: 'Beach houses',
            slug: 'stays/rentals/beach',
            items: 512,
            status: 'Active',
            icon: 'beach',
          },
          {
            name: 'Cabins',
            slug: 'stays/rentals/cabins',
            items: 208,
            status: 'Deactivated',
            icon: 'rental',
          },
        ],
      },
    ],
  },
  {
    name: 'Experiences',
    slug: 'experiences',
    items: 2680,
    status: 'Active',
    icon: 'experience',
    children: [
      {
        name: 'Outdoor',
        slug: 'experiences/outdoor',
        items: 1490,
        status: 'Active',
        icon: 'outdoor',
        children: [
          {
            name: 'Hiking trails',
            slug: 'experiences/outdoor/hiking',
            items: 604,
            status: 'Active',
            icon: 'outdoor',
          },
          {
            name: 'Diving',
            slug: 'experiences/outdoor/diving',
            items: 231,
            status: 'Active',
            icon: 'beach',
          },
          {
            name: 'Surfing',
            slug: 'experiences/outdoor/surfing',
            items: 187,
            status: 'Active',
            icon: 'beach',
          },
        ],
      },
      {
        name: 'Culture',
        slug: 'experiences/culture',
        items: 1190,
        status: 'Active',
        icon: 'culture',
        children: [
          {
            name: 'Museums',
            slug: 'experiences/culture/museums',
            items: 356,
            status: 'Active',
            icon: 'culture',
          },
          {
            name: 'Historic sites',
            slug: 'experiences/culture/historic',
            items: 274,
            status: 'Active',
            icon: 'culture',
          },
        ],
      },
    ],
  },
  {
    name: 'Transport',
    slug: 'transport',
    items: 760,
    status: 'Active',
    icon: 'transport',
    children: [
      {
        name: 'Transfers',
        slug: 'transport/transfers',
        items: 480,
        status: 'Active',
        icon: 'transfer',
        children: [
          {
            name: 'Airport transfer',
            slug: 'transport/transfers/airport',
            items: 262,
            status: 'Active',
            icon: 'flight',
          },
          {
            name: 'Private driver',
            slug: 'transport/transfers/private',
            items: 118,
            status: 'Deactivated',
            icon: 'transfer',
          },
        ],
      },
      {
        name: 'Rentals',
        slug: 'transport/rentals',
        items: 280,
        status: 'Deactivated',
        icon: 'transport',
        children: [
          {
            name: 'Car rental',
            slug: 'transport/rentals/car',
            items: 174,
            status: 'Active',
            icon: 'transport',
          },
          {
            name: 'Bike rental',
            slug: 'transport/rentals/bike',
            items: 106,
            status: 'Active',
            icon: 'bikeScooter',
          },
        ],
      },
    ],
  },
];

function cloneTree(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.map((node) => ({
    ...node,
    children: node.children ? cloneTree(node.children) : undefined,
  }));
}

export function getCategoryTree(): CategoryNode[] {
  return cloneTree(SEED);
}
