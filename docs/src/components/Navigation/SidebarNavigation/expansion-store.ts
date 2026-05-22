import { createContext, useContext, useSyncExternalStore } from 'react';
import config from '../../../../config';
import { computeExpandedState, NAV_STATE_STORAGE_KEY, type NavGroup, type NavUserOverrides } from './navigation-data';

const normalizePath = (p: string) => (p.split('?')[0].replace(/\/$/, '') || '/');

// Per-key subscriber store for sidebar expansion state. Lets each ContentTreeNode subscribe to
// only its own boolean — toggling one section re-renders just that section instead of the whole
// tree. Without this, every toggle changed the `expandedItems` map reference and bubbled a
// re-render through ~150 nav nodes (and Emotion re-serialized their css each time).

export type ExpansionStore = {
  toggle: (key: string) => void;
  isExpanded: (key: string) => boolean;
  isActiveUrl: (url: string | null) => boolean;
  getMap: () => Record<string, boolean>;
  subscribe: (listener: () => void) => () => void;
  setGroups: (groups: NavGroup[]) => void;
  setPathname: (pathname: string) => void;
};

const readPersistedOverrides = (): NavUserOverrides => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(NAV_STATE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as NavUserOverrides;
    }
  } catch {
    /* corrupt or unavailable storage — fall through */
  }
  return {};
};

const persistOverrides = (overrides: NavUserOverrides) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(NAV_STATE_STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    /* quota / sandbox — ignore */
  }
};

export type ExpansionStoreInternal = ExpansionStore & { __hydrateOverrides: () => void };

export const createExpansionStore = (initial: { groups: NavGroup[]; pathname: string }): ExpansionStoreInternal => {
  let groups = initial.groups;
  let pathname = initial.pathname;
  let normalizedPathname = normalizePath(pathname);
  let userOverrides: NavUserOverrides = {};
  let map: Record<string, boolean> = computeExpandedState({ groups, pathname, userOverrides });
  const listeners = new Set<() => void>();
  const pathPrefix = config.metadata.pathPrefix || '';

  const recompute = () => {
    map = computeExpandedState({ groups, pathname, userOverrides });
    listeners.forEach((l) => l());
  };

  const store: ExpansionStoreInternal = {
    toggle(key) {
      const currentlyExpanded = map[key] ?? false;
      userOverrides = { ...userOverrides, [key]: !currentlyExpanded };
      persistOverrides(userOverrides);
      recompute();
    },
    isExpanded(key) {
      return map[key] ?? false;
    },
    isActiveUrl(url) {
      if (url === null) return false;
      const normalizedUrl = url.replace(/\/$/, '') || '/';
      return normalizedPathname === normalizedUrl || normalizedPathname === pathPrefix + normalizedUrl;
    },
    getMap() {
      return map;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setGroups(g) {
      if (g === groups) return;
      groups = g;
      recompute();
    },
    setPathname(p) {
      if (p === pathname) return;
      pathname = p;
      normalizedPathname = normalizePath(p);
      recompute();
    },
    __hydrateOverrides() {
      userOverrides = readPersistedOverrides();
      recompute();
    }
  };
  return store;
};

export const ExpansionStoreContext = createContext<ExpansionStore | null>(null);

const useStore = (): ExpansionStore => {
  const store = useContext(ExpansionStoreContext);
  if (!store) throw new Error('ExpansionStoreContext not provided');
  return store;
};

// getServerSnapshot returns the same deterministic value as the client's first getSnapshot —
// the store's initial map is computed from pathname + groups + an empty overrides map, and the
// server has access to all of those, so SSR HTML matches the client's first paint. Real
// localStorage-backed overrides hydrate in a useEffect after mount, triggering a re-render.

export const useIsExpanded = (key: string): boolean => {
  const store = useStore();
  return useSyncExternalStore(
    store.subscribe,
    () => store.isExpanded(key),
    () => store.isExpanded(key)
  );
};

export const useExpandedMap = (): Record<string, boolean> => {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, store.getMap, store.getMap);
};

export const useIsActiveUrl = (url: string | null): boolean => {
  const store = useStore();
  return useSyncExternalStore(
    store.subscribe,
    () => store.isActiveUrl(url),
    () => store.isActiveUrl(url)
  );
};

export const useExpansionToggle = (): ExpansionStore['toggle'] => {
  return useStore().toggle;
};
