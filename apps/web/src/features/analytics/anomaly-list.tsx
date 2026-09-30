import { AlertOctagon, AlertTriangle, Info } from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import { cn } from '@/lib/utils';

import type { Anomaly } from './types';

const STYLES = {
  ALERT: { classes: 'border-red-500/40 bg-red-500/10', icon: AlertOctagon, iconClass: 'text-red-500' },
  WARN: { classes: 'border-amber-500/40 bg-amber-500/10', icon: AlertTriangle, iconClass: 'text-amber-500' },
  INFO: { classes: 'border-sky-500/40 bg-sky-500/10', icon: Info, iconClass: 'text-sky-500' },
} as const;

/** Things worth a second look: spending spikes, quiet habits, overdue goals. */
export function AnomalyList({ anomalies }: { anomalies: Anomaly[] }) {
  if (anomalies.length === 0) return <EmptyState message="Nothing unusual - everything is within your normal range." />;

  return (
    <ul className="flex flex-col gap-2">
      {anomalies.map((a, i) => {
        const style = STYLES[a.severity];
        const Icon = style.icon;
        return (
          <li key={`${a.type}-${i}`} className={cn('flex items-start gap-3 rounded-md border p-3', style.classes)}>
            <Icon className={cn('mt-0.5 size-4 shrink-0', style.iconClass)} />
            <div>
              <p className="text-sm font-medium">{a.title}</p>
              <p className="text-xs text-muted-foreground">{a.detail}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
