import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useConfirmDialog } from '@/components/confirm-dialog';
import { DataGrid } from '@/components/data-table/data-grid';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { FitScoreBadge } from './fit-score-badge';
import { jobApi } from './job-api';
import { JOB_STATUS_LABELS, JOB_STATUSES, type JobListing, type JobStatus } from './types';

export function JobsListPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: jobs = [], isLoading } = useQuery({ queryKey: ['jobs', 'list'], queryFn: jobApi.list });

  const { confirm, dialog } = useConfirmDialog();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['jobs'] });
  }

  async function setStatus(job: JobListing, status: JobStatus) {
    await jobApi.setStatus(job.id, status);
    // Invalidate rather than patching a single key: this list, the dashboard and the home summary
    // all read GET /v1/jobs, so patching only one left the others showing the old status until
    // their 60s staleTime expired.
    invalidate();
  }

  async function remove(job: JobListing) {
    const ok = await confirm({
      title: `Remove "${job.title}"?`,
      description: `This removes it from your tracker along with any interviews and notes on it. This cannot be undone.`,
      confirmLabel: 'Remove',
    });
    if (!ok) return;
    await jobApi.delete(job.id);
    invalidate();
    toast.success(`Removed ${job.title}`);
  }

  async function removeSelected(ids: string[]) {
    const ok = await confirm({
      title: `Remove ${ids.length} job(s)?`,
      description: 'This cannot be undone.',
      confirmLabel: 'Remove',
    });
    if (!ok) return false;
    await Promise.all(ids.map((id) => jobApi.delete(id)));
    invalidate();
    toast.success(`Removed ${ids.length} job(s)`);
    return true;
  }

  const columns = useMemo<ColumnDef<JobListing>[]>(
    () => [
      {
        accessorKey: 'title',
        meta: { title: 'Role', filter: { type: 'text' } },
        cell: ({ row }) => (
          <div className="max-w-[14rem] min-w-0 lg:max-w-xs">
            <div className="truncate font-medium">{row.original.title}</div>
            <div className="truncate text-xs text-muted-foreground">{row.original.company}</div>
          </div>
        ),
      },
      {
        accessorKey: 'company',
        meta: { title: 'Company', filter: { type: 'select' } },
      },
      {
        id: 'status',
        accessorFn: (j) => JOB_STATUS_LABELS[j.status ?? 'INTERESTED'],
        meta: { title: 'Status', filter: { type: 'select', options: JOB_STATUSES.map((s) => ({ value: JOB_STATUS_LABELS[s], label: JOB_STATUS_LABELS[s] })) } },
        cell: ({ row }) => (
          <Select
            value={row.original.status ?? 'INTERESTED'}
            onValueChange={(v) => void setStatus(row.original, v as JobStatus)}
          >
            <SelectTrigger size="sm" className="w-36 text-xs" onClick={(e) => e.stopPropagation()}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {JOB_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{JOB_STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
      },
      {
        accessorKey: 'fitScore',
        meta: { title: 'Fit score', align: 'right', filter: { type: 'number' } },
        cell: ({ row }) => (row.original.fitScore !== null ? <FitScoreBadge score={row.original.fitScore} /> : <span className="text-muted-foreground">—</span>),
      },
      {
        accessorKey: 'location',
        meta: { title: 'Location', filter: { type: 'text' }, className: 'hidden xl:table-cell' },
        cell: ({ row }) => <span className="block max-w-48 truncate text-muted-foreground">{row.original.location ?? '—'}</span>,
      },
      {
        id: 'workModel',
        accessorFn: (j) => (j.workModel ? j.workModel.charAt(0) + j.workModel.slice(1).toLowerCase() : ''),
        meta: { title: 'Work model', filter: { type: 'select' } },
        cell: ({ getValue }) => (getValue() as string) || '—',
      },
      {
        accessorKey: 'seniorityLevel',
        meta: { title: 'Seniority', filter: { type: 'select' } },
        cell: ({ row }) => row.original.seniorityLevel ?? '—',
      },
      {
        accessorKey: 'source',
        meta: { title: 'Source', filter: { type: 'select' } },
        cell: ({ row }) => row.original.source ?? '—',
      },
      {
        accessorKey: 'salaryMin',
        meta: { title: 'Salary from', align: 'right', filter: { type: 'number' } },
        cell: ({ row }) => (row.original.salaryMin ? `${row.original.salaryMin.toLocaleString()} ${row.original.currency ?? ''}` : '—'),
      },
      {
        accessorKey: 'salaryMax',
        meta: { title: 'Salary to', align: 'right', filter: { type: 'number' } },
        cell: ({ row }) => (row.original.salaryMax ? `${row.original.salaryMax.toLocaleString()} ${row.original.currency ?? ''}` : '—'),
      },
      {
        id: 'visa',
        accessorFn: (j) => (j.visaSponsorship ? j.visaSponsorship.charAt(0) + j.visaSponsorship.slice(1).toLowerCase() : ''),
        meta: { title: 'Visa sponsorship', filter: { type: 'select' } },
        cell: ({ getValue }) => (getValue() as string) || '—',
      },
      {
        accessorKey: 'appliedAt',
        meta: { title: 'Applied on', filter: { type: 'date' } },
        cell: ({ row }) => row.original.appliedAt?.slice(0, 10) ?? '—',
      },
      {
        accessorKey: 'deadline',
        meta: { title: 'Deadline', filter: { type: 'date' } },
        cell: ({ row }) => row.original.deadline?.slice(0, 10) ?? '—',
      },
      {
        accessorKey: 'createdAt',
        meta: { title: 'Added', filter: { type: 'date' }, className: 'hidden lg:table-cell' },
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.createdAt.slice(0, 10)}</span>,
      },
      {
        id: 'actions',
        header: '',
        enableHiding: false,
        enableSorting: false,
        enableResizing: false,
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
        <div className="mt-4">
          <DataGrid
            tableId="jobs.list"
            data={jobs}
            columns={columns}
            getRowId={(j) => j.id}
            onRowClick={(job) => navigate(`/jobs/${job.id}`)}
            loading={isLoading}
            enableSelection
            initialSorting={[{ id: 'fitScore', desc: true }]}
            initialVisibility={{ company: false, workModel: false, seniorityLevel: false, source: false, salaryMin: false, salaryMax: false, visa: false, appliedAt: false, deadline: false }}
            exportName="jobs"
            searchPlaceholder="Search role or company…"
            emptyMessage="No jobs match."
            bulkActions={(selected, clear) => (
              <button className="text-destructive hover:underline" onClick={() => void removeSelected(selected.map((j) => j.id)).then((ok) => ok && clear())}>
                Remove
              </button>
            )}
            // Below md a wide table cannot fit, so each job becomes a card instead of scrolling sideways.
            mobileCard={(job) => {
              const place = [job.location, job.workModel].filter(Boolean).join(' · ');
              return (
                <div className="cursor-pointer rounded-lg border p-3 active:bg-muted/50" onClick={() => navigate(`/jobs/${job.id}`)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium break-words">{job.title}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {job.company}
                        {place ? ` · ${place}` : ''}
                      </div>
                    </div>
                    {job.fitScore !== null && <FitScoreBadge score={job.fitScore} />}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <Select value={job.status ?? 'INTERESTED'} onValueChange={(v) => void setStatus(job, v as JobStatus)}>
                      <SelectTrigger size="sm" className="w-44 text-xs" onClick={(e) => e.stopPropagation()}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {JOB_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{JOB_STATUS_LABELS[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      className="text-xs text-destructive hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        void remove(job);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            }}
          />
        </div>
      )}
      {dialog}
    </div>
  );
}
