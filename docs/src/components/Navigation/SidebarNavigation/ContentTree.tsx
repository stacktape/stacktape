import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ContentTreeGroup } from './ContentTreeGroup';
import {
  computeExpandedState,
  getNavigationTree,
  NAV_STATE_STORAGE_KEY,
  type NavUserOverrides
} from './navigation-data';

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
    // Corrupt or missing storage — fall through to empty overrides.
  }
  return {};
};

const persistOverrides = (overrides: NavUserOverrides) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(NAV_STATE_STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // Quota or sandbox issues — ignore; UI still works for the session.
  }
};

export function ContentTree({ allDocPages }: { allDocPages: MdxPageDataForNavigation[] }) {
  const navigationTree = useMemo(() => getNavigationTree(allDocPages || []), [allDocPages]);
  const router = useRouter();

  // User overrides hydrate from localStorage on mount. SSR returns {}; client takes over after.
  const [userOverrides, setUserOverrides] = useState<NavUserOverrides>({});

  useEffect(() => {
    setUserOverrides(readPersistedOverrides());
  }, []);

  // Final expanded state = defaults + active-branch auto-open + user overrides.
  // Recomputes when route changes so newly-active branches auto-open (unless the user has
  // explicitly closed them, in which case the override wins).
  const expandedItems = useMemo(
    () =>
      computeExpandedState({
        groups: navigationTree,
        pathname: router.asPath || '/',
        userOverrides
      }),
    [navigationTree, router.asPath, userOverrides]
  );

  const toggle = useCallback(
    (key: string) => {
      setUserOverrides((prev) => {
        // Read the current visible state, not the prev override — toggling reflects what the user sees.
        const currentlyExpanded =
          computeExpandedState({
            groups: navigationTree,
            pathname: router.asPath || '/',
            userOverrides: prev
          })[key] ?? false;
        const next = { ...prev, [key]: !currentlyExpanded };
        persistOverrides(next);
        return next;
      });
    },
    [navigationTree, router.asPath]
  );

  return (
    <div css={{ width: '100%' }}>
      {navigationTree.map((group) => (
        <ContentTreeGroup key={group.id} group={group} expandedItems={expandedItems} toggle={toggle} />
      ))}
    </div>
  );
}
