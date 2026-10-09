import type { NotificationTarget } from '@life-os/core';
import { createContext, useContext, useEffect, useState } from 'react';

/** Where inside a module to land (a tab, a specific item); what a notification asks for. */
export type NavDetail = Pick<NotificationTarget, 'tab' | 'entity'>;
export interface NavIntent extends NavDetail {
  screen: string;
}

/** Lets a screen send you to another module (Home's portals, "quest board →" links, notifications). */
export const NavContext = createContext<(screen: string, detail?: NavDetail) => void>(() => {});
export const useNav = () => useContext(NavContext);

export const IntentContext = createContext<{ intent: NavIntent | null; clear: () => void }>({ intent: null, clear: () => {} });

/**
 * What the navigation that brought you to this screen asked for. It is read once when the screen opens,
 * then cleared, so a later refresh of the screen does not open the same item again.
 */
export function useNavIntent(screen: string): NavIntent | null {
  const ctx = useContext(IntentContext);
  const [taken] = useState(() => (ctx.intent?.screen === screen ? ctx.intent : null));
  useEffect(() => {
    if (taken) ctx.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return taken;
}

/** The intent's tab if it is one of this screen's tabs. */
export function intentTab<T extends string>(intent: NavIntent | null, tabs: readonly { id: T }[], fallback: T): T {
  const wanted = intent?.tab;
  return tabs.find((t) => t.id === wanted)?.id ?? fallback;
}
