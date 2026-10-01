import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { APP_MODULES, type AppModuleConfig } from '@/config/app-modules';
import { moduleForPath } from '@/config/module-routes';
import { coreApi } from '@/features/core/core-api';
import { NAV_ITEMS, type NavItem } from '@/layout/nav-items';

/** Every module with the user's on/off choice applied (the registry's default where they made none). */
export function useModules() {
  const { data: overrides, isLoading } = useQuery({
    queryKey: ['core', 'modules'],
    queryFn: coreApi.getModuleSettings,
    staleTime: 5 * 60_000,
  });

  return useMemo(() => {
    const byCode = new Map((overrides ?? []).map((s) => [s.moduleCode, s.enabled]));
    const modules: AppModuleConfig[] = APP_MODULES.map((m) => (byCode.has(m.code) ? { ...m, enabled: byCode.get(m.code)! } : m));
    const enabled = new Map(modules.map((m) => [m.code, m.enabled]));
    return {
      modules,
      loading: isLoading,
      /** Unknown codes count as on, so a module added to the registry later is not hidden by accident. */
      isEnabled: (code: string) => enabled.get(code) ?? true,
    };
  }, [overrides, isLoading]);
}

/** The sidebar/Home entries for modules that are switched on; always-on pages are always listed. */
export function useVisibleNavItems(): NavItem[] {
  const { isEnabled, loading } = useModules();
  return useMemo(
    () =>
      NAV_ITEMS.filter((item) => {
        const code = moduleForPath(item.to);
        // While the setting loads show everything rather than flashing the sidebar shorter.
        return loading || !code || isEnabled(code);
      }),
    [isEnabled, loading],
  );
}
