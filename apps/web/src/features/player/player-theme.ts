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

/** Bronze, Silver, Gold, Platinum. Index with `tier - 1`. */
export const MEDAL_COLOR = ['oklch(0.68 0.11 55)', 'oklch(0.82 0.01 255)', 'oklch(0.83 0.16 88)', 'oklch(0.86 0.1 200)'] as const;

export function medalLabel(tier: number): string {
  return tier <= 0 ? 'Locked' : (['Bronze', 'Silver', 'Gold', 'Platinum'][tier - 1] ?? 'Platinum');
}
