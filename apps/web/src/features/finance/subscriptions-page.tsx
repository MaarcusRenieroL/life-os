import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { AlertTriangle, Pause, Play, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { useConfirmDialog } from '@/components/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getErrorMessage } from '@/lib/error';

import { DetectedSubscriptions } from './detected-subscriptions';
import { subscriptionApi } from './subscription-api';
import { SubscriptionDialog } from './subscription-dialog';
import type { SubscriptionResponse } from './types';
import { formatINR } from './utils';

type View = 'tracked' | 'detected';
type Filter = 'active' | 'flagged' | 'inactive';

const CYCLE_LABELS = { WEEKLY: 'week', MONTHLY: 'month', QUARTERLY: 'quarter', YEARLY: 'year' } as const;

function Tile({ label, value, destructive }: { label: string; value: string; destructive?: boolean }) {
  return (
    <div className="rounded-lg border bg-card p-3 text-center">
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
  const [filter, setFilter] = useState<Filter>('active');
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

  const shown = subs.filter((s) => (filter === 'active' ? s.status === 'ACTIVE' : filter === 'flagged' ? s.wasteful : s.status !== 'ACTIVE'));

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

          <div className="flex gap-2">
            {(['active', 'flagged', 'inactive'] as Filter[]).map((f) => (
              <Button key={f} size="sm" variant={filter === f ? 'secondary' : 'ghost'} onClick={() => setFilter(f)}>
                {f === 'active' ? 'Active' : f === 'flagged' ? 'Low use, high cost' : 'Paused & cancelled'}
              </Button>
            ))}
          </div>

          {shown.length === 0 ? (
            <EmptyState message={subs.length === 0 ? 'No subscriptions yet - add one, or track one from the Detected tab.' : 'Nothing here.'} />
          ) : (
            <ul className="flex flex-col gap-2">
              {shown.map((s) => (
                <li key={s.id}>
                  <Card className={s.wasteful ? 'border-amber-500/50' : undefined}>
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{s.name}</span>
                          {s.wasteful && (
                            <Badge variant="outline" className="gap-1 border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-400">
                              <AlertTriangle className="size-3" /> Low use, high cost
                            </Badge>
                          )}
                          {s.status !== 'ACTIVE' && <Badge variant="outline">{s.status === 'PAUSED' ? 'Paused' : 'Cancelled'}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatINR(s.amount)}/{CYCLE_LABELS[s.billingCycle]} · {formatINR(s.monthlyCost)}/mo · {renewalText(s)}
                          {s.usageRating != null && ` · usage ${s.usageRating}/5`}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1 text-xs">
                        {s.status === 'ACTIVE' && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => void run(() => subscriptionApi.logUse(s.id), 'Marked as used today')}>
                              Used it
                            </Button>
                            {s.accountId && (
                              <Button size="sm" variant="ghost" onClick={() => void run(() => subscriptionApi.chargeNow(s.id), 'Charge recorded')}>
                                Charge now
                              </Button>
                            )}
                            <Button size="icon" variant="ghost" aria-label={`Pause ${s.name}`} onClick={() => void run(() => subscriptionApi.pause(s.id))}>
                              <Pause className="size-4" />
                            </Button>
                          </>
                        )}
                        {s.status === 'PAUSED' && (
                          <Button size="icon" variant="ghost" aria-label={`Resume ${s.name}`} onClick={() => void run(() => subscriptionApi.resume(s.id))}>
                            <Play className="size-4" />
                          </Button>
                        )}
                        {s.status !== 'CANCELLED' && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditing(s);
                                setDialogOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => void cancel(s)}>
                              Cancel
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void remove(s)}>
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <SubscriptionDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} onSaved={refresh} />
      {dialog}
    </div>
  );
}
