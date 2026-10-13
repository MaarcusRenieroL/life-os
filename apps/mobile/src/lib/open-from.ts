import { notificationTarget, type NotificationTarget } from '@life-os/core';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';

/** What a screen is asked to show when a notification (or link) sends you to it. */
export interface OpenRequest {
  tab?: string;
  kind?: string;
  id?: string;
}

const PATH: Record<NotificationTarget['screen'], string> = {
  home: '/',
  tasks: '/tasks',
  habits: '/habits',
  goals: '/goals',
  calendar: '/calendar',
  notes: '/notes',
  vault: '/vault',
  workouts: '/workouts',
  jobs: '/jobs',
  finance: '/finance',
  analytics: '/analytics',
  email: '/email',
  settings: '/settings',
};

/** Goes to the module a notification is about, handing it the tab and item to open. */
export function useOpenNotification() {
  const router = useRouter();
  return useCallback(
    (n: { module: string; type: string; metadata?: Record<string, string> | null }) => {
      const { screen, tab, entity } = notificationTarget(n);
      // `n` changes every time so asking for the same item twice still counts as a new request.
      router.navigate({ pathname: PATH[screen], params: { tab, kind: entity?.kind, id: entity?.id, n: String(Date.now()) } } as unknown as Href);
    },
    [router],
  );
}

/** Runs `onOpen` once for each request a notification makes of this screen. */
export function useOpenRequest(onOpen: (request: OpenRequest) => void) {
  const params = useLocalSearchParams<{ tab?: string; kind?: string; id?: string; n?: string }>();
  const handler = useRef(onOpen);
  useEffect(() => {
    handler.current = onOpen;
  });
  const seen = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!params.n || params.n === seen.current) return;
    seen.current = params.n;
    handler.current({ tab: params.tab, kind: params.kind, id: params.id });
  }, [params.n, params.tab, params.kind, params.id]);
}

/** A request's tab, if it is one of the screen's tabs. */
export const tabFrom = <T extends string>(request: OpenRequest, tabs: readonly { id: T }[]): T | undefined => tabs.find((t) => t.id === request.tab)?.id;
