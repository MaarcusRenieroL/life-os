/** "1 h 5 min" / "52 min" / "45 s" - session lengths are stored in seconds. */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return '—';
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** Trims trailing zeros: 62.5 -> "62.5", 60 -> "60". */
export function formatNumber(value: number, maxDecimals = 1): string {
  return Number(value.toFixed(maxDecimals)).toString();
}

export function formatWeight(kg: number | null | undefined): string {
  return kg == null ? '—' : `${formatNumber(kg, 2)} kg`;
}

/** Big totals read better in tonnes-ish shorthand: 12,400 kg -> "12.4k kg". */
export function formatVolume(kg: number): string {
  return kg >= 10000 ? `${formatNumber(kg / 1000)}k kg` : `${Math.round(kg).toLocaleString()} kg`;
}

/** Parses an input value into a number, or null for blank/invalid. */
export function parseNumber(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}
