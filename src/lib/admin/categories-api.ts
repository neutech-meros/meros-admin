import { z } from 'zod';

import type { CategoryRequestLevel } from '@/lib/admin/category-requests';

const nodeFields = {
  id: z.string(),
  name: z.string(),
  key: z.string(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  itemsCount: z.number().int().nonnegative(),
};

const subcategorySchema = z.object(nodeFields);
const categorySchema = z.object({ ...nodeFields, subcategories: z.array(subcategorySchema) });
const groupSchema = z.object({ ...nodeFields, categories: z.array(categorySchema) });
const treeResponseSchema = z.array(groupSchema);

export type CategoriesTreeApiResponse = z.infer<typeof treeResponseSchema>;
type ApiNode = z.infer<typeof subcategorySchema>;

export interface CategoryTreeNode {
  id: string;
  name: string;
  key: string;
  level: CategoryRequestLevel;
  status: ApiNode['status'];
  itemsCount: number;
  children: CategoryTreeNode[];
}

export type CategoriesTreeResult = { ok: true; tree: CategoryTreeNode[] } | { ok: false };

function toNode(
  node: ApiNode,
  level: CategoryRequestLevel,
  children: CategoryTreeNode[],
): CategoryTreeNode {
  return {
    id: node.id,
    name: node.name,
    key: node.key,
    level,
    status: node.status,
    itemsCount: node.itemsCount,
    children,
  };
}

export function toCategoryTree(groups: CategoriesTreeApiResponse): CategoryTreeNode[] {
  return groups.map((group) =>
    toNode(
      group,
      'Parent',
      group.categories.map((category) =>
        toNode(
          category,
          'Subcategory',
          category.subcategories.map((subcategory) => toNode(subcategory, 'Child category', [])),
        ),
      ),
    ),
  );
}

export async function fetchCategoriesTree(): Promise<CategoriesTreeResult> {
  try {
    const response = await fetch('/api/admin/categories');
    if (!response.ok) return { ok: false };
    const parsed = treeResponseSchema.safeParse(await response.json());
    return parsed.success ? { ok: true, tree: toCategoryTree(parsed.data) } : { ok: false };
  } catch {
    return { ok: false };
  }
}
