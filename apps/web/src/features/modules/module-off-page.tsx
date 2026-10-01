import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { APP_MODULES } from '@/config/app-modules';
import { coreApi } from '@/features/core/core-api';

/** Shown instead of a module's pages while it is switched off - with a one-click way back on. */
export function ModuleOffPage({ code }: { code: string }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const module = APP_MODULES.find((m) => m.code === code);

  async function turnOn() {
    setBusy(true);
    try {
      await coreApi.setModuleEnabled(code, true);
      await queryClient.invalidateQueries({ queryKey: ['core', 'modules'] });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-md text-center">
      <h1 className="font-display text-2xl font-semibold">{module?.name ?? 'This module'} is switched off</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        It is hidden from the sidebar and Home. Your data is untouched - turn it back on whenever you like.
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <Button onClick={() => void turnOn()} disabled={busy}>{busy ? 'Turning on…' : `Turn on ${module?.name ?? 'module'}`}</Button>
        <Button asChild variant="outline"><Link to="/settings#modules">Manage modules</Link></Button>
      </div>
    </div>
  );
}
