import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** Small `# section-name` style heading used throughout for a terminal feel. */
export function SectionHeading({
  children,
  className,
  tone = 'muted',
}: {
  children: ReactNode;
  className?: string;
  tone?: 'muted' | 'destructive';
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 text-xs font-semibold tracking-widest uppercase',
        tone === 'destructive' ? 'text-destructive' : 'text-muted-foreground',
        className,
      )}
    >
      <span className={tone === 'destructive' ? 'text-destructive' : 'text-primary'}>#</span>
      {children}
    </div>
  );
}
