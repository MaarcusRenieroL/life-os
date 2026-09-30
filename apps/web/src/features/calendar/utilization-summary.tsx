import { CATEGORY_DOT_CLASSES } from './event-badges';
import { EVENT_CATEGORY_LABELS, type Utilization } from './types';

function formatHours(minutes: number): string {
  const hours = minutes / 60;
  return hours >= 10 ? `${Math.round(hours)}h` : `${hours.toFixed(1)}h`;
}

/** "How did I spend this range" - a per-category breakdown bar below the week header, driven by
 * EventService.utilization. Only categories with time logged are shown, largest first. */
export function UtilizationSummary({ utilization }: { utilization: Utilization }) {
  const entries = Object.entries(utilization.minutesByCategory)
    .filter(([, minutes]) => (minutes ?? 0) > 0)
    .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0));

  if (entries.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">{formatHours(utilization.totalMinutes)} scheduled</span>
      {entries.map(([category, minutes]) => (
        <span key={category} className="flex items-center gap-1.5">
          <span className={`size-2 rounded-full ${CATEGORY_DOT_CLASSES[category as keyof typeof CATEGORY_DOT_CLASSES]}`} />
          {EVENT_CATEGORY_LABELS[category as keyof typeof EVENT_CATEGORY_LABELS]} {formatHours(minutes ?? 0)}
        </span>
      ))}
    </div>
  );
}
