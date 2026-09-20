import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import { useMemo, useState } from 'react';

import { useConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { DataTableViewOptions } from '@/components/data-table/data-table-view-options';
import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
  const { data: categories = [] } = useQuery({ queryKey: ['finance', 'categories'], queryFn: categoryApi.getCategories });

  const [query, setQuery] = useState('');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'type', desc: false }]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
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
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      },
      {
        accessorKey: 'type',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
        cell: ({ row }) => <Badge variant="outline">{TYPE_LABELS[row.original.type] ?? row.original.type}</Badge>,
      },
      {
        accessorKey: 'excludeFromAutoLearning',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Auto-learning" />,
        cell: ({ row }) => (row.original.excludeFromAutoLearning ? 'Excluded' : 'Included'),
      },
      {
        id: 'actions',
        header: '',
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex gap-2 text-xs">
            <button className="text-primary hover:underline" onClick={(e) => { e.stopPropagation(); openEdit(row.original); }}>Edit</button>
            <button className="text-destructive hover:underline" onClick={(e) => { e.stopPropagation(); void remove(row.original); }}>Delete</button>
          </div>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: categories,
    columns,
    state: { sorting, columnVisibility, globalFilter: query },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setQuery,
    globalFilterFn: (row, _id, filter) => row.original.name.toLowerCase().includes(String(filter).toLowerCase()),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

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
        <>
          <div className="mt-4 flex items-center gap-2">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search categories…" className="max-w-xs" />
            <DataTableViewOptions table={table} />
          </div>
          <div className="mt-3">
            <DataTable table={table} onRowClick={openEdit} />
          </div>
        </>
      )}

      <CategoryDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} onSaved={invalidate} />
      {dialog}
    </div>
  );
}
