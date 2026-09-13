import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** Small `# section-name` style heading used throughout for a terminal feel. */
export function SectionHeading({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase', className)}>
      <span className="text-primary">#</span>
      {children}
    </div>
  );
}
