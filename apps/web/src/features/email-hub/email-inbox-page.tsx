import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, CheckSquare, CreditCard, Loader2, Mail, Receipt, Undo2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataGrid } from '@/components/data-table/data-grid';
import { Skeleton } from '@/components/ui/skeleton';

import {
  emailHubApi,
  type EmailCategory,
  type EmailHubItem,
  type EmailHubStatus,
  type EmailProposal,
} from './email-hub-api';

const CATEGORY: Record<EmailCategory, { label: string; icon: typeof Mail }> = {
  TASK: { label: 'Task', icon: CheckSquare },
  BILL: { label: 'Bill', icon: Receipt },
  EVENT: { label: 'Event', icon: CalendarClock },
  SUBSCRIPTION: { label: 'Subscription', icon: CreditCard },
  IGNORE: { label: 'Skipped', icon: Mail },
};

/** Where the created record lives, so "done for you" links straight to it. */
const MODULE_LINK: Record<string, { label: string; to: string }> = {
  tasks: { label: 'Open tasks', to: '/tasks' },
  calendar: { label: 'Open calendar', to: '/calendar' },
  finance: { label: 'Open subscriptions', to: '/finance/subscriptions' },
};

const ALL_STATUSES: EmailHubStatus[] = ['NEEDS_REVIEW', 'FAILED', 'APPLIED', 'UNDONE', 'IGNORED', 'DISMISSED'];

/** The stage of an email in plain words; the views on the left are groups of these. */
const STATUS_LABEL: Record<EmailHubStatus, string> = {
  NEEDS_REVIEW: 'Needs your OK',
  FAILED: 'Failed',
  APPLIED: 'Done for you',
  UNDONE: 'Undone',
  IGNORED: 'Skipped',
  DISMISSED: 'Dismissed',
};

function when(iso: string | null | undefined, withTime = false): string | null {
  if (!iso) return null;
  const date = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  return withTime
    ? date.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

/** One plain line saying exactly what will be / was created. */
function describe(proposal: EmailProposal | null): string | null {
  if (!proposal) return null;
  switch (proposal.kind) {
    case 'TASK':
      return `Task: ${proposal.title}${proposal.dueDate ? ` · due ${when(proposal.dueDate)}` : ''}`;
    case 'EVENT': {
      const start = proposal.allDay ? when(proposal.startDate) : when(proposal.startAt, true);
      return `Event: ${proposal.title}${start ? ` · ${start}` : ''}${proposal.location ? ` · ${proposal.location}` : ''}`;
    }
    case 'SUBSCRIPTION':
      return `Subscription: ${proposal.title} · ${proposal.amount ?? '?'} ${proposal.billingCycle?.toLowerCase() ?? ''}${proposal.nextBillingDate ? ` · next ${when(proposal.nextBillingDate)}` : ''}`;
  }
}

function senderName(from: string | null): string {
  if (!from) return 'Unknown sender';
  const named = from.match(/^"?([^"<]+?)"?\s*</);
  return (named?.[1] ?? from.replace(/[<>]/g, '')).trim();
}

export function EmailInboxPage() {
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);

  const items = useQuery({ queryKey: ['email-hub', 'items', 'all'], queryFn: () => emailHubApi.items(ALL_STATUSES, 200) });

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['email-hub'] });
    // The created records show up in these modules' own lists.
    void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    void queryClient.invalidateQueries({ queryKey: ['calendar'] });
    void queryClient.invalidateQueries({ queryKey: ['finance'] });
  }

  const sync = useMutation({
    mutationFn: emailHubApi.syncNow,
    onSuccess: (queued) => {
      toast.success(queued === 0 ? 'No new mail to read' : `Reading ${queued} email${queued === 1 ? '' : 's'} - results appear in a moment`);
      // Classifying runs in the background after the mail is queued; look again shortly and once more.
      setTimeout(refresh, 8000);
      setTimeout(refresh, 25000);
    },
    onError: () => toast.error('Could not check your email. Make sure Gmail is connected under Finance → Import.'),
  });

  async function act(item: EmailHubItem, action: 'approve' | 'dismiss' | 'undo') {
    setBusyId(item.id);
    try {
      const updated = await emailHubApi[action](item.id);
      if (action === 'approve' && updated.status === 'FAILED') toast.error(updated.note ?? 'That module rejected it.');
      if (action === 'undo' && updated.status === 'APPLIED') toast.error(updated.note ?? 'Could not undo that automatically.');
      refresh();
    } catch {
      toast.error('Something went wrong. Try again.');
    } finally {
      setBusyId(null);
    }
  }

  const columns = useMemo<ColumnDef<EmailHubItem>[]>(
    () => [
      {
        id: 'summary',
        accessorFn: (i) => i.summary || i.subject || '(no subject)',
        meta: { title: 'Email', filter: { type: 'text' } },
        cell: ({ row }) => {
          const item = row.original;
          const Icon = CATEGORY[item.category].icon;
          const link = item.targetModule ? MODULE_LINK[item.targetModule] : undefined;
          return (
            <div className="flex min-w-0 gap-2.5">
              <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="font-medium break-words">{item.summary || item.subject || '(no subject)'}</p>
                {item.note && <p className={`mt-0.5 text-xs ${item.status === 'FAILED' ? 'text-destructive' : 'text-muted-foreground'}`}>{item.note}</p>}
                {link && item.status === 'APPLIED' && (
                  <Link to={link.to} onClick={(e) => e.stopPropagation()} className="mt-0.5 inline-block text-xs text-primary hover:underline">{link.label}</Link>
                )}
              </div>
            </div>
          );
        },
      },
      { id: 'category', accessorFn: (i) => CATEGORY[i.category].label, meta: { title: 'Type', filter: { type: 'select' } } },
      { id: 'status', accessorFn: (i) => STATUS_LABEL[i.status], meta: { title: 'Status', filter: { type: 'select' } } },
      { id: 'plan', accessorFn: (i) => describe(i.proposal) ?? '', meta: { title: 'What it will do', filter: { type: 'text' } }, cell: ({ row }) => describe(row.original.proposal) ?? '—' },
      { id: 'from', accessorFn: (i) => senderName(i.fromAddress), meta: { title: 'From', filter: { type: 'select' } } },
      { accessorKey: 'subject', meta: { title: 'Subject', filter: { type: 'text' } }, cell: ({ row }) => row.original.subject ?? '—' },
      {
        id: 'confidence',
        accessorFn: (i) => (i.confidence ? i.confidence.toLowerCase() : ''),
        meta: { title: 'Confidence', filter: { type: 'select' } },
        cell: ({ row }) => (row.original.confidence ? <Badge variant="outline" className="text-[10px]">{row.original.confidence.toLowerCase()}</Badge> : '—'),
      },
      {
        id: 'receivedAt',
        accessorFn: (i) => i.receivedAt ?? i.createdAt,
        meta: { title: 'Received', filter: { type: 'date' } },
        cell: ({ row }) => (row.original.receivedAt ?? row.original.createdAt).slice(0, 10),
      },
      {
        id: 'actions',
        header: '',
        enableHiding: false,
        enableSorting: false,
        enableResizing: false,
        cell: ({ row }) => {
          const item = row.original;
          if (busyId === item.id) return <Loader2 className="size-4 animate-spin text-muted-foreground" />;
          return (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              {(item.status === 'NEEDS_REVIEW' || item.status === 'FAILED') && (
                <>
                  {item.proposal && <Button size="sm" onClick={() => void act(item, 'approve')}>{item.status === 'FAILED' ? 'Try again' : 'Do it'}</Button>}
                  <Button size="icon" variant="ghost" title="Dismiss" aria-label="Dismiss" onClick={() => void act(item, 'dismiss')}><X className="size-4" /></Button>
                </>
              )}
              {item.status === 'APPLIED' && (
                <Button size="sm" variant="ghost" onClick={() => void act(item, 'undo')}><Undo2 className="size-4" /> Undo</Button>
              )}
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busyId],
  );

  const waiting = (items.data ?? []).filter((i) => i.status === 'NEEDS_REVIEW' || i.status === 'FAILED').length;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Email</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Your inbox, read for you. Bills, appointments, deadlines and subscription receipts wait here as proposals
            until you click Do it. Nothing is created without your OK.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => sync.mutate()} disabled={sync.isPending}>
          <Mail className="size-4" />
          {sync.isPending ? 'Checking…' : 'Check now'}
        </Button>
      </div>

      <div className="mt-5">
        {items.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : items.isError ? (
          <p className="text-sm text-destructive">Could not load your email.</p>
        ) : (
          <DataGrid
            tableId="email.inbox"
            data={items.data ?? []}
            columns={columns}
            getRowId={(i) => i.id}
            initialSorting={[{ id: 'receivedAt', desc: true }]}
            initialFilters={waiting > 0 ? [{ id: 'status', value: ['Needs your OK', 'Failed'] }] : []}
            initialVisibility={{ subject: false, confidence: false, from: false }}
            views={[
              { id: 'waiting', name: `Needs your OK${waiting ? ` (${waiting})` : ''}`, filters: [{ id: 'status', value: ['Needs your OK', 'Failed'] }] },
              { id: 'done', name: 'Done for you', filters: [{ id: 'status', value: ['Done for you', 'Undone'] }] },
              { id: 'skipped', name: 'Skipped', filters: [{ id: 'status', value: ['Skipped', 'Dismissed'] }] },
              { id: 'bills', name: 'Bills', filters: [{ id: 'category', value: ['Bill'] }] },
            ]}
            exportName="email"
            searchPlaceholder="Search email…"
            emptyMessage="Nothing here yet."
            mobileCard={(item) => (
              <div className="rounded-lg border p-3">
                <p className="font-medium break-words">{item.summary || item.subject || '(no subject)'}</p>
                <p className="mt-0.5 text-sm break-words">{describe(item.proposal)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{senderName(item.fromAddress)} · {STATUS_LABEL[item.status]}</p>
                {(item.status === 'NEEDS_REVIEW' || item.status === 'FAILED') && (
                  <div className="mt-2 flex gap-2">
                    {item.proposal && <Button size="sm" onClick={() => void act(item, 'approve')}>Do it</Button>}
                    <Button size="sm" variant="ghost" onClick={() => void act(item, 'dismiss')}>Dismiss</Button>
                  </div>
                )}
                {item.status === 'APPLIED' && <Button size="sm" variant="ghost" className="mt-2" onClick={() => void act(item, 'undo')}>Undo</Button>}
              </div>
            )}
          />
        )}
      </div>
    </div>
  );
}
