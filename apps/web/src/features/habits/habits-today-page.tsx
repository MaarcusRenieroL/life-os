import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Flame, Pencil } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { DifficultyRating } from './habit-badges';
import { habitsApi } from './habits-api';
import type { TodayHabitEntry } from './types';

const todayIso = () => new Date().toISOString().slice(0, 10);

/** Deterministic accent per category, so checkboxes read as color-coded without a stored color. */
const CATEGORY_HUES = [149, 220, 80, 320, 25, 190, 280] as const;

function categoryAccent(category: string | null): string {
  if (!category) return 'oklch(0.63 0.006 285)';
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
  const hue = CATEGORY_HUES[hash % CATEGORY_HUES.length];
  return `oklch(0.72 0.15 ${hue})`;
}

function isDone(entry: TodayHabitEntry): boolean {
  return entry.todayLog?.status === 'COMPLETED' || entry.todayLog?.status === 'PARTIAL';
}

/** Round Todoist-style checkbox. For COUNT/DURATION habits, a click logs the full target - the
 * pencil next to the value lets you enter something else instead. */
function CheckCircle({
  entry,
  accent,
  onClick,
}: {
  entry: TodayHabitEntry;
  accent: string;
  onClick: () => void;
}) {
  const done = isDone(entry);
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex size-[22px] shrink-0 items-center justify-center rounded-full border-2 transition-colors"
      style={{ borderColor: done ? accent : 'var(--border)', backgroundColor: done ? accent : 'transparent' }}
      title={done ? 'Mark not done' : entry.habit.type === 'NEGATIVE' ? 'Mark avoided' : 'Mark complete'}
    >
      {done && <Check className="size-3.5 stroke-[3]" style={{ color: 'var(--background)' }} />}
    </button>
  );
}

/** Small inline editor for a COUNT/DURATION value - a plain text-sized input, not a boxed form
 * control, so it reads as part of the checklist row rather than a separate widget. */
function ValueEditor({
  entry,
  onDone,
}: {
  entry: TodayHabitEntry;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(entry.todayLog?.value != null ? String(entry.todayLog.value) : '');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!value || saving) return;
    setSaving(true);
    try {
      await habitsApi.upsertLog(entry.habit.id, { logDate: todayIso(), status: 'COMPLETED', value: Number(value) });
      queryClient.invalidateQueries({ queryKey: ['habits', 'today'] });
      queryClient.invalidateQueries({ queryKey: ['habits', 'analytics'] });
      onDone();
    } catch {
      toast.error('Could not log this habit. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <input
      type="number"
      inputMode="decimal"
      autoFocus
      className="w-14 border-b border-dashed border-foreground/40 bg-transparent text-sm tabular-nums outline-none [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      placeholder={entry.habit.targetUnit ?? '0'}
      value={value}
      disabled={saving}
      onChange={(e) => setValue(e.target.value)}
      onFocus={(e) => e.target.select()}
      onKeyDown={(e) => e.key === 'Enter' && void submit()}
      onBlur={() => void submit()}
    />
  );
}

function HabitChecklistRow({ entry }: { entry: TodayHabitEntry & { currentStreak: number } }) {
  const done = isDone(entry);
  const accent = categoryAccent(entry.habit.category);
  const isNumeric = entry.habit.type === 'COUNT' || entry.habit.type === 'DURATION';
  const [editingValue, setEditingValue] = useState(false);
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  async function quickToggle() {
    if (saving) return;
    setSaving(true);
    try {
      if (isNumeric) {
        await habitsApi.upsertLog(entry.habit.id, {
          logDate: todayIso(),
          status: done ? 'MISSED' : 'COMPLETED',
          value: done ? undefined : (entry.habit.targetValue ?? entry.todayLog?.value ?? 1),
        });
      } else {
        await habitsApi.upsertLog(entry.habit.id, { logDate: todayIso(), status: done ? 'MISSED' : 'COMPLETED' });
      }
      queryClient.invalidateQueries({ queryKey: ['habits', 'today'] });
      queryClient.invalidateQueries({ queryKey: ['habits', 'analytics'] });
    } catch {
      toast.error('Could not log this habit. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="group flex items-start gap-3 border-b border-border py-3 last:border-0">
      <CheckCircle entry={entry} accent={accent} onClick={() => void quickToggle()} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2">
          <Link
            to={`/habits/${entry.habit.id}`}
            className={cn('text-sm font-medium hover:underline', done && 'text-muted-foreground line-through')}
          >
            {entry.habit.icon && <span className="mr-1">{entry.habit.icon}</span>}
            {entry.habit.name}
          </Link>

          {isNumeric &&
            (editingValue ? (
              <ValueEditor entry={entry} onDone={() => setEditingValue(false)} />
            ) : (
              <button
                type="button"
                onClick={() => setEditingValue(true)}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                {entry.todayLog?.value != null ? (
                  <span className="tabular-nums">
                    {entry.todayLog.value}
                    {entry.habit.targetValue ? `/${entry.habit.targetValue}` : ''} {entry.habit.targetUnit ?? ''}
                  </span>
                ) : (
                  <span className="italic">log value</span>
                )}
                <Pencil className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ))}

          {entry.currentStreak > 0 && (
            <span className="inline-flex items-center gap-0.5 text-xs" style={{ color: accent }}>
              <Flame className="size-3" />
              {entry.currentStreak}
            </span>
          )}
        </div>

        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span className="font-medium" style={{ color: accent }}>
            {entry.habit.category ?? 'General'}
          </span>
          {entry.habit.why && <span className="italic">{entry.habit.why}</span>}
          <DifficultyRating difficulty={entry.habit.difficulty} />
        </div>
      </div>
    </div>
  );
}

export function HabitsTodayPage() {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['habits', 'today'],
    queryFn: habitsApi.today,
  });

  // Streak counts come from the analytics aggregate, which already carries every habit's current
  // streak in one call - one /streak request per habit would be an N+1 waterfall on a page that
  // can list dozens of habits.
  const { data: analytics } = useQuery({
    queryKey: ['habits', 'analytics', 12],
    queryFn: () => habitsApi.analytics(12),
  });

  const streaksByHabitId = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of analytics?.habitPerformance ?? []) {
      map.set(entry.habitId, entry.currentStreak);
    }
    return map;
  }, [analytics]);

  const withStreaks = useMemo(
    () => entries.map((entry) => ({ ...entry, currentStreak: streaksByHabitId.get(entry.habit.id) ?? 0 })),
    [entries, streaksByHabitId],
  );

  const doneCount = withStreaks.filter(isDone).length;
  const total = withStreaks.length;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
        {!isLoading && total > 0 && (
          <span className="text-sm text-muted-foreground tabular-nums">
            {doneCount} / {total}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="mt-6 flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : total === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Nothing due today.{' '}
          <Link to="/habits/list" className="underline">
            Manage your habits
          </Link>
          .
        </p>
      ) : (
        <div className="mt-4 flex flex-col">
          {withStreaks.map((entry) => (
            <HabitChecklistRow key={entry.habit.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
