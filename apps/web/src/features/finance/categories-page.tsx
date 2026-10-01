import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';

import { useConfirmDialog } from '@/components/confirm-dialog';
import { DataGrid } from '@/components/data-table/data-grid';
import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { CategoryDialog } from './category-dialog';
import { categoryApi } from './category-api';
import type { CategoryResponse } from './types';

const TYPE_LABELS: Record<string, string> = {
  EXPENSE: 'Expense',
  INCOME: 'Income',
  TRANSFER: 'Transfer',
  INVESTMENT: 'Investment',
};

export function CategoriesPage() {
  const queryClient = useQueryClient();
  const { data: categories = [] } = useQuery({ queryKey: ['finance', 'categories'], queryFn: categoryApi.getCategories, staleTime: 5 * 60_000 });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryResponse | null>(null);
  const { confirm, dialog } = useConfirmDialog();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['finance', 'categories'] });
  }

  async function remove(category: CategoryResponse) {
    const ok = await confirm({ title: `Delete "${category.name}"?`, confirmLabel: 'Delete' });
    if (!ok) return;
    await categoryApi.deleteCategory(category.id);
    invalidate();
  }

  function openEdit(category: CategoryResponse) {
    setEditing(category);
    setDialogOpen(true);
  }

  const columns = useMemo<ColumnDef<CategoryResponse>[]>(
    () => [
      {
        accessorKey: 'name',
        meta: { title: 'Name', filter: { type: 'text' } },
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {row.original.color && <span className="size-2.5 rounded-full" style={{ background: row.original.color }} />}
            {row.original.name}
          </div>
        ),
      },
      {
        id: 'type',
        accessorFn: (c) => TYPE_LABELS[c.type] ?? c.type,
        meta: { title: 'Type', filter: { type: 'select' } },
        cell: ({ row }) => <Badge variant="outline">{TYPE_LABELS[row.original.type] ?? row.original.type}</Badge>,
      },
      {
        id: 'parent',
        accessorFn: (c) => categories.find((p) => p.id === c.parentCategoryId)?.name ?? '',
        meta: { title: 'Parent category', filter: { type: 'select' } },
        cell: ({ getValue }) => (getValue() as string) || '—',
      },
      {
        accessorKey: 'excludeFromAutoLearning',
        meta: { title: 'Auto-learning', filter: { type: 'boolean', labels: ['Excluded', 'Included'] }, exportValue: (c) => (c.excludeFromAutoLearning ? 'Excluded' : 'Included') },
        cell: ({ row }) => (row.original.excludeFromAutoLearning ? 'Excluded' : 'Included'),
      },
      {
        accessorKey: 'isActive',
        meta: { title: 'Active', filter: { type: 'boolean', labels: ['Active', 'Inactive'] }, exportValue: (c) => (c.isActive ? 'Yes' : 'No') },
        cell: ({ row }) => (row.original.isActive ? 'Yes' : 'No'),
      },
      {
        accessorKey: 'createdAt',
        meta: { title: 'Created', filter: { type: 'date' } },
        cell: ({ row }) => row.original.createdAt.slice(0, 10),
      },
      {
        id: 'actions',
        header: '',
        enableHiding: false,
        enableSorting: false,
        enableResizing: false,
        cell: ({ row }) => (
          <div className="flex gap-2 text-xs">
            <button className="text-primary hover:underline" onClick={(e) => { e.stopPropagation(); openEdit(row.original); }}>Edit</button>
            <button className="text-destructive hover:underline" onClick={(e) => { e.stopPropagation(); void remove(row.original); }}>Delete</button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categories],
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>+ New category</Button>
      </div>

      {categories.length === 0 ? (
        <EmptyState
          className="mt-6"
          message="No categories yet — create one to start budgeting and categorizing transactions."
        />
      ) : (
        <div className="mt-4">
          <DataGrid
            tableId="finance.categories"
            data={categories}
            columns={columns}
            getRowId={(c) => c.id}
            onRowClick={openEdit}
            initialSorting={[{ id: 'type', desc: false }]}
            initialVisibility={{ parent: false, isActive: false, createdAt: false }}
            exportName="categories"
            searchPlaceholder="Search categories…"
            hidePagination={categories.length <= 10}
          />
        </div>
      )}

      <CategoryDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} onSaved={invalidate} />
      {dialog}
    </div>
  );
}
