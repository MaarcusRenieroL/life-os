import { useQuery } from '@tanstack/react-query';
import { format, isToday, isTomorrow } from 'date-fns';

import { EmptyState } from '@/components/empty-state';
import { SectionHeading } from '@/components/section-heading';
import { coreApi, type TodayItem } from '@/features/core/core-api';
import { cn } from '@/lib/utils';

/** The cross-module "what needs my attention" view - the actual point of the whole
 * settings/notifications build: one page pulling due habits, upcoming interviews, bills, and
 * flagged notes from every module instead of five separate dashboards. A module that's down or
 * slow just contributes zero items here (see core's TodayService) rather than breaking the page. */
export function TodayPage() {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['core', 'today'],
    queryFn: coreApi.getToday,
    retry: false,
    throwOnError: false,
  });

  const overdue = items.filter((item) => item.dueAt && new Date(item.dueAt) < new Date() && !isToday(new Date(item.dueAt)));
  const today = items.filter((item) => !item.dueAt || isToday(new Date(item.dueAt)));
  const upcoming = items.filter((item) => item.dueAt && !isToday(new Date(item.dueAt)) && new Date(item.dueAt) >= new Date());

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
      <p className="mt-1 text-sm text-muted-foreground">Everything that needs your attention, across every module.</p>

      {isLoading ? (
        <div className="mt-6 text-sm text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <EmptyState className="mt-6" message="Nothing needs your attention right now." />
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {overdue.length > 0 && (
            <TodaySection title="Overdue" items={overdue} tone="destructive" />
          )}
          {today.length > 0 && <TodaySection title="Today" items={today} tone="muted" />}
          {upcoming.length > 0 && <TodaySection title="Coming up" items={upcoming} tone="muted" />}
        </div>
      )}
    </div>
  );
}

function TodaySection({
  title,
  items,
  tone,
}: {
  title: string;
  items: TodayItem[];
  tone: 'muted' | 'destructive';
}) {
  return (
    <section>
      <SectionHeading tone={tone} className="mb-2.5">
        {title}
      </SectionHeading>
      <div className="flex flex-col gap-2">
        {items.map((item, index) => (
          <TodayCard key={`${item.module}-${item.entityId ?? index}`} item={item} />
        ))}
      </div>
    </section>
  );
}

function TodayCard({ item }: { item: TodayItem }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card p-3.5">
      <span
        className={cn(
          'mt-1.5 size-1.5 shrink-0 rounded-full',
          item.priority === 'urgent'
            ? 'bg-destructive'
            : item.priority === 'warning'
              ? 'bg-yellow-500'
              : 'bg-primary/60',
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">{item.title}</span>
          {item.dueAt && <span className="shrink-0 text-[11px] text-muted-foreground">{formatDue(item.dueAt)}</span>}
        </div>
        {item.description && <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>}
        <span className="mt-1 inline-block text-[10px] tracking-wide text-muted-foreground/70 uppercase">
          {item.module}
        </span>
      </div>
    </div>
  );
}

function formatDue(dueAt: string): string {
  const date = new Date(dueAt);
  if (isToday(date)) return format(date, 'p');
  if (isTomorrow(date)) return `Tomorrow, ${format(date, 'p')}`;
  return format(date, 'MMM d');
}
