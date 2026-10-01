import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { coreApi } from '@/features/core/core-api';

export type SetupStatus = 'done' | 'skipped';

/** Where setup progress is stored: core's per-user settings, under the "onboarding" module. */
const MODULE = 'onboarding';
/** The key for Life OS as a whole (the first-login flow) - module codes are two letters, so no clash. */
export const CORE_KEY = 'core';

/**
 * Which modules the user has finished or skipped setting up. Whether the *steps* are done is read
 * from real data (see module-setup.tsx); this only remembers "I'm done with it" / "not now", so a
 * module never nags again after either.
 */
export function useSetupState() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['core', 'settings', MODULE],
    queryFn: () => coreApi.getSettingsForModule(MODULE),
    staleTime: 5 * 60_000,
  });

  const states = new Map<string, SetupStatus>();
  for (const setting of query.data ?? []) {
    if (setting.value === 'done' || setting.value === 'skipped') states.set(setting.key, setting.value);
  }

  const mutation = useMutation({
    mutationFn: async ({ code, status }: { code: string; status: SetupStatus | null }) => {
      if (status === null) await coreApi.deleteSetting(MODULE, code);
      else await coreApi.setSetting(MODULE, code, status);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['core', 'settings', MODULE] }),
  });

  return {
    loading: query.isLoading,
    statusOf: (code: string): SetupStatus | undefined => states.get(code),
    set: (code: string, status: SetupStatus | null) => mutation.mutateAsync({ code, status }),
  };
}
