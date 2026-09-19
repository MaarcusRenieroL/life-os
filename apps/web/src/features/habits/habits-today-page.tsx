import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Flame, Minus, Plus, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { DifficultyRating } from './habit-badges';
import { habitsApi } from './habits-api';
import type { TodayHabitEntry } from './types';

const todayIso = () => new Date().toISOString().slice(0, 10);

/** Deterministic accent per category so rows read as color-coded without a stored color. */
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

/** SVG progress ring. Used big (the day's hero stat) and small (per-habit dial). */
function Ring({
  percent,
  size,
  stroke,
  color,
  trackColor = 'var(--secondary)',
}: {
  percent: number;
  size: number;
  stroke: number;
  color: string;
  trackColor?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(100, percent) / 100);

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={stroke} />
      {percent > 0 && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      )}
    </svg>
  );
}

function hourGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Still up';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Winding down';
}

/** Inline +/- stepper for COUNT/DURATION habits - replaces the checkbox once opened. */
function Stepper({ entry, accent, onClose }: { entry: TodayHabitEntry; accent: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(entry.todayLog?.value ?? 0);
  const [saving, setSaving] = useState(false);
  const step = entry.habit.type === 'COUNT' ? 1 : 5;

  async function submit(next: number) {
    setValue(next);
    if (saving) return;
    setSaving(true);
    try {
      await habitsApi.upsertLog(entry.habit.id, { logDate: todayIso(), status: 'COMPLETED', value: next });
      queryClient.invalidateQueries({ queryKey: ['habits', 'today'] });
      queryClient.invalidateQueries({ queryKey: ['habits', 'analytics'] });
    } catch {
      toast.error('Could not log this habit. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-background/60 p-1">
      <button
        type="button"
        onClick={() => void submit(Math.max(0, value - step))}
        className="flex size-7 items-center justify-center rounded-full transition-colors hover:bg-secondary"
      >
        <Minus className="size-3.5" />
      </button>
      <span className="w-12 text-center text-sm font-semibold tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => void submit(value + step)}
        className="flex size-7 items-center justify-center rounded-full transition-colors hover:bg-secondary"
      >
        <Plus className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={onClose}
        disabled={value === 0}
        className="ml-1 flex size-7 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-30"
        style={{ backgroundColor: `${accent}33`, color: accent }}
        title="Done"
      >
        <Check className="size-3.5" />
      </button>
    </div>
  );
}

function HabitDial({ entry, accent, onOpenStepper }: { entry: TodayHabitEntry; accent: string; onOpenStepper: () => void }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const done = isDone(entry);
  const isNumeric = entry.habit.type === 'COUNT' || entry.habit.type === 'DURATION';
  const target = entry.habit.targetValue;
  const value = entry.todayLog?.value;
  const fillPercent = isNumeric && target && value != null ? Math.min(100, (value / target) * 100) : done ? 100 : 0;

  async function toggleBinary() {
    if (saving) return;
    setSaving(true);
    try {
      await habitsApi.upsertLog(entry.habit.id, { logDate: todayIso(), status: done ? 'MISSED' : 'COMPLETED' });
      queryClient.invalidateQueries({ queryKey: ['habits', 'today'] });
      queryClient.invalidateQueries({ queryKey: ['habits', 'analytics'] });
    } catch {
      toast.error('Could not log this habit. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void (isNumeric ? onOpenStepper() : toggleBinary())}
      disabled={saving}
      className="relative flex size-11 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95"
      title={done ? 'Edit' : isNumeric ? 'Log a value' : entry.habit.type === 'NEGATIVE' ? 'Mark avoided' : 'Mark complete'}
    >
      <Ring percent={fillPercent} size={44} stroke={4} color={accent} />
      <span className="absolute flex items-center justify-center">
        {done ? (
          <Check className="size-4" style={{ color: accent }} />
        ) : (
          <span className="size-2 rounded-full bg-muted-foreground/40" />
        )}
      </span>
    </button>
  );
}

function HabitRow({ entry }: { entry: TodayHabitEntry & { currentStreak: number } }) {
  const done = isDone(entry);
  const accent = categoryAccent(entry.habit.category);
  const [steppingOpen, setSteppingOpen] = useState(false);
  const isNumeric = entry.habit.type === 'COUNT' || entry.habit.type === 'DURATION';
  const target = entry.habit.targetValue;
  const value = entry.todayLog?.value;

  return (
    <div
      className={cn(
        'group flex items-center gap-3 rounded-2xl border px-3 py-3 transition-all sm:px-4',
        done ? 'border-transparent bg-card' : 'border-border bg-card hover:border-foreground/15',
      )}
      style={done ? { boxShadow: `inset 3px 0 0 0 ${accent}` } : { boxShadow: `inset 3px 0 0 0 ${accent}66` }}
    >
      {isNumeric && steppingOpen ? (
        <Stepper entry={entry} accent={accent} onClose={() => setSteppingOpen(false)} />
      ) : (
        <HabitDial entry={entry} accent={accent} onOpenStepper={() => setSteppingOpen(true)} />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <Link
            to={`/habits/${entry.habit.id}`}
            className={cn('truncate text-sm font-semibold hover:underline', done && 'text-muted-foreground')}
          >
            {entry.habit.icon && <span className="mr-1">{entry.habit.icon}</span>}
            {entry.habit.name}
          </Link>
          <span className="text-[10px] font-medium tracking-wide uppercase" style={{ color: accent }}>
            {entry.habit.category ?? 'General'}
          </span>
          {isNumeric && value != null && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {value}
              {target ? `/${target}` : ''} {entry.habit.targetUnit ?? ''}
            </span>
          )}
        </div>
        {entry.habit.why && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground italic">{entry.habit.why}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        <DifficultyRating difficulty={entry.habit.difficulty} />
        {entry.currentStreak > 0 && (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
            style={{ backgroundColor: `${accent}1f`, color: accent }}
          >
            <Flame className="size-3.5" />
            {entry.currentStreak}
          </span>
        )}
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
      <div className="relative overflow-hidden rounded-2xl border bg-card px-6 py-8 sm:px-10">
        <div
          className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full blur-3xl"
          style={{ background: 'oklch(0.75 0.17 149 / 12%)' }}
        />
        <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="text-sm text-muted-foreground">
              {hourGreeting()} - {today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              {isLoading ? 'Today' : total === 0 ? 'Nothing due today' : donePercent === 100 ? "You're done!" : 'Close your ring'}
            </h1>
            {!isLoading && total > 0 && (
              <p className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-muted-foreground sm:justify-start">
                {donePercent === 100 ? (
                  <span className="inline-flex items-center gap-1 font-medium text-primary">
                    <Sparkles className="size-4" /> All {total} habits done. Nice work.
                  </span>
                ) : (
                  <span>
                    <span className="font-semibold text-foreground">{doneCount}</span> of {total} done -{' '}
                    {total - doneCount} to go
                  </span>
                )}
                {bestStreak > 0 && (
                  <span className="inline-flex items-center gap-1 text-amber-500">
                    <Flame className="size-4" /> {bestStreak}-day streak going
                  </span>
                )}
              </p>
            )}
          </div>

          {!isLoading && total > 0 && (
            <div className="relative flex shrink-0 items-center justify-center">
              <Ring
                percent={donePercent}
                size={128}
                stroke={10}
                color={donePercent >= 100 ? 'oklch(0.75 0.17 149)' : 'var(--primary)'}
              />
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-bold tabular-nums">{donePercent}%</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {doneCount}/{total}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
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
        <div className="mt-6 flex flex-col gap-3">
          {withStreaks.map((entry) => (
            <HabitRow key={entry.habit.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
