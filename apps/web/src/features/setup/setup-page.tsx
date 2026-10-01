import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { APP_MODULES } from '@/config/app-modules';
import { coreApi } from '@/features/core/core-api';
import { useModules } from '@/features/modules/use-modules';

import { ModuleSetupChecklist } from './module-setup-checklist';
import { MODULE_SETUP, SETUP_MODULE_CODES } from './module-setup';
import { CORE_KEY, useSetupState } from './setup-state';

/**
 * First login, and "Run setup" from Settings: choose which modules to use, then walk through each
 * one's checklist. Everything here is optional and can be changed later in Settings -> Modules.
 */
export function SetupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { modules, isEnabled } = useModules();
  const setup = useSetupState();
  const [step, setStep] = useState<'pick' | 'setup'>('pick');
  const [busy, setBusy] = useState<string | null>(null);

  const choosable = modules.filter((m) => SETUP_MODULE_CODES.includes(m.code) || m.code === 'AN');
  const enabledWithSetup = SETUP_MODULE_CODES.filter((code) => isEnabled(code));

  async function toggle(code: string, enabled: boolean) {
    setBusy(code);
    try {
      await coreApi.setModuleEnabled(code, enabled);
      await queryClient.invalidateQueries({ queryKey: ['core', 'modules'] });
    } finally {
      setBusy(null);
    }
  }

  async function finish() {
    await setup.set(CORE_KEY, 'done');
    navigate('/home', { replace: true });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl font-semibold tracking-wide">Welcome to Life OS</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {step === 'pick'
          ? 'Switch on the parts of your life you want to run from here. You can change this any time in Settings.'
          : 'Each module you chose has a short checklist. Do what you like now - the rest can wait, and everything ticks itself off as you go.'}
      </p>

      {step === 'pick' ? (
        <>
          <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
            {choosable.map((m) => (
              <div key={m.code} className="flex items-start justify-between gap-3 rounded-lg border p-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{MODULE_SETUP[m.code]?.blurb ?? 'Fills itself from your other modules.'}</p>
                </div>
                <Switch checked={m.enabled} disabled={busy === m.code} onCheckedChange={(checked) => void toggle(m.code, checked)} aria-label={`Use ${m.name}`} />
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between">
            <Button variant="ghost" onClick={() => void finish()}>Skip setup</Button>
            <Button onClick={() => setStep('setup')}>Continue</Button>
          </div>
        </>
      ) : (
        <>
          <div className="mt-6 flex flex-col gap-4">
            {enabledWithSetup.length === 0 && <p className="text-sm text-muted-foreground">No modules need setting up. You are all set.</p>}
            {enabledWithSetup.map((code) => (
              <ModuleSetupChecklist key={code} code={code} compact />
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between">
            <Button variant="outline" onClick={() => setStep('pick')}>Back</Button>
            <Button onClick={() => void finish()}>Go to Life OS</Button>
          </div>
        </>
      )}
    </div>
  );
}

/** One module's checklist on its own page - where "Set up" in Settings and the banner lead. */
export function ModuleSetupPage() {
  const { code = '' } = useParams<{ code: string }>();
  const module = APP_MODULES.find((m) => m.code === code);

  if (!module || !MODULE_SETUP[code]) {
    return (
      <div className="mx-auto mt-16 max-w-md text-center text-sm text-muted-foreground">
        That module has nothing to set up. <Link to="/settings#modules" className="text-primary hover:underline">Back to Settings</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/settings#modules" className="text-sm text-muted-foreground hover:underline">← Settings</Link>
      <h1 className="mt-3 mb-5 font-display text-2xl font-semibold tracking-wide">Set up {module.name}</h1>
      <ModuleSetupChecklist code={code} />
      <div className="mt-4">
        <Button asChild variant="outline"><Link to={module.path ?? '/home'}>Open {module.name}</Link></Button>
      </div>
    </div>
  );
}
