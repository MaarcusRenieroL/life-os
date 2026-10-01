import { derivePlayer } from '@life-os/core';
import { useMemo } from 'react';

import { useApi } from './session';
import { useAsync } from './use-async';

/** HUD state for the signed-in player. Modules that are down just contribute nothing. */
export function usePlayer() {
  const api = useApi();
  const trends = useAsync(() => api.trends(365), api);
  const dashboard = useAsync(() => api.dashboard(), api);
  const player = useMemo(() => derivePlayer(trends.data, dashboard.data), [trends.data, dashboard.data]);
  return {
    player,
    loading: trends.loading || dashboard.loading,
    reload: async () => {
      await Promise.all([trends.reload(), dashboard.reload()]);
    },
  };
}
