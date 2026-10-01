import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { SectionHeading } from '@/components/section-heading';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { analyticsApi } from './analytics-api';
import { formatINR } from './utils';

const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;
const short = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/**
 * The money month, measured from the day salary lands: what is left to spend, per day, after bills
 * still to come - so spending right after payday is judged against the salary that pays for it.
 */
export function PayCycleCard() {
  const queryClient = useQueryClient();
  const { data: overview } = useQuery({ queryKey: ['finance', 'overview'], queryFn: analyticsApi.getOverview });
  const [saving, setSaving] = useState(false);

  async function setDay(day: number) {
    setSaving(true);
    try {
      await analyticsApi.setPayCycle(day);
      void queryClient.invalidateQueries({ queryKey: ['finance'] });
    } finally {
      setSaving(false);
    }
  }

  if (!overview) return null;
  const over = overview.safeToSpend < 0;

  return (
    <section className="hud-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <SectionHeading>This pay cycle</SectionHeading>
          <p className="mt-1 text-xs text-muted-foreground">
            {short(overview.cycleStart)} – {short(overview.cycleEnd)} · {overview.daysLeft} day{overview.daysLeft === 1 ? '' : 's'} left
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Month starts on the
          <Select value={String(overview.payCycleStartDay)} onValueChange={(v) => void setDay(Number(v))} disabled={saving}>
            <SelectTrigger size="sm" className="w-20"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <SelectItem key={d} value={String(d)}>{ordinal(d)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>

      {overview.suggestedPayCycleStartDay && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
          <span>Your salary landed on the {ordinal(overview.suggestedPayCycleStartDay)}. Start each month then, so spending after payday counts toward the next cycle?</span>
          <Button size="sm" onClick={() => void setDay(overview.suggestedPayCycleStartDay!)} disabled={saving}>
            Start months on the {ordinal(overview.suggestedPayCycleStartDay)}
          </Button>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Safe to spend today</p>
          <p className={`text-2xl font-semibold ${over ? 'text-destructive' : ''}`}>{formatINR(overview.safeToSpendPerDay)}</p>
          <p className="text-xs text-muted-foreground">
            {over ? `${formatINR(Math.abs(overview.safeToSpend))} over for the cycle` : `${formatINR(overview.safeToSpend)} left in total`}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Spent / income</p>
          <p className="text-xl font-semibold">{formatINR(overview.spentSoFar)}</p>
          <p className="text-xs text-muted-foreground">of {formatINR(overview.expectedIncome)} expected</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Bills still to come</p>
          <p className="text-xl font-semibold">{formatINR(overview.upcomingBills)}</p>
          <p className="text-xs text-muted-foreground">subscriptions due this cycle</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Net worth</p>
          <p className="text-xl font-semibold">{formatINR(overview.netWorth)}</p>
          <p className="text-xs text-muted-foreground">all accounts, cards subtract</p>
        </div>
      </div>
    </section>
  );
}
