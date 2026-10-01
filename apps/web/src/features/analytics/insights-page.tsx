import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { SectionHeading } from '@/components/section-heading';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

import { analyticsApi } from './analytics-api';
import { AnomalyList } from './anomaly-list';
import { InsightList } from './insight-list';

export function AnalyticsInsightsPage() {
  const [days, setDays] = useState('60');
  const { data: insights, isLoading } = useQuery({ queryKey: ['analytics', 'insights', days], queryFn: () => analyticsApi.insights(Number(days)) });
  const { data: anomalies = [] } = useQuery({ queryKey: ['analytics', 'anomalies'], queryFn: analyticsApi.anomalies });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>

      <section>
        <SectionHeading className="mb-3">anomalies</SectionHeading>
        <AnomalyList anomalies={anomalies} />
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <SectionHeading>patterns</SectionHeading>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="min-w-36" aria-label="Analysis window">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['30', '60', '90', '180'].map((d) => (
                <SelectItem key={d} value={d}>
                  Last {d} days
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isLoading || !insights ? <Skeleton className="h-32 w-full" /> : <InsightList insights={insights} />}
        <p className="mt-3 text-xs text-muted-foreground">
          Patterns are correlations between things you track - they show what tends to go together, not what causes what. There is no sleep tracking, so journal energy stands in for how rested you are.
        </p>
      </section>
    </div>
  );
}
