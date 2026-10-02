import { useEffect, useState, type ReactNode } from 'react';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const QUERY = '(max-width: 1023px)';

/** True below the lg breakpoint (phones and tablets), where a side drawer would cover too much. */
export function useCompactScreen(): boolean {
  const [compact, setCompact] = useState(() => (typeof window === 'undefined' ? false : window.matchMedia(QUERY).matches));
  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = () => setCompact(mql.matches);
    mql.addEventListener('change', onChange);
    onChange();
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return compact;
}

/**
 * A panel that is a drawer on the right of a large screen and a centred modal on medium and small
 * ones. Same content either way: a header (optional lead line above the title), a scrolling body and
 * a footer.
 */
export function AdaptivePanel({
  open,
  onOpenChange,
  title,
  description,
  lead,
  children,
  footer,
  width = 'md',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  /** Shown above the title, e.g. record position and previous / next. */
  lead?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: 'md' | 'lg';
}) {
  const compact = useCompactScreen();
  const sheetWidth = width === 'lg' ? 'sm:max-w-lg' : 'sm:max-w-md';

  if (compact) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[85vh] w-[calc(100%-1.5rem)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="gap-1 border-b p-4 pr-12 text-left">
            {lead}
            <DialogTitle className="text-lg leading-snug break-words">{title}</DialogTitle>
            <DialogDescription className={description ? 'text-sm' : 'sr-only'}>{description ?? 'Details'}</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
          {footer && <div className="border-t p-3">{footer}</div>}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={`w-full gap-0 ${sheetWidth}`}>
        <SheetHeader className="border-b pr-12">
          {lead}
          <SheetTitle className="text-lg leading-snug break-words">{title}</SheetTitle>
          <SheetDescription className={description ? undefined : 'sr-only'}>{description ?? 'Details'}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="border-t p-3">{footer}</div>}
      </SheetContent>
    </Sheet>
  );
}
