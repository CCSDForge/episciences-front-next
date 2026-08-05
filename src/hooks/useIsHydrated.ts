'use client';

import { useSyncExternalStore } from 'react';

/** The hydration state never changes after the first client render, so nothing to subscribe to. */
const subscribe = (): (() => void) => () => {};
const getSnapshot = (): boolean => true;
const getServerSnapshot = (): boolean => false;

/**
 * Returns `false` during server rendering and the first hydration pass, `true` afterwards.
 *
 * Use this instead of the `useState(false)` + `useEffect(() => setMounted(true))` pattern:
 * it yields the same two-pass behaviour without the cascading re-render that
 * `react-hooks/set-state-in-effect` warns about.
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
