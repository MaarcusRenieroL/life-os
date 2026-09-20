import { cn } from 'cn';

/** The "nothing here yet" message shown in place of a list/chart/table - was copy-pasted as a
 * bare `<p className="text-sm text-muted-foreground">...</p>` in ~20 places across the app. */
export function EmptyState({ message, className }: { message: string; className?: string }) {
  return <p className={cn('text-sm text-muted-foreground', className)}>{message}</p>;
}
