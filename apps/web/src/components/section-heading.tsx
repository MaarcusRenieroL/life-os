import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** The section title used throughout: display type, a glowing marker, and a rule trailing off to the right. */
export function SectionHeading({
  children,
  className,
  tone = 'muted',
}: {
  children: ReactNode;
  className?: string;
  tone?: 'muted' | 'destructive';
}) {
  const destructive = tone === 'destructive';
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 font-display text-xs font-semibold tracking-[0.2em] uppercase',
        destructive ? 'text-destructive' : 'text-muted-foreground',
        className,
      )}
    >
      <span className={cn('h-3 w-1 shrink-0', destructive ? 'bg-destructive' : 'bg-primary shadow-[0_0_8px_var(--primary)]')} />
      {children}
      <span className="h-px min-w-4 flex-1 bg-gradient-to-r from-border to-transparent" />
    </div>
  );
}
