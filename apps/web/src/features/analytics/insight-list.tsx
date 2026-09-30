import { TrendingDown, TrendingUp } from 'lucide-react';

import { EmptyState } from '@/components/empty-state';

import type { Insight } from './types';

/** Correlations between things you track. They're patterns, not proof - each card says how many
 * days it's based on. */
export function InsightList({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) {
    return <EmptyState message="No clear patterns yet - insights appear once there are about two weeks of overlapping data (for example journal energy and focus time)." />;
  }

  return (
    <ul className="flex flex-col gap-2">
      {insights.map((insight) => {
        const Icon = insight.correlation >= 0 ? TrendingUp : TrendingDown;
        return (
          <li key={insight.title} className="flex items-start gap-3 rounded-md border p-3">
            <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium">{insight.title}</p>
              <p className="text-xs text-muted-foreground">{insight.detail}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
