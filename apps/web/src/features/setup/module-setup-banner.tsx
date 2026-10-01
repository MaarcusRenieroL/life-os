import { X } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';

import { useModuleProgress } from './module-setup-checklist';
import { MODULE_SETUP } from './module-setup';
import { useSetupState } from './setup-state';

/**
 * A gentle nudge at the top of a module whose required setup is unfinished. Never blocks the page:
 * dismissing it (or finishing the steps) means it does not come back.
 */
export function ModuleSetupBanner({ code }: { code: string }) {
  const def = MODULE_SETUP[code];
  const setup = useSetupState();
  const { loading, required, doneRequired, ready } = useModuleProgress(code);

  if (!def || setup.loading || loading || ready || setup.statusOf(code)) return null;

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
      <div className="min-w-0 text-sm">
        <p className="font-medium">Finish setting up {def.title} ({doneRequired} of {required})</p>
        <p className="text-xs text-muted-foreground">{def.blurb}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button asChild size="sm"><Link to={`/setup/${code}`}>Continue setup</Link></Button>
        <Button size="icon" variant="ghost" aria-label="Not now" onClick={() => void setup.set(code, 'skipped')}>
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
