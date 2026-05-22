import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef } from 'react';
import { ContentTreeGroup } from './ContentTreeGroup';
import { createExpansionStore, ExpansionStoreContext } from './expansion-store';
import { getNavigationTree } from './navigation-data';

export function ContentTree({ allDocPages }: { allDocPages: MdxPageDataForNavigation[] }) {
  const navigationTree = useMemo(() => getNavigationTree(allDocPages || []), [allDocPages]);
  const router = useRouter();
  const pathname = router.asPath || '/';

  // The store is created exactly once per ContentTree mount. Subsequent prop changes (route,
  // tree shape) are pushed in via setters — they trigger a recompute and notify subscribers,
  // but the store reference itself stays stable so context consumers don't churn.
  const storeRef = useRef<ReturnType<typeof createExpansionStore> | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createExpansionStore({ groups: navigationTree, pathname });
  }
  const store = storeRef.current;

  useEffect(() => {
    store.setGroups(navigationTree);
  }, [store, navigationTree]);

  useEffect(() => {
    store.setPathname(pathname);
  }, [store, pathname]);

  // Hydrate user overrides from localStorage once on mount. SSR sees empty; client picks up real
  // values right after hydration.
  useEffect(() => {
    store.__hydrateOverrides();
  }, [store]);

  return (
    <ExpansionStoreContext.Provider value={store}>
      <div css={{ width: '100%' }}>
        {navigationTree.map((group) => (
          <ContentTreeGroup key={group.id} group={group} />
        ))}
      </div>
    </ExpansionStoreContext.Provider>
  );
}
