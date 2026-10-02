import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { AlertTriangle, Pause, Play, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';

import { useConfirmDialog } from '@/components/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataGrid } from '@/components/data-table/data-grid';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getErrorMessage } from '@/lib/error';

import { DetectedSubscriptions } from './detected-subscriptions';
import { subscriptionApi } from './subscription-api';
import { SubscriptionDialog } from './subscription-dialog';
import type { SubscriptionResponse } from './types';
import { formatINR } from './utils';

type View = 'tracked' | 'detected';

const CYCLE_LABELS = { WEEKLY: 'week', MONTHLY: 'month', QUARTERLY: 'quarter', YEARLY: 'year' } as const;

function Tile({ label, value, destructive }: { label: string; value: string; destructive?: boolean }) {
  return (
    <div className="hud-panel p-3 text-center">
      <div className={`text-lg font-semibold ${destructive ? 'text-destructive' : ''}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function renewalText(s: SubscriptionResponse): string {
  if (s.status !== 'ACTIVE') return s.status === 'PAUSED' ? 'Paused' : 'Cancelled';
  const days = s.daysUntilRenewal ?? 0;
  const when = days <= 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;
  return `Renews ${when} · ${format(parseISO(s.nextBillingDate), 'MMM d')}`;
}

/** Subscriptions you declared (with billing, reminders and usage tracking) and, on the other tab,
 * the recurring charges detected from your transactions - which you can promote to tracked. */
export function SubscriptionsPage() {
  const queryClient = useQueryClient();
  const { confirm, dialog } = useConfirmDialog();
  const [view, setView] = useState<View>('tracked');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionResponse | null>(null);

  const { data: subs = [] } = useQuery({ queryKey: ['finance', 'subscriptions'], queryFn: () => subscriptionApi.list() });
  const { data: summary } = useQuery({ queryKey: ['finance', 'subscriptions', 'summary'], queryFn: subscriptionApi.summary });

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['finance', 'subscriptions'] });
  }

  async function run(action: () => Promise<unknown>, success?: string) {
    try {
      await action();
      if (success) toast.success(success);
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err, 'That did not work. Please try again.'));
    }
  }

  async function cancel(s: SubscriptionResponse) {
    if (!(await confirm({ title: `Mark “${s.name}” as cancelled?`, description: 'It stops billing and reminders and stays in your list as history.', confirmLabel: 'Cancel subscription' }))) return;
    await run(() => subscriptionApi.cancel(s.id), 'Marked as cancelled');
  }

  async function remove(s: SubscriptionResponse) {
    if (!(await confirm({ title: `Delete “${s.name}”?`, description: 'Expenses it already booked are kept.', confirmLabel: 'Delete' }))) return;
    await run(() => subscriptionApi.delete(s.id));
  }

  const columns = useMemo<ColumnDef<SubscriptionResponse>[]>(
    () => [
      {
        accessorKey: 'name',
        meta: { title: 'Subscription', filter: { type: 'text' } },
        cell: ({ row }) => (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{row.original.name}</span>
            {row.original.wasteful && (
              <Badge variant="outline" className="gap-1 border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="size-3" /> Low use, high cost
              </Badge>
            )}
          </div>
        ),
      },
      {
        id: 'status',
        accessorFn: (s) => (s.status === 'ACTIVE' ? 'Active' : s.status === 'PAUSED' ? 'Paused' : 'Cancelled'),
        meta: { title: 'Status', filter: { type: 'select' } },
      },
      {
        accessorKey: 'amount',
        meta: { title: 'Amount', align: 'right', filter: { type: 'number' }, format: (v) => formatINR(Number(v)) },
        cell: ({ row }) => `${formatINR(row.original.amount)}/${CYCLE_LABELS[row.original.billingCycle]}`,
      },
      {
        id: 'billingCycle',
        accessorFn: (s) => s.billingCycle.charAt(0) + s.billingCycle.slice(1).toLowerCase(),
        meta: { title: 'Billing cycle', filter: { type: 'select' } },
      },
      {
        accessorKey: 'monthlyCost',
        meta: { title: 'Per month', align: 'right', aggregate: 'sum', filter: { type: 'number' }, format: (v) => formatINR(Number(v)) },
        cell: ({ row }) => formatINR(row.original.monthlyCost),
      },
      {
        accessorKey: 'yearlyCost',
        meta: { title: 'Per year', align: 'right', aggregate: 'sum', filter: { type: 'number' }, format: (v) => formatINR(Number(v)) },
        cell: ({ row }) => formatINR(row.original.yearlyCost),
      },
      {
        accessorKey: 'nextBillingDate',
        meta: { title: 'Next billing', filter: { type: 'date' }, exportValue: (s) => s.nextBillingDate },
        cell: ({ row }) => renewalText(row.original),
      },
      {
        accessorKey: 'usageRating',
        meta: { title: 'Usage (of 5)', align: 'right', filter: { type: 'number' } },
        cell: ({ row }) => row.original.usageRating ?? '—',
      },
      {
        accessorKey: 'lastUsedOn',
        meta: { title: 'Last used', filter: { type: 'date' } },
        cell: ({ row }) => row.original.lastUsedOn?.slice(0, 10) ?? '—',
      },
      {
        accessorKey: 'wasteful',
        meta: { title: 'Low use, high cost', filter: { type: 'boolean' }, exportValue: (s) => (s.wasteful ? 'Yes' : 'No') },
        cell: ({ row }) => (row.original.wasteful ? 'Yes' : '—'),
      },
      {
        id: 'actions',
        header: '',
        enableHiding: false,
        enableSorting: false,
        enableResizing: false,
        cell: ({ row }) => {
          const s = row.original;
          return (
            <div className="flex flex-wrap items-center gap-1 text-xs" onClick={(e) => e.stopPropagation()}>
              {s.status === 'ACTIVE' && (
                <>
                  <Button size="sm" variant="ghost" onClick={() => void run(() => subscriptionApi.logUse(s.id), 'Marked as used today')}>Used it</Button>
                  {s.accountId && (
                    <Button size="sm" variant="ghost" onClick={() => void run(() => subscriptionApi.chargeNow(s.id), 'Charge recorded')}>Charge now</Button>
                  )}
                  <Button size="icon" variant="ghost" aria-label={`Pause ${s.name}`} onClick={() => void run(() => subscriptionApi.pause(s.id))}><Pause className="size-4" /></Button>
                </>
              )}
              {s.status === 'PAUSED' && (
                <Button size="icon" variant="ghost" aria-label={`Resume ${s.name}`} onClick={() => void run(() => subscriptionApi.resume(s.id))}><Play className="size-4" /></Button>
              )}
              {s.status !== 'CANCELLED' && (
                <>
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(s); setDialogOpen(true); }}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => void cancel(s)}>Cancel</Button>
                </>
              )}
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void remove(s)}>Delete</Button>
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Subscriptions</h1>
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as View)}>
            <TabsList>
              <TabsTrigger value="tracked">Tracked</TabsTrigger>
              <TabsTrigger value="detected">Detected</TabsTrigger>
            </TabsList>
          </Tabs>
          {view === 'tracked' && (
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus /> Add
            </Button>
          )}
        </div>
      </div>

      {view === 'detected' ? (
        <DetectedSubscriptions onTracked={() => { refresh(); setView('tracked'); }} />
      ) : (
        <>
          {summary && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Tile label="Monthly total" value={formatINR(summary.monthlyTotal)} />
              <Tile label="Yearly total" value={formatINR(summary.yearlyTotal)} />
              <Tile label="Renewing in 7 days" value={`${summary.renewingSoonCount} · ${formatINR(summary.renewingSoonTotal)}`} />
              <Tile label="Low-use / month" value={formatINR(summary.wastefulMonthly)} destructive={summary.wastefulCount > 0} />
            </div>
          )}

          {subs.length === 0 ? (
            <EmptyState message="No subscriptions yet - add one, or track one from the Detected tab." />
          ) : (
            <DataGrid
              tableId="finance.subscriptions"
              data={subs}
              columns={columns}
              getRowId={(s) => s.id}
              onRowClick={(s) => { if (s.status !== 'CANCELLED') { setEditing(s); setDialogOpen(true); } }}
              initialSorting={[{ id: 'nextBillingDate', desc: false }]}
              initialFilters={[{ id: 'status', value: ['Active'] }]}
              views={[
                { id: 'paused', name: 'Paused & cancelled', filters: [{ id: 'status', value: ['Paused', 'Cancelled'] }] },
                { id: 'lowuse', name: 'Low use, high cost', filters: [{ id: 'wasteful', value: ['true'] }] },
                { id: 'everything', name: 'Everything', filters: [] },
              ]}
              initialVisibility={{ billingCycle: false, yearlyCost: false, usageRating: false, lastUsedOn: false, wasteful: false }}
              exportName="subscriptions"
              searchPlaceholder="Search subscriptions…"
              hidePagination={subs.length <= 10}
              emptyMessage="Nothing matches."
              mobileCard={(s) => (
                <div className="rounded-lg border p-3" onClick={() => { if (s.status !== 'CANCELLED') { setEditing(s); setDialogOpen(true); } }}>
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-sm">{formatINR(s.monthlyCost)}/mo</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{renewalText(s)}</p>
                </div>
              )}
            />
          )}
        </>
      )}

      <SubscriptionDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} onSaved={refresh} />
      {dialog}
    </div>
  );
}
