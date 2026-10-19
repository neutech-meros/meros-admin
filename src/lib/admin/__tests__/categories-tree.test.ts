import { resolveCategoryIcon } from '@/lib/admin/category-icons';
import type { CategoryNode } from '@/lib/mocks/admin/categories';

import {
  activeDescendantNames,
  addCategory,
  applyStatusCascade,
  buildCategoryRows,
  categoryExists,
  collapseAll,
  countLabel,
  defaultOpenMap,
  expandAll,
  findCategoryNode,
  slugify,
  updateCategory,
} from '../categories-tree';

function tree(): CategoryNode[] {
  return [
    {
      name: 'Food',
      slug: 'food',
      items: 100,
      status: 'Active',
      icon: 'restaurant',
      children: [
        {
          name: 'Restaurant',
          slug: 'food/restaurant',
          items: 60,
          status: 'Active',
          icon: 'cafe',
          children: [
            {
              name: 'Italian food',
              slug: 'food/restaurant/italian',
              items: 20,
              status: 'Active',
              icon: 'experience',
            },
            {
              name: 'Steakhouse',
              slug: 'food/restaurant/steakhouse',
              items: 10,
              status: 'Deactivated',
              icon: 'experience',
            },
          ],
        },
        { name: 'Bars', slug: 'food/bars', items: 30, status: 'Active', icon: 'barNightlife' },
      ],
    },
    { name: 'Transport', slug: 'transport', items: 50, status: 'Active', icon: 'transport' },
  ];
}

describe('buildCategoryRows', () => {
  it('defaults food and food/restaurant open, everything else collapsed', () => {
    const rows = buildCategoryRows(tree(), undefined, '');
    const slugs = rows.map((r) => r.slug);
    expect(slugs).toEqual([
      'food',
      'food/restaurant',
      'food/restaurant/italian',
      'food/restaurant/steakhouse',
      'food/bars',
      'transport',
    ]);
  });

  it('respects an explicit open map, including an explicitly emptied one', () => {
    const rows = buildCategoryRows(tree(), {}, '');
    expect(rows.map((r) => r.slug)).toEqual(['food', 'transport']);
  });

  it('opens a specific branch when asked', () => {
    const rows = buildCategoryRows(tree(), { food: true }, '');
    expect(rows.map((r) => r.slug)).toEqual(['food', 'food/restaurant', 'food/bars', 'transport']);
  });

  it('matches by name or slug, case-insensitively, and force-expands ancestors of a match', () => {
    const rows = buildCategoryRows(tree(), {}, 'ITALIAN');
    expect(rows.map((r) => r.slug)).toEqual(['food', 'food/restaurant', 'food/restaurant/italian']);
  });

  it('excludes branches with no match anywhere in their subtree', () => {
    const rows = buildCategoryRows(tree(), {}, 'italian');
    expect(rows.some((r) => r.slug === 'transport')).toBe(false);
    expect(rows.some((r) => r.slug === 'food/bars')).toBe(false);
  });

  it('sets depth, level and hasChildren correctly', () => {
    const rows = buildCategoryRows(tree(), undefined, '');
    const italian = rows.find((r) => r.slug === 'food/restaurant/italian')!;
    expect(italian.depth).toBe(2);
    expect(italian.level).toBe('Child');
    expect(italian.hasChildren).toBe(false);
    const restaurant = rows.find((r) => r.slug === 'food/restaurant')!;
    expect(restaurant.depth).toBe(1);
    expect(restaurant.level).toBe('Subcategory');
    expect(restaurant.hasChildren).toBe(true);
    expect(restaurant.childCount).toBe(2);
  });

  it("resolves each node's own icon at depth 0/1, and hides it at depth 2", () => {
    const rows = buildCategoryRows(tree(), undefined, '');
    expect(rows.find((r) => r.slug === 'food')!.icon).toBe(resolveCategoryIcon('restaurant'));
    expect(rows.find((r) => r.slug === 'food/restaurant')!.icon).toBe(resolveCategoryIcon('cafe'));
    expect(rows.find((r) => r.slug === 'food/restaurant/italian')!.icon).toBeNull();
  });
});

describe('findCategoryNode', () => {
  it('finds a top-level node with depth 0 and no parent', () => {
    const hit = findCategoryNode(tree(), 'transport');
    expect(hit?.depth).toBe(0);
    expect(hit?.parent).toBeNull();
  });

  it('finds a nested node with the right depth and parent', () => {
    const hit = findCategoryNode(tree(), 'food/restaurant/italian');
    expect(hit?.depth).toBe(2);
    expect(hit?.parent?.slug).toBe('food/restaurant');
  });

  it('returns null for a missing slug', () => {
    expect(findCategoryNode(tree(), 'nope')).toBeNull();
  });
});

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Italian Food')).toBe('italian-food');
  });

  it('strips diacritics', () => {
    expect(slugify('Café')).toBe('cafe');
  });

  it('falls back to "category" for a symbols-only input', () => {
    expect(slugify('!!!')).toBe('category');
  });

  it('trims leading/trailing hyphens', () => {
    expect(slugify('  -Food-  ')).toBe('food');
  });
});

describe('activeDescendantNames', () => {
  it('returns only active descendants, at any depth, excluding the node itself', () => {
    const food = tree()[0]!;
    expect(activeDescendantNames(food).sort()).toEqual(
      ['Bars', 'Italian food', 'Restaurant'].sort(),
    );
  });

  it('returns an empty array for a leaf', () => {
    const italian = tree()[0]!.children![0]!.children![0]!;
    expect(activeDescendantNames(italian)).toEqual([]);
  });

  it('excludes already-deactivated descendants', () => {
    const restaurant = tree()[0]!.children![0]!;
    expect(activeDescendantNames(restaurant)).toEqual(['Italian food']);
  });
});

describe('expandAll / collapseAll', () => {
  it('opens every node that has children', () => {
    const open = expandAll(tree());
    expect(open).toEqual({ food: true, 'food/restaurant': true });
  });

  it('collapseAll returns an empty map', () => {
    expect(collapseAll()).toEqual({});
  });
});

describe('defaultOpenMap', () => {
  it('returns a fresh copy of the default open map each time', () => {
    const a = defaultOpenMap();
    const b = defaultOpenMap();
    expect(a).toEqual({ food: true, 'food/restaurant': true });
    expect(a).not.toBe(b);
  });
});

describe('countLabel', () => {
  it('counts parents, subcategories and children', () => {
    expect(countLabel(tree())).toEqual({ parents: 2, subcategories: 2, children: 2 });
  });
});

describe('categoryExists', () => {
  it('is true for an existing slug and false otherwise', () => {
    expect(categoryExists(tree(), 'food/bars')).toBe(true);
    expect(categoryExists(tree(), 'food/nope')).toBe(false);
  });
});

describe('updateCategory', () => {
  it('updates the name, status and icon of the target node without touching siblings', () => {
    const next = updateCategory(tree(), 'food/bars', {
      name: 'Nightlife',
      status: 'Deactivated',
      icon: 'wellness',
    });
    const bars = findCategoryNode(next, 'food/bars')!.node;
    expect(bars.name).toBe('Nightlife');
    expect(bars.status).toBe('Deactivated');
    expect(bars.icon).toBe('wellness');
    expect(findCategoryNode(next, 'transport')!.node.status).toBe('Active');
  });

  it('does not mutate the input tree', () => {
    const original = tree();
    updateCategory(original, 'food/bars', { name: 'Nightlife' });
    expect(findCategoryNode(original, 'food/bars')!.node.name).toBe('Bars');
  });
});

describe('applyStatusCascade', () => {
  it('renames, re-icons and deactivates the node and every descendant, active or not', () => {
    const next = applyStatusCascade(tree(), 'food', 'Food & Drink', 'attraction', 'Deactivated');
    const food = findCategoryNode(next, 'food')!.node;
    expect(food.name).toBe('Food & Drink');
    expect(food.icon).toBe('attraction');
    expect(food.status).toBe('Deactivated');
    expect(findCategoryNode(next, 'food/restaurant')!.node.status).toBe('Deactivated');
    expect(findCategoryNode(next, 'food/restaurant/italian')!.node.status).toBe('Deactivated');
    expect(findCategoryNode(next, 'food/restaurant/steakhouse')!.node.status).toBe('Deactivated');
    expect(findCategoryNode(next, 'food/bars')!.node.status).toBe('Deactivated');
  });

  it('does not affect a sibling subtree', () => {
    const next = applyStatusCascade(tree(), 'food', 'Food', 'restaurant', 'Deactivated');
    expect(findCategoryNode(next, 'transport')!.node.status).toBe('Active');
  });

  it('does not mutate the input tree', () => {
    const original = tree();
    applyStatusCascade(original, 'food', 'Food', 'restaurant', 'Deactivated');
    expect(findCategoryNode(original, 'food')!.node.status).toBe('Active');
    expect(findCategoryNode(original, 'food/bars')!.node.status).toBe('Active');
  });
});

describe('addCategory', () => {
  it('adds a new top-level parent with the given icon', () => {
    const next = addCategory(tree(), null, 'Wellness', 'Deactivated', 'wellness');
    const wellness = findCategoryNode(next, 'wellness');
    expect(wellness?.node.name).toBe('Wellness');
    expect(wellness?.node.items).toBe(0);
    expect(wellness?.node.icon).toBe('wellness');
    expect(wellness?.depth).toBe(0);
  });

  it('adds a child under the given parent slug', () => {
    const next = addCategory(tree(), 'food', 'Street food', 'Deactivated', 'cafe');
    const hit = findCategoryNode(next, 'food/street-food');
    expect(hit?.node.name).toBe('Street food');
    expect(hit?.node.icon).toBe('cafe');
    expect(hit?.parent?.slug).toBe('food');
  });

  it('does not mutate the input tree', () => {
    const original = tree();
    addCategory(original, 'food', 'Street food', 'Deactivated', 'cafe');
    expect(findCategoryNode(original, 'food/street-food')).toBeNull();
  });
});

describe('resolveCategoryIcon', () => {
  it('resolves a known icon key', () => {
    expect(resolveCategoryIcon('transport')).toBe(resolveCategoryIcon('transport'));
    expect(resolveCategoryIcon('transport')).not.toBe(resolveCategoryIcon('restaurant'));
  });

  it('falls back to the default icon for an unknown or missing key', () => {
    expect(resolveCategoryIcon('not-a-real-key')).toBe(resolveCategoryIcon('genericPlace'));
    expect(resolveCategoryIcon(undefined)).toBe(resolveCategoryIcon('genericPlace'));
  });
});
