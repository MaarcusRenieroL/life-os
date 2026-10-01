import type { FitView } from './fit-view';

export function FitBreakdown({ fit }: { fit: FitView }) {
  return (
    <>
      {fit.strong.length > 0 && (
        <p className="mt-2 text-sm">
          <span className="font-medium text-primary">Strong match:</span> {fit.strong.join(', ')}
        </p>
      )}
      {fit.partial.length > 0 && (
        <p className="mt-1 text-sm">
          <span className="font-medium text-muted-foreground">Partial:</span> {fit.partial.join(', ')}
        </p>
      )}
      {fit.missing.length > 0 && (
        <p className="mt-1 text-sm">
          <span className="font-medium text-destructive">Missing:</span> {fit.missing.join(', ')}
        </p>
      )}
      {fit.redFlags.length > 0 && (
        <p className="mt-1 text-sm text-muted-foreground">⚠ {fit.redFlags.join(' · ')}</p>
      )}
    </>
  );
}
