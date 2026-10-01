import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** A settings card: icon, title and a one-line description, then the content. */
export function SettingsSection({
  id,
  icon: Icon,
  title,
  description,
  tone = 'default',
  action,
  children,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  tone?: 'default' | 'danger';
  action?: ReactNode;
  children?: ReactNode;
}) {
  const danger = tone === 'danger';
  return (
    <section
      id={id}
      className={cn('scroll-mt-6 p-5', danger ? 'rounded-lg border border-destructive/40 bg-destructive/[0.03]' : 'hud-panel')}
    >
      <header className="flex items-start gap-3.5">
        <span
          className={cn(
            'grid size-10 shrink-0 place-items-center rounded-md border',
            danger ? 'border-destructive/40 bg-destructive/10 text-destructive' : 'border-primary/30 bg-primary/10 text-primary',
          )}
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className={cn('font-display text-base font-semibold tracking-wide', danger && 'text-destructive')}>{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
        {action}
      </header>
      {children && <div className="mt-5 border-t pt-5">{children}</div>}
    </section>
  );
}

/** One labelled setting: what it is on the left, the control on the right. */
export function SettingRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-1">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function SoonBadge() {
  return (
    <span className="rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
      Coming soon
    </span>
  );
}
