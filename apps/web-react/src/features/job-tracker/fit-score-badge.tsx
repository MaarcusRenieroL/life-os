import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/** Green for a strong fit, yellow for so-so, red for a poor one - consistent
 * everywhere a fit score shows up. */
export function FitScoreBadge({ score }: { score: number }) {
  const tone =
    score >= 70
      ? 'border-primary/40 bg-primary/15 text-primary'
      : score >= 40
        ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-500'
        : 'border-destructive/40 bg-destructive/10 text-destructive';

  return (
    <Badge variant="outline" className={cn('font-mono text-sm font-semibold tabular-nums', tone)}>
      {score}
      <span className="opacity-60">/100</span>
    </Badge>
  );
}
