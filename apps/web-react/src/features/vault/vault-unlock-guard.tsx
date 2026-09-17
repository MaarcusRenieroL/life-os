import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { vaultApi } from './vault-api';
import { useVaultState } from './vault-state';

/**
 * Mirrors apps/web's vault-unlock.guard.ts: unlock state is 100% server-side,
 * stateless on the client - every guarded navigation makes a fresh
 * GET /v1/vault/status call rather than trusting a locally cached flag.
 */
export function VaultUnlockGuard() {
  const { setUnlocked } = useVaultState();
  const [status, setStatus] = useState<'checking' | 'unlocked' | 'locked'>('checking');

  useEffect(() => {
    let cancelled = false;
    vaultApi
      .getStatus()
      .then((result) => {
        if (cancelled) return;
        setUnlocked(result.unlocked);
        setStatus(result.unlocked ? 'unlocked' : 'locked');
      })
      .catch(() => {
        if (!cancelled) setStatus('locked');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === 'checking') return null;
  if (status === 'locked') return <Navigate to="/vault" replace />;
  return <Outlet />;
}
