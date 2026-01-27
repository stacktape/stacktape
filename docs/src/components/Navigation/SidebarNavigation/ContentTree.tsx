import { useRouter } from 'next/router';
import { useState, useEffect, useMemo } from 'react';
import { ContentTreeGroup } from './ContentTreeGroup';
import { getNavigationTree } from './navigation-data';

const getExpandedNavItems = (treeData: any[], pathname: string) => {
  const res: Record<string, boolean> = {};
  // Normalize pathname by removing trailing slash
  const normalizedPath = pathname.replace(/\/$/, '') || '/';

  for (const group of treeData) {
    if (!group.children) continue;
    for (const child of group.children) {
      const childUrl = child.url;
      const isMatch =
        normalizedPath === childUrl ||
        (child.children && child.children.some((nestedChild: any) => normalizedPath === nestedChild.url));
      res[childUrl] = isMatch;
    }
  }
  return res;
};

export function ContentTree({ allDocPages }: { allDocPages: MdxPageDataForNavigation[] }) {
  // Use useMemo to ensure navigation tree is computed deterministically
  // and only recomputed when allDocPages changes
  const navigationTree = useMemo(() => {
    return getNavigationTree(allDocPages || []);
  }, [allDocPages]);

  const router = useRouter();

  // Use empty object for initial render to avoid hydration mismatch
  // router.asPath can differ between server/client (query params, hash, etc.)
  const [expandedNavItems, setExpandedNavItems] = useState<Record<string, boolean>>({});

  // Only update expanded items on client after hydration
  useEffect(() => {
    setExpandedNavItems(getExpandedNavItems(navigationTree, router.asPath));
  }, [navigationTree, router.asPath]);

  return (
    <div css={{ width: '100%' }}>
      {navigationTree.map((groupData, idx) => {
        return (
          <ContentTreeGroup
            expandedNavItems={expandedNavItems}
            setExpandedNavItems={setExpandedNavItems}
            key={groupData.id || idx}
            {...groupData}
          />
        );
      })}
    </div>
  );
}
