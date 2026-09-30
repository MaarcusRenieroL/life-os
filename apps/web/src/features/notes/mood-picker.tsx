import { Angry, BatteryFull, BatteryLow, BatteryMedium, Frown, Laugh, Meh, Smile, Zap } from 'lucide-react';

import { cn } from '@/lib/utils';

import { ENERGY_LABELS, MOOD_LABELS } from './journal-types';

export const MOOD_ICONS = [Angry, Frown, Meh, Smile, Laugh];
export const ENERGY_ICONS = [BatteryLow, BatteryLow, BatteryMedium, BatteryFull, Zap];

/** The scale colours run cool-to-warm-to-green so a glance at a list of entries reads as a mood
 * curve; they're the same classes the goal status badges use. */
const SCALE_COLORS = [
  'text-red-500 dark:text-red-400',
  'text-orange-500 dark:text-orange-400',
  'text-amber-500 dark:text-amber-400',
  'text-lime-600 dark:text-lime-400',
  'text-emerald-600 dark:text-emerald-400',
];

/** Read-only icon for a 1-5 rating (mood or energy), or nothing when unrated. */
export function RatingIcon({ kind, value, className }: { kind: 'mood' | 'energy'; value: number | null; className?: string }) {
  if (value == null) return null;
  const icons = kind === 'mood' ? MOOD_ICONS : ENERGY_ICONS;
  const labels = kind === 'mood' ? MOOD_LABELS : ENERGY_LABELS;
  const Icon = icons[value - 1];
  return (
    <span title={`${kind === 'mood' ? 'Mood' : 'Energy'}: ${labels[value]}`} className="inline-flex">
      <Icon className={cn('size-4', SCALE_COLORS[value - 1], className)} aria-label={`${kind} ${labels[value]}`} />
    </span>
  );
}

/** Five-step picker; clicking the selected step clears it, since both are optional. */
export function RatingPicker({
  kind,
  value,
  onChange,
}: {
  kind: 'mood' | 'energy';
  value: number | null;
  onChange: (next: number | null) => void;
}) {
  const icons = kind === 'mood' ? MOOD_ICONS : ENERGY_ICONS;
  const labels = kind === 'mood' ? MOOD_LABELS : ENERGY_LABELS;

  return (
    <div className="flex gap-1.5" role="radiogroup" aria-label={kind === 'mood' ? 'Mood' : 'Energy'}>
      {icons.map((Icon, index) => {
        const step = index + 1;
        const selected = value === step;
        return (
          <button
            key={step}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={labels[step]}
            title={labels[step]}
            onClick={() => onChange(selected ? null : step)}
            className={cn(
              'flex size-10 items-center justify-center rounded-md border transition-colors hover:bg-muted',
              selected ? 'border-primary bg-primary/10' : 'border-border',
            )}
          >
            <Icon className={cn('size-5', selected ? SCALE_COLORS[index] : 'text-muted-foreground')} />
          </button>
        );
      })}
      {value != null && <span className="self-center pl-1 text-xs text-muted-foreground">{labels[value]}</span>}
    </div>
  );
}
