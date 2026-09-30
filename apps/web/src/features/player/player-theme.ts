import type { Quest, QuestTier, RankLetter } from './player-model';

/** Each rank owns a colour, so a glance at any badge tells you where someone stands. */
export const RANK_COLOR: Record<RankLetter, string> = {
  E: 'var(--muted-foreground)',
  D: 'var(--primary)',
  C: 'var(--hud-cyan)',
  B: 'var(--hud-violet)',
  A: 'var(--hud-gold)',
  S: 'var(--hud-magenta)',
};

export const TIER: Record<QuestTier, { label: string; hint: string; accent: string }> = {
  main: { label: 'Main quests', hint: 'Do these first - they hurt if ignored', accent: 'var(--hud-magenta)' },
  daily: { label: 'Daily quests', hint: "Today's routine", accent: 'var(--hud-cyan)' },
  side: { label: 'Side quests', hint: 'Coming up', accent: 'var(--hud-violet)' },
};

export const questKey = (q: Quest) => `${q.item.module}:${q.item.type}:${q.item.entityId ?? q.item.title}`;
