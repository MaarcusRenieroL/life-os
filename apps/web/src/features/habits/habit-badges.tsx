import { Flame, Star, Trophy } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Streak milestones are derived on the fly from the streak data the backend already returns
 * (currentStreak / longestStreak) - there is no badges table and nothing is awarded or stored.
 * Thresholds mirror HabitNotificationService.MILESTONES on the backend.
 */
export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 365] as const;

export type StreakMilestone = (typeof STREAK_MILESTONES)[number];

const MILESTONE_LABELS: Record<StreakMilestone, string> = {
  3: 'Getting started',
  7: 'One week',
  14: 'Two weeks',
  30: 'One month',
  60: 'Two months',
  100: 'Century',
  365: 'One year',
};

/** The highest threshold a streak of `days` has reached, or null below the first one. */
export function milestoneFor(days: number): StreakMilestone | null {
  let reached: StreakMilestone | null = null;
  for (const threshold of STREAK_MILESTONES) {
    if (days >= threshold) reached = threshold;
  }
  return reached;
}

/** Every threshold a streak of `days` has passed, for the "badges earned" list. */
export function milestonesEarned(days: number): StreakMilestone[] {
  return STREAK_MILESTONES.filter((threshold) => days >= threshold);
}

/** Days still to go before the next threshold, or null once the top one is passed. */
export function nextMilestone(days: number): { target: StreakMilestone; remaining: number } | null {
  const target = STREAK_MILESTONES.find((threshold) => days < threshold);
  return target ? { target, remaining: target - days } : null;
}

export function milestoneLabel(threshold: StreakMilestone): string {
  return MILESTONE_LABELS[threshold];
}

/** Colour ramps with the threshold so a 100-day badge reads differently from a 3-day one. */
function milestoneClasses(threshold: StreakMilestone): string {
  if (threshold >= 100) return 'border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-400';
  if (threshold >= 30) return 'border-violet-500/40 bg-violet-500/15 text-violet-700 dark:text-violet-400';
  if (threshold >= 7) return 'border-sky-500/40 bg-sky-500/15 text-sky-700 dark:text-sky-400';
  return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400';
}

interface StreakBadgeProps {
  /** The streak this badge describes, in days. */
  days: number;
  /** "current" shows a flame and the live day count, "best" shows a trophy and the record. */
  variant?: 'current' | 'best';
  className?: string;
}

/** Compact badge for habit cards and table rows. Renders nothing below the first threshold. */
export function StreakBadge({ days, variant = 'current', className }: StreakBadgeProps) {
  const threshold = milestoneFor(days);
  if (!threshold) return null;

  const Icon = variant === 'best' ? Trophy : Flame;
  return (
    <Badge
      variant="outline"
      className={cn('gap-1', milestoneClasses(threshold), className)}
      title={`${milestoneLabel(threshold)} - ${days} day${days === 1 ? '' : 's'}`}
    >
      <Icon className="size-3" />
      {days}
    </Badge>
  );
}

/** Every milestone a habit has earned, for the detail page. */
export function MilestoneBadges({ days, className }: { days: number; className?: string }) {
  const earned = milestonesEarned(days);
  if (earned.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {earned.map((threshold) => (
        <Badge key={threshold} variant="outline" className={cn('gap-1', milestoneClasses(threshold))}>
          <Flame className="size-3" />
          {milestoneLabel(threshold)}
        </Badge>
      ))}
    </div>
  );
}

/** 1-10 self-rated difficulty, drawn as a 5-star scale so it reads at a glance. */
export function DifficultyRating({ difficulty, className }: { difficulty: number | null; className?: string }) {
  if (difficulty == null) return null;

  const clamped = Math.max(1, Math.min(10, difficulty));
  const filledStars = Math.round(clamped / 2);

  return (
    <span
      className={cn('inline-flex items-center gap-0.5 align-middle', className)}
      title={`Difficulty ${clamped} of 10`}
      aria-label={`Difficulty ${clamped} of 10`}
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={cn(
            'size-3',
            index < filledStars ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground/40',
          )}
        />
      ))}
    </span>
  );
}
