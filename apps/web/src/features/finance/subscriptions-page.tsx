import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';

import { CategorizeDialog } from './categorize-dialog';
import { merchantApi } from './merchant-api';
import { recurringPatternApi } from './recurring-pattern-api';
import type { RecurringPatternResponse } from './types';
import { formatINR, frequencyLabel, monthlyEquivalent } from './utils';

const UNUSED_IDLE_DAYS = 30;
const RENEWING_SOON_DAYS = 7;

type FilterChip = 'all' | 'unused' | 'renewing';

export function SubscriptionsPage() {
  const queryClient = useQueryClient();
  const { data: patterns = [] } = useQuery({ queryKey: ['finance', 'recurring'], queryFn: recurringPatternApi.getPatterns });
  const { data: merchants = [] } = useQuery({ queryKey: ['finance', 'merchants'], queryFn: merchantApi.getMerchants });

  const [filter, setFilter] = useState<FilterChip>('all');
  const [managing, setManaging] = useState<RecurringPatternResponse | null>(null);

  const rows = useMemo(() => {
    const now = Date.now();
    return patterns
      .map((p) => {
        const merchant = merchants.find((m) => m.id === p.merchantId);
        const monthly = monthlyEquivalent(p.averageAmount, p.frequency);
        const idleDays = p.lastTransactionDate ? Math.floor((now - new Date(p.lastTransactionDate).getTime()) / 86_400_000) : Infinity;
        const nextRenewalDays = p.nextExpectedDate ? Math.ceil((new Date(p.nextExpectedDate).getTime() - now) / 86_400_000) : null;
        return {
          ...p,
          initials: (merchant?.name ?? '??').slice(0, 2).toUpperCase(),
          merchantName: merchant?.name ?? 'Unknown',
          monthly,
          cycleLabel: frequencyLabel(p.frequency),
          unused: idleDays >= UNUSED_IDLE_DAYS,
          renewingSoon: nextRenewalDays !== null && nextRenewalDays >= 0 && nextRenewalDays <= RENEWING_SOON_DAYS,
          nextRenewalDays,
          nextRenewalLabel: p.nextExpectedDate ? new Date(p.nextExpectedDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—',
          lastUsedLabel: idleDays === Infinity ? 'no recent activity' : idleDays === 0 ? 'today' : `${idleDays} days ago`,
        };
      })
      .sort((a, b) => (a.nextRenewalDays ?? Infinity) - (b.nextRenewalDays ?? Infinity));
  }, [patterns, merchants]);

  const filtered = rows.filter((r) => (filter === 'unused' ? r.unused : filter === 'renewing' ? r.renewingSoon : true));

  const monthlyTotal = rows.reduce((s, r) => s + r.monthly, 0);
  const wastedMonthly = rows.filter((r) => r.unused).reduce((s, r) => s + r.monthly, 0);
  const renewingSoon = rows.filter((r) => r.renewingSoon);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['finance', 'recurring'] });
  }

  async function dismiss(pattern: RecurringPatternResponse) {
    await recurringPatternApi.dismiss(pattern.id);
    invalidate();
  }

  async function saveCategory(categoryIds: string[]) {
    if (!managing) return;
    await recurringPatternApi.updateCategory(managing.id, categoryIds[0]);
    invalidate();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Subscriptions</h1>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Monthly total" value={formatINR(monthlyTotal)} />
        <StatTile label="Yearly total" value={formatINR(monthlyTotal * 12)} />
        <StatTile label="Active" value={String(rows.length)} />
        <StatTile label="Wasted / month" value={formatINR(wastedMonthly)} destructive={wastedMonthly > 0} />
      </div>

      {renewingSoon.length > 0 && (
        <div className="mt-4 rounded-lg border border-yellow-500/40 bg-yellow-500/5 px-3 py-2 text-sm">
          {renewingSoon.length} renewal(s) in the next 7 days — {formatINR(renewingSoon.reduce((s, r) => s + r.averageAmount, 0))}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        {(['all', 'unused', 'renewing'] as FilterChip[]).map((chip) => (
          <Button key={chip} size="sm" variant={filter === chip ? 'secondary' : 'ghost'} onClick={() => setFilter(chip)}>
            {chip === 'all' ? 'All active' : chip === 'unused' ? 'Unused' : 'Renewing soon'}
          </Button>
        ))}
      </div>

      <ul className="mt-4 flex flex-col gap-1.5">
        {filtered.map((r) => (
          <li key={r.id} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5">
            <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">{r.initials}</div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{r.merchantName}</div>
              <div className="text-xs text-muted-foreground">
                {r.cycleLabel} · next {r.nextRenewalLabel} · last used {r.lastUsedLabel}
              </div>
            </div>
            <div className="text-sm font-medium">{formatINR(r.monthly)}/mo</div>
            <div className="flex gap-2 text-xs">
              <button className="text-primary hover:underline" onClick={() => setManaging(r)}>Manage</button>
              {r.unused && <button className="text-destructive hover:underline" onClick={() => void dismiss(r)}>Cancel</button>}
            </div>
          </li>
        ))}
        {filtered.length === 0 && <EmptyState message="No subscriptions match." />}
      </ul>

      <CategorizeDialog
        open={!!managing}
        onOpenChange={(o) => !o && setManaging(null)}
        transactionLabel={managing?.merchantId ? merchants.find((m) => m.id === managing.merchantId)?.name ?? '' : ''}
        initialCategoryIds={managing?.categoryId ? [managing.categoryId] : []}
        onSave={(ids) => void saveCategory(ids)}
      />
    </div>
  );
}

function StatTile({ label, value, destructive }: { label: string; value: string; destructive?: boolean }) {
  return (
    <div className="rounded-lg border bg-card p-3 text-center">
      <div className={`text-lg font-semibold ${destructive ? 'text-destructive' : ''}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
