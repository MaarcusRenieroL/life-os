export interface FitView {
  score: number | null;
  strong: string[];
  partial: string[];
  missing: string[];
  redFlags: string[];
}

function list(explanation: Record<string, unknown> | null | undefined, key: string): string[] {
  const value = (explanation ?? {})[key];
  return Array.isArray(value) ? value.map((v) => String(v)) : [];
}

export function toFitView(
  score: number | null,
  explanation: Record<string, unknown> | null | undefined,
): FitView {
  return {
    score,
    strong: list(explanation, 'strongMatches'),
    partial: list(explanation, 'partialMatches'),
    missing: list(explanation, 'missingSkills'),
    redFlags: list(explanation, 'redFlags'),
  };
}
