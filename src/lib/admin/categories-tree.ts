import { resolveCategoryIcon } from '@/lib/admin/category-icons';
import type { CategoryNode } from '@/lib/mocks/admin/categories';

import type { LucideIcon } from 'lucide-react';

const LEVEL_LABEL = ['Parent', 'Subcategory', 'Child'] as const;

const DEFAULT_OPEN: Record<string, boolean> = { food: true, 'food/restaurant': true };

export interface CategoryRow {
  slug: string;
  name: string;
  depth: number;
  level: (typeof LEVEL_LABEL)[number];
  items: number;
  childCount: number;
  status: CategoryNode['status'];
  hasChildren: boolean;
  isOpen: boolean;
  icon: LucideIcon | null;
}

export function defaultOpenMap(): Record<string, boolean> {
  return { ...DEFAULT_OPEN };
}

function nodeMatches(node: CategoryNode, query: string): boolean {
  if (!query) return true;
  if (node.name.toLowerCase().includes(query) || node.slug.includes(query)) return true;
  return (node.children ?? []).some((child) => nodeMatches(child, query));
}

export function buildCategoryRows(
  tree: CategoryNode[],
  open: Record<string, boolean> | undefined,
  query: string,
): CategoryRow[] {
  const effectiveOpen = open ?? DEFAULT_OPEN;
  const q = query.trim().toLowerCase();
  const rows: CategoryRow[] = [];

  function walk(nodes: CategoryNode[], depth: number) {
    for (const node of nodes) {
      if (!nodeMatches(node, q)) continue;
      const children = node.children ?? [];
      const isOpen = q ? true : !!effectiveOpen[node.slug];
      rows.push({
        slug: node.slug,
        name: node.name,
        depth,
        level: LEVEL_LABEL[depth]!,
        items: node.items,
        childCount: children.length,
        status: node.status,
        hasChildren: children.length > 0,
        isOpen,
        icon: depth === 2 ? null : resolveCategoryIcon(node.icon),
      });
      if (isOpen && children.length) walk(children, depth + 1);
    }
  }

  walk(tree, 0);
  return rows;
}

export function findCategoryNode(
  tree: CategoryNode[],
  slug: string,
): { node: CategoryNode; parent: CategoryNode | null; depth: number } | null {
  function search(
    nodes: CategoryNode[],
    parent: CategoryNode | null,
    depth: number,
  ): { node: CategoryNode; parent: CategoryNode | null; depth: number } | null {
    for (const node of nodes) {
      if (node.slug === slug) return { node, parent, depth };
      if (node.children) {
        const hit = search(node.children, node, depth + 1);
        if (hit) return hit;
      }
    }
    return null;
  }
  return search(tree, null, 0);
}

export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || 'category';
}

export function activeDescendantNames(node: CategoryNode): string[] {
  const out: string[] = [];
  function walk(list: CategoryNode[] | undefined) {
    for (const n of list ?? []) {
      if (n.status === 'Active') out.push(n.name);
      walk(n.children);
    }
  }
  walk(node.children);
  return out;
}

export function expandAll(tree: CategoryNode[]): Record<string, boolean> {
  const open: Record<string, boolean> = {};
  function walk(nodes: CategoryNode[]) {
    for (const node of nodes) {
      if (node.children) {
        open[node.slug] = true;
        walk(node.children);
      }
    }
  }
  walk(tree);
  return open;
}

export function collapseAll(): Record<string, boolean> {
  return {};
}

export function categoryExists(tree: CategoryNode[], slug: string): boolean {
  return findCategoryNode(tree, slug) !== null;
}

export function updateCategory(
  tree: CategoryNode[],
  slug: string,
  updates: { name?: string; status?: CategoryNode['status']; icon?: string },
): CategoryNode[] {
  return tree.map((node) => {
    if (node.slug === slug) return { ...node, ...updates };
    if (node.children) return { ...node, children: updateCategory(node.children, slug, updates) };
    return node;
  });
}

function setStatusDeep(node: CategoryNode, status: CategoryNode['status']): CategoryNode {
  return {
    ...node,
    status,
    children: node.children
      ? node.children.map((child) => setStatusDeep(child, status))
      : undefined,
  };
}

export function applyStatusCascade(
  tree: CategoryNode[],
  slug: string,
  name: string,
  icon: string,
  status: CategoryNode['status'],
): CategoryNode[] {
  return tree.map((node) => {
    if (node.slug === slug) return setStatusDeep({ ...node, name, icon }, status);
    if (node.children)
      return { ...node, children: applyStatusCascade(node.children, slug, name, icon, status) };
    return node;
  });
}

export function addCategory(
  tree: CategoryNode[],
  parentSlug: string | null,
  name: string,
  status: CategoryNode['status'],
  icon: string,
): CategoryNode[] {
  if (parentSlug === null) {
    return [...tree, { name, slug: slugify(name), items: 0, status, icon, children: [] }];
  }
  const newNode: CategoryNode = {
    name,
    slug: `${parentSlug}/${slugify(name)}`,
    items: 0,
    status,
    icon,
  };
  function insert(nodes: CategoryNode[]): CategoryNode[] {
    return nodes.map((node) => {
      if (node.slug === parentSlug)
        return { ...node, children: [...(node.children ?? []), newNode] };
      if (node.children) return { ...node, children: insert(node.children) };
      return node;
    });
  }
  return insert(tree);
}

export function countLabel(tree: CategoryNode[]): {
  parents: number;
  subcategories: number;
  children: number;
} {
  let parents = 0;
  let subcategories = 0;
  let children = 0;
  for (const parent of tree) {
    parents += 1;
    for (const sub of parent.children ?? []) {
      subcategories += 1;
      children += (sub.children ?? []).length;
    }
  }
  return { parents, subcategories, children };
}
