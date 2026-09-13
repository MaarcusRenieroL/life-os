import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { CategoryDialog } from './category-dialog';
import { categoryApi } from './category-api';
import { CATEGORY_TYPES } from './types';
import type { CategoryResponse } from './types';

const GROUP_LABELS: Record<string, string> = {
  EXPENSE: 'Expense',
  INCOME: 'Income',
  TRANSFER: 'Transfer',
  INVESTMENT: 'Investment',
};

export function CategoriesPage() {
  const queryClient = useQueryClient();
  const { data: categories = [] } = useQuery({ queryKey: ['finance', 'categories'], queryFn: categoryApi.getCategories });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryResponse | null>(null);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['finance', 'categories'] });
  }

  async function remove(category: CategoryResponse) {
    if (!confirm(`Delete "${category.name}"?`)) return;
    await categoryApi.deleteCategory(category.id);
    invalidate();
  }

  const groups = CATEGORY_TYPES.map((type) => ({
    type,
    items: categories.filter((c) => c.type === type),
  }));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
        <button
          className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
          onClick={() => { setEditing(null); setDialogOpen(true); }}
        >
          + New category
        </button>
      </div>

      {categories.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          No categories yet — create one to start budgeting and categorizing transactions.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {groups.map(
            (group) =>
              group.items.length > 0 && (
                <section key={group.type}>
                  <h2 className="text-sm font-semibold">{GROUP_LABELS[group.type]}</h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {group.items.map((c) => (
                      <span key={c.id} className="flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs">
                        {c.name}
                        <button className="text-primary hover:underline" onClick={() => { setEditing(c); setDialogOpen(true); }}>edit</button>
                        <button className="text-destructive hover:underline" onClick={() => void remove(c)}>delete</button>
                      </span>
                    ))}
                  </div>
                </section>
              ),
          )}
        </div>
      )}

      <CategoryDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} onSaved={invalidate} />
    </div>
  );
}
