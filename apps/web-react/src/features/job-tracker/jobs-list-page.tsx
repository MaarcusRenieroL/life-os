import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { DataTableViewOptions } from '@/components/data-table/data-table-view-options';
import { selectionColumn } from '@/components/data-table/selection-column';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { FitScoreBadge } from './fit-score-badge';
import { jobApi } from './job-api';
import { JOB_STATUSES, type JobListing, type JobStatus } from './types';

type StatusFilter = 'ALL' | JobStatus;

export function JobsListPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: jobs = [], isLoading } = useQuery({ queryKey: ['jobs'], queryFn: jobApi.list });

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'fitScore', desc: true }]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['jobs'] });
  }

  async function setStatus(job: JobListing, status: JobStatus) {
    const updated = await jobApi.setStatus(job.id, status);
    queryClient.setQueryData<JobListing[]>(['jobs'], (list) =>
      list?.map((j) => (j.id === updated.id ? updated : j)),
    );
  }

  async function remove(job: JobListing) {
    await jobApi.delete(job.id);
    queryClient.setQueryData<JobListing[]>(['jobs'], (list) => list?.filter((j) => j.id !== job.id));
    toast.success(`Removed ${job.title}`);
  }

  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);

  async function removeSelected() {
    if (!confirm(`Remove ${selectedIds.length} job(s)?`)) return;
    for (const id of selectedIds) {
      await jobApi.delete(id);
    }
    setRowSelection({});
    invalidate();
    toast.success(`Removed ${selectedIds.length} job(s)`);
  }

  const filtered = useMemo(
    () => (statusFilter === 'ALL' ? jobs : jobs.filter((j) => (j.status ?? 'INTERESTED') === statusFilter)),
    [jobs, statusFilter],
  );

  const columns = useMemo<ColumnDef<JobListing>[]>(
    () => [
      selectionColumn<JobListing>(),
      {
        accessorKey: 'title',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Role" />,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate font-medium">{row.original.title}</div>
            <div className="truncate text-xs text-muted-foreground">{row.original.company}</div>
          </div>
        ),
      },
      {
        id: 'location',
        accessorFn: (j) => [j.location, j.workModel].filter(Boolean).join(' · '),
        header: ({ column }) => <DataTableColumnHeader column={column} title="Location" />,
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {[row.original.location, row.original.workModel].filter(Boolean).join(' · ') || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => (
          <Select
            value={row.original.status ?? 'INTERESTED'}
            onValueChange={(v) => void setStatus(row.original, v as JobStatus)}
          >
            <SelectTrigger size="sm" className="text-xs" onClick={(e) => e.stopPropagation()}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {JOB_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
      },
      {
        accessorKey: 'fitScore',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Fit" />,
        cell: ({ row }) => (row.original.fitScore !== null ? <FitScoreBadge score={row.original.fitScore} /> : <span className="text-muted-foreground">—</span>),
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Added" />,
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.createdAt.slice(0, 10)}</span>,
      },
      {
        id: 'actions',
        header: '',
        enableHiding: false,
        cell: ({ row }) => (
          <button
            className="text-xs text-destructive hover:underline"
            onClick={(e) => { e.stopPropagation(); void remove(row.original); }}
          >
            Remove
          </button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, columnVisibility, rowSelection, globalFilter: query },
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setQuery,
    globalFilterFn: (row, _id, filter) => {
      const needle = String(filter).toLowerCase();
      return row.original.title.toLowerCase().includes(needle) || row.original.company.toLowerCase().includes(needle);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          Jobs <span className="text-muted-foreground">({jobs.length})</span>
        </h1>
        <Button asChild>
          <Link to="/jobs/discovery"><Plus /> Add a job</Link>
        </Button>
      </div>

      {!isLoading && jobs.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          No jobs yet. Paste a link on{' '}
          <Link to="/jobs/discovery" className="text-primary underline">
            Add a Job
          </Link>
          .
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search role or company…"
              className="max-w-xs"
            />
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger size="sm" className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {JOB_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DataTableViewOptions table={table} />
          </div>

          {selectedIds.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2 text-xs">
              <span>{selectedIds.length} selected</span>
              <button className="text-destructive hover:underline" onClick={() => void removeSelected()}>Remove</button>
              <button className="ml-auto hover:underline" onClick={() => setRowSelection({})}>Clear</button>
            </div>
          )}

          <div className="mt-3">
            <DataTable
              table={table}
              onRowClick={(job) => navigate(`/jobs/${job.id}`)}
              emptyMessage={isLoading ? 'Loading jobs…' : 'No jobs match this filter.'}
            />
          </div>

          <DataTablePagination table={table} />
        </>
      )}
    </div>
  );
}
