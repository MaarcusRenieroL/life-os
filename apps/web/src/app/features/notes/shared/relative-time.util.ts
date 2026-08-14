// Matches the design handoff's copy style ("2h ago", "5d ago", "1w ago")
// instead of an absolute date - notes list/search cards are meant to read
// at a glance, not require parsing a calendar date.
//
// Also handles timestamps in the future (e.g. a trash entry's purge date,
// 30 days out) by flipping to "in Xd" instead of always collapsing to
// "just now" - a plain past-only diff would read every future date as if
// it were happening right now, which is actively misleading for a purge date.
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const diffSec = Math.round(Math.abs(diffMs) / 1000);

  if (diffSec < 60) return 'just now';

  const unit = magnitude(diffSec);
  return diffMs < 0 ? `in ${unit}` : `${unit} ago`;
}

function magnitude(diffSec: number): string {
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;

  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h`;

  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d`;

  const diffWeek = Math.round(diffDay / 7);
  if (diffWeek < 5) return `${diffWeek}w`;

  const diffMonth = Math.round(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth}mo`;

  const diffYear = Math.round(diffDay / 365);
  return `${diffYear}y`;
}
