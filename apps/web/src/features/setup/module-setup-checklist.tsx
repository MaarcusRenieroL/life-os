import { Check, Circle } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { MODULE_SETUP } from './module-setup';
import { useSetupState } from './setup-state';

/** Progress for one module: how many required steps are done, and whether it is ready to use. */
export function useModuleProgress(code: string) {
  const def = MODULE_SETUP[code];
  const { steps, loading } = def.useSteps();
  const required = steps.filter((s) => !s.optional);
  const doneRequired = required.filter((s) => s.done).length;
  return { steps, loading, required: required.length, doneRequired, ready: doneRequired === required.length };
}

/**
 * The setup checklist for one module. Steps tick themselves from real data - doing the thing
 * anywhere counts - and each one links to where it is done.
 */
export function ModuleSetupChecklist({ code, compact }: { code: string; compact?: boolean }) {
  const def = MODULE_SETUP[code];
  const { steps, loading, required, doneRequired, ready } = useModuleProgress(code);
  const setup = useSetupState();
  const status = setup.statusOf(code);

  return (
    <section className="hud-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold tracking-wide">{def.title}</h2>
          {!compact && <p className="mt-0.5 text-sm text-muted-foreground">{def.blurb}</p>}
        </div>
        <span
          className={cn(
            'rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
            ready ? 'border-primary/40 bg-primary/10 text-primary' : 'text-muted-foreground',
          )}
        >
          {loading ? 'Checking…' : ready ? 'Ready' : `${doneRequired} of ${required} done`}
        </span>
      </div>

      <ul className="mt-4 flex flex-col divide-y">
        {steps.map((step) => (
          <li key={step.id} className="flex items-start gap-3 py-3">
            {step.done ? <Check className="mt-0.5 size-4 shrink-0 text-primary" /> : <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground/60" />}
            <div className="min-w-0 flex-1">
              <p className={cn('text-sm font-medium', step.done && 'text-muted-foreground line-through')}>
                {step.title}
                {step.optional && <span className="ml-2 text-[10px] font-normal tracking-wider text-muted-foreground uppercase">optional</span>}
              </p>
              <p className="text-xs text-muted-foreground">{step.detail}</p>
            </div>
            {!step.done && (
              <Button asChild size="sm" variant={step.optional ? 'outline' : 'default'}>
                <Link to={step.to}>{step.cta}</Link>
              </Button>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
        {status === 'done' ? (
          <span className="text-xs text-muted-foreground">Marked as set up.</span>
        ) : (
          <Button size="sm" variant={ready ? 'default' : 'outline'} onClick={() => void setup.set(code, 'done')}>
            {ready ? 'Mark as set up' : 'I’ll finish this later'}
          </Button>
        )}
        {status === 'skipped' && <span className="text-xs text-muted-foreground">Skipped for now.</span>}
        {status && (
          <button className="text-xs text-muted-foreground underline-offset-2 hover:underline" onClick={() => void setup.set(code, null)}>
            Reset
          </button>
        )}
      </div>
    </section>
  );
}
