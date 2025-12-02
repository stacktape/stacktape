import { useRouter } from 'next/router';
import { useState } from 'react';
import { ContentTreeGroup } from './ContentTreeGroup';
import { getNavigationTree } from './navigation-data';

const getInitialExpandedNavItems = (treeData, pathname: string) => {
  const res = {};
  for (const group of treeData) {
    for (const child of group.children) {
      res[child.url] =
        pathname === child.url ||
        pathname === `${child.url}/` ||
        child.children.some((nestedChild) => nestedChild.url === pathname || `${nestedChild.url}/` === pathname);
    }
  }
  return res;
};

export function ContentTree({ allDocPages }: { allDocPages: MdxPageDataForNavigation[] }) {
  const [navigationTree] = useState(() => getNavigationTree(allDocPages || []));
  const router = useRouter();
  const [expandedNavItems, setExpandedNavItems] = useState(() =>
    getInitialExpandedNavItems(navigationTree, router.asPath)
  );

  return (
    <div css={{ width: '100%' }}>
      {(navigationTree as unknown as any[]).map((groupData, idx) => {
        return (
          <ContentTreeGroup
            expandedNavItems={expandedNavItems}
            setExpandedNavItems={setExpandedNavItems}
            key={idx}
            {...groupData}
          />
        );
      })}
    </div>
  );
}
