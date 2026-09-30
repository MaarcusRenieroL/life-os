import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { TaskFormDialog } from './task-form-dialog';
import { TaskList } from './task-list';
import { tasksApi } from './tasks-api';
import { TASK_PRIORITIES, TASK_PRIORITY_LABELS, TASK_STATUSES, TASK_STATUS_LABELS, type Task, type TaskPriority, type TaskStatus } from './types';

type StatusFilter = 'ALL' | TaskStatus;
type PriorityFilter = 'ALL' | TaskPriority;
type SortKey = 'dueDate' | 'priority' | 'createdAt' | 'status';
type GroupKey = 'none' | 'area' | 'project' | 'status' | 'priority' | 'dueDate';

const PRIORITY_ORDER: TaskPriority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];
const UNGROUPED = 'Unassigned';

function groupLabel(task: Task, groupKey: GroupKey): string {
  switch (groupKey) {
    case 'area':
      return task.areaId ?? UNGROUPED;
    case 'project':
      return task.projectId ?? UNGROUPED;
    case 'status':
      return TASK_STATUS_LABELS[task.status];
    case 'priority':
      return TASK_PRIORITY_LABELS[task.priority];
    case 'dueDate':
      return task.dueDate ?? 'No due date';
    case 'none':
      return '';
  }
}

function toCsvRow(values: (string | null | undefined)[]): string {
  return values.map((v) => `"${(v ?? '').replace(/"/g, '""')}"`).join(',');
}

function exportTasksCsv(tasks: Task[]) {
  const header = toCsvRow(['Title', 'Description', 'Status', 'Priority', 'Due Date', 'Due Time', 'Tags', 'Estimate (min)']);
  const rows = tasks.map((t) =>
    toCsvRow([
      t.title,
      t.description,
      t.status,
      t.priority,
      t.dueDate,
      t.dueTime,
      (t.tags ?? []).join('; '),
      t.estimateMinutes != null ? String(t.estimateMinutes) : null,
    ]),
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'tasks-export.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function TasksListPage() {
  const queryClient = useQueryClient();
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', 'view', 'PLAIN'],
    queryFn: () => tasksApi.list(),
  });

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [inboxOnly, setInboxOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('dueDate');
  const [groupKey, setGroupKey] = useState<GroupKey>('none');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  }

  const filtered = useMemo(
    () =>
      tasks.filter((t) => {
        if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
        if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
        if (inboxOnly && (t.areaId || t.projectId || t.goalId)) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const inTitle = t.title.toLowerCase().includes(q);
          const inDescription = t.description?.toLowerCase().includes(q) ?? false;
          const inTags = (t.tags ?? []).some((tag) => tag.toLowerCase().includes(q));
          if (!inTitle && !inDescription && !inTags) return false;
        }
        return true;
      }),
    [tasks, statusFilter, priorityFilter, inboxOnly, searchQuery],
  );

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      switch (sortKey) {
        case 'dueDate':
          return (a.dueDate ?? '9999-99-99').localeCompare(b.dueDate ?? '9999-99-99');
        case 'priority':
          return PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority);
        case 'createdAt':
          return b.createdAt.localeCompare(a.createdAt);
        case 'status':
          return a.status.localeCompare(b.status);
      }
    });
    return list;
  }, [filtered, sortKey]);

  const grouped = useMemo(() => {
    if (groupKey === 'none') return [[null, sorted] as const];
    const map = new Map<string, Task[]>();
    for (const task of sorted) {
      const label = groupLabel(task, groupKey);
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(task);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [sorted, groupKey]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(task: Task) {
    setEditing(task);
    setFormOpen(true);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">All tasks</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportTasksCsv(sorted)}>
            <Download /> Export CSV
          </Button>
          <Button onClick={openCreate}>
            <Plus /> New task
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks by title, description, or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="min-w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {TASK_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {TASK_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as PriorityFilter)}>
          <SelectTrigger className="min-w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All priorities</SelectItem>
            {TASK_PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {TASK_PRIORITY_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant={inboxOnly ? 'secondary' : 'outline'} onClick={() => setInboxOnly((v) => !v)}>
          Inbox only
        </Button>
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger className="min-w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dueDate">Sort: Due date</SelectItem>
            <SelectItem value="priority">Sort: Priority</SelectItem>
            <SelectItem value="createdAt">Sort: Created date</SelectItem>
            <SelectItem value="status">Sort: Status</SelectItem>
          </SelectContent>
        </Select>
        <Select value={groupKey} onValueChange={(v) => setGroupKey(v as GroupKey)}>
          <SelectTrigger className="min-w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No grouping</SelectItem>
            <SelectItem value="area">Group: Area</SelectItem>
            <SelectItem value="project">Group: Project</SelectItem>
            <SelectItem value="status">Group: Status</SelectItem>
            <SelectItem value="priority">Group: Priority</SelectItem>
            <SelectItem value="dueDate">Group: Due date</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 flex flex-col gap-6">
        {grouped.map(([label, groupTasks]) => (
          <div key={label ?? 'all'}>
            {label !== null && (
              <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</h2>
            )}
            <TaskList
              tasks={groupTasks}
              isLoading={isLoading}
              emptyMessage="No tasks match these filters."
              onEdit={openEdit}
            />
          </div>
        ))}
      </div>

      <TaskFormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} onSaved={invalidate} />
    </div>
  );
}
