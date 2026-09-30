import { format, isToday, isTomorrow } from 'date-fns';
import { Briefcase, Calendar, Check, ListChecks, ListTodo, Sparkles, StickyNote, Wallet, Zap, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

import { cn } from '@/lib/utils';

import { XpPop } from './hud';
import type { Quest } from './player-model';
import { TIER } from './player-theme';

const MODULE_ICON: Record<string, LucideIcon> = {
  tasks: ListTodo,
  'habit-tracker': ListChecks,
  finance: Wallet,
  calendar: Calendar,
  notes: StickyNote,
  'job-tracker': Briefcase,
  automation: Zap,
};

/** Where a quest that can't be finished in place should send you. */
const MODULE_PATH: Record<string, string> = {
  tasks: '/tasks',
  'habit-tracker': '/habits',
  finance: '/finance',
  calendar: '/calendar',
  notes: '/notes',
  'job-tracker': '/jobs',
  automation: '/settings',
};

function due(dueAt: string): string {
  const date = new Date(dueAt);
  if (isToday(date)) return format(date, 'p');
  if (isTomorrow(date)) return `Tomorrow ${format(date, 'p')}`;
  return format(date, 'MMM d');
}

export function QuestCard({
  quest,
  onComplete,
  pending,
  cleared,
  compact,
}: {
  quest: Quest;
  onComplete?: (quest: Quest) => void;
  pending?: boolean;
  /** Just finished: shows the reward rising and the card fading out. */
  cleared?: boolean;
  compact?: boolean;
}) {
  const { item, tier, xp, completable } = quest;
  const Icon = MODULE_ICON[item.module] ?? Sparkles;
  const accent = TIER[tier].accent;
  const path = MODULE_PATH[item.module];

  return (
    <div
      className={cn(
        'group relative flex items-center gap-3 border bg-card/60 transition-all duration-500',
        compact ? 'px-3 py-2' : 'px-3.5 py-3',
        cleared ? 'scale-[0.98] opacity-40' : 'hover:bg-card',
      )}
      style={{ borderLeft: `3px solid ${accent}`, borderColor: `color-mix(in oklab, ${accent} 22%, var(--border))`, borderLeftColor: accent }}
    >
      {completable && onComplete ? (
        <button
          type="button"
          aria-label={`Complete ${item.title}`}
          disabled={pending || cleared}
          onClick={() => onComplete(quest)}
          className={cn(
            'grid size-6 shrink-0 place-items-center border transition-all',
            cleared ? 'border-primary bg-primary text-primary-foreground' : 'border-foreground/30 hover:border-primary hover:bg-primary/15 hover:shadow-[0_0_10px_var(--primary)]',
            pending && 'animate-hud-pulse',
          )}
        >
          {cleared && <Check className="size-4" strokeWidth={3} />}
        </button>
      ) : (
        <Icon className="size-5 shrink-0" style={{ color: accent }} />
      )}

      <div className="min-w-0 flex-1">
        <div className={cn('truncate text-sm font-medium', cleared && 'line-through')}>{item.title}</div>
        {!compact && (item.description || item.dueAt) && (
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            {item.dueAt && <span className="shrink-0 tabular-nums">{due(item.dueAt)}</span>}
            {item.description && <span className="truncate">{item.description}</span>}
          </div>
        )}
      </div>

      {!completable && path && (
        <Link to={path} className="hud-label shrink-0 text-muted-foreground hover:text-primary">
          open
        </Link>
      )}
      <span className="shrink-0 border border-hud-gold/40 bg-hud-gold/10 px-1.5 py-0.5 font-display text-[11px] font-bold text-hud-gold tabular-nums">
        +{xp}
      </span>
      {cleared && <XpPop amount={xp} className="top-0 right-3" />}
    </div>
  );
}
