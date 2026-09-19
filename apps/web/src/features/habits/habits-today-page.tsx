import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Flame, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { DifficultyRating } from './habit-badges';
import { habitsApi } from './habits-api';
import type { TodayHabitEntry } from './types';

const todayIso = () => new Date().toISOString().slice(0, 10);

/** Deterministic accent per category so the grid reads as color-coded without a stored color. */
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

/** Full-circle SVG progress ring for the day's overall completion. */
function ProgressRing({ percent, size = 84 }: { percent: number; size?: number }) {
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percent / 100);

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--secondary)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={percent >= 100 ? 'oklch(0.75 0.17 149)' : 'var(--primary)'}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-[stroke-dashoffset] duration-500 ease-out"
      />
    </svg>
  );
}

function LogControl({ entry, accent }: { entry: TodayHabitEntry; accent: string }) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(entry.todayLog?.value != null ? String(entry.todayLog.value) : '');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const done = isDone(entry);
  const isNumeric = entry.habit.type === 'COUNT' || entry.habit.type === 'DURATION';

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['habits', 'today'] });
    queryClient.invalidateQueries({ queryKey: ['habits', 'analytics'] });
  }

  async function submitNumeric() {
    if (!value || saving) return;
    setSaving(true);
    try {
      await habitsApi.upsertLog(entry.habit.id, { logDate: todayIso(), status: 'COMPLETED', value: Number(value) });
      invalidate();
      setEditing(false);
    } catch {
      toast.error('Could not log this habit. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleBinary() {
    if (saving) return;
    setSaving(true);
    try {
      await habitsApi.upsertLog(entry.habit.id, { logDate: todayIso(), status: done ? 'MISSED' : 'COMPLETED' });
      invalidate();
    } catch {
      toast.error('Could not log this habit. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (!isNumeric) {
    return (
      <button
        type="button"
        onClick={() => void toggleBinary()}
        disabled={saving}
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full border-2 transition-all',
          done ? 'scale-105' : 'border-border bg-transparent hover:border-foreground/40',
        )}
        style={done ? { borderColor: accent, backgroundColor: `${accent}26` } : undefined}
        title={done ? 'Mark not done' : entry.habit.type === 'NEGATIVE' ? 'Mark avoided' : 'Mark complete'}
      >
        {done && <Check className="size-4" style={{ color: accent }} />}
      </button>
    );
  }

  if (editing || !done) {
    return (
      <div className="flex shrink-0 items-center gap-1.5">
        <input
          type="number"
          autoFocus={editing}
          className="h-9 w-16 shrink-0 rounded-md border border-input bg-transparent px-2 text-right text-sm tabular-nums outline-none focus:border-ring"
          placeholder={entry.habit.targetUnit ?? '0'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void submitNumeric()}
          onBlur={() => value === '' && setEditing(false)}
        />
        <button
          type="button"
          onClick={() => void submitNumeric()}
          disabled={saving || !value}
          className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-border transition-colors hover:border-foreground/40 disabled:opacity-40"
        >
          <Check className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 transition-all"
      style={{ borderColor: accent, backgroundColor: `${accent}26` }}
      title="Edit today's value"
    >
      <Check className="size-4" style={{ color: accent }} />
    </button>
  );
}

function HabitTile({ entry }: { entry: TodayHabitEntry & { currentStreak: number } }) {
  const done = isDone(entry);
  const accent = categoryAccent(entry.habit.category);
  const target = entry.habit.targetValue;
  const value = entry.todayLog?.value;
  const fillPercent = target && value != null ? Math.min(100, Math.round((value / target) * 100)) : done ? 100 : 0;

  return (
    <div
      className={cn(
        'group relative flex flex-col gap-3 overflow-hidden rounded-xl border bg-card p-4 transition-all',
        done ? 'border-transparent' : 'border-border hover:border-foreground/20',
      )}
      style={done ? { boxShadow: `inset 0 0 0 1px ${accent}40` } : undefined}
    >
      <div className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: accent, opacity: done ? 1 : 0.5 }} />
      {fillPercent > 0 && fillPercent < 100 && (
        <div className="absolute inset-x-0 bottom-0 h-[3px] bg-secondary">
          <div className="h-full transition-all" style={{ width: `${fillPercent}%`, backgroundColor: accent }} />
        </div>
      )}

      <div className="flex min-w-0 items-center gap-2.5">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-lg text-lg"
          style={{ backgroundColor: `${accent}1f` }}
        >
          {entry.habit.icon ?? '•'}
        </div>
        <div className="min-w-0">
          <Link to={`/habits/${entry.habit.id}`} className="block truncate text-sm font-semibold hover:underline">
            {entry.habit.name}
          </Link>
          <span className="text-[11px] font-medium tracking-wide uppercase" style={{ color: accent }}>
            {entry.habit.category ?? 'General'}
          </span>
        </div>
      </div>

      {entry.habit.why && <p className="line-clamp-2 text-xs text-muted-foreground italic">{entry.habit.why}</p>}

      <div className="mt-auto flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          {entry.currentStreak > 0 && (
            <span className="inline-flex shrink-0 items-center gap-1 font-medium" style={{ color: accent }}>
              <Flame className="size-3.5" />
              {entry.currentStreak}
            </span>
          )}
          <DifficultyRating difficulty={entry.habit.difficulty} />
          {value != null && (
            <span className="truncate tabular-nums">
              {value} {entry.habit.targetUnit ?? ''}
              {target ? ` / ${target}` : ''}
            </span>
          )}
        </div>
        <LogControl entry={entry} accent={accent} />
      </div>
    </div>
  );
}

export function HabitsTodayPage() {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['habits', 'today'],
    queryFn: habitsApi.today,
  });

  // Streak badges come from the analytics aggregate, which already carries every habit's
  // current streak in one call - one /streak request per habit would be an N+1 waterfall on a
  // page that can list dozens of habits.
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
  const donePercent = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const bestStreak = withStreaks.reduce((max, e) => Math.max(max, e.currentStreak), 0);
  const today = new Date();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-6 rounded-xl border bg-card px-6 py-5">
        <div>
          <p className="font-mono text-xs text-muted-foreground">$ today</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </h1>
          {!isLoading && total > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              {donePercent === 100 ? (
                <span className="inline-flex items-center gap-1 font-medium text-primary">
                  <Sparkles className="size-3.5" /> Everything's done - nice work.
                </span>
              ) : (
                `${total - doneCount} habit${total - doneCount === 1 ? '' : 's'} left today`
              )}
              {bestStreak > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 text-amber-500">
                  <Flame className="size-3.5" /> {bestStreak}-day best streak
                </span>
              )}
            </p>
          )}
        </div>

        {!isLoading && total > 0 && (
          <div className="relative flex items-center justify-center">
            <ProgressRing percent={donePercent} />
            <div className="absolute flex flex-col items-center">
              <span className="text-lg font-bold tabular-nums">{donePercent}%</span>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {doneCount}/{total}
              </span>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
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
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {withStreaks.map((entry) => (
            <HabitTile key={entry.habit.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
