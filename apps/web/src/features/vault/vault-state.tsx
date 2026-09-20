import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

// Mirrors apps/web's vault-state.service.ts - a pure in-memory reactive flag,
// reset to false on every page reload (no persistence). "Unlocked" truth
// always lives server-side (GET /v1/vault/status); this just mirrors the
// latest known result for the current page to read reactively.
interface VaultStateValue {
  unlocked: boolean;
  setUnlocked: (value: boolean) => void;
}

const VaultStateContext = createContext<VaultStateValue | null>(null);

export function VaultStateProvider({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const value = useMemo(() => ({ unlocked, setUnlocked }), [unlocked, setUnlocked]);
  return <VaultStateContext.Provider value={value}>{children}</VaultStateContext.Provider>;
}

export function useVaultState(): VaultStateValue {
  const context = useContext(VaultStateContext);
  if (!context) {
    throw new Error('useVaultState must be used within a VaultStateProvider');
  }
  return context;
}
