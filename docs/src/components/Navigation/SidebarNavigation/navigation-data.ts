import config from '../../../../config';

/** localStorage key used to persist the user's explicit collapse/expand toggles. */
export const NAV_STATE_STORAGE_KEY = 'stacktape-docs-nav-state-v1';

/** Map of nav-key → user toggle. Only contains entries the user has explicitly clicked.
 *  Items without an entry fall back to default behavior (config defaultOpen + active branch). */
export type NavUserOverrides = Record<string, boolean>;

export type NavItem = {
  /**
   * The URL the node links to. Set for real pages; null for virtual intermediate nodes
   * (e.g. "Compute" inside Resources — there's no /resources/compute page, but the segment
   * groups its children visually).
   */
  url: string | null;
  /** Stable key used by the expand/collapse state map. Equals url for real pages, equals
   *  the synthetic path for virtual nodes. */
  key: string;
  title: string;
  /** Page order from frontmatter; virtual nodes inherit min(descendant.order). */
  order: number;
  children: NavItem[];
};

export type NavGroup = {
  id: string;
  title: string;
  icon: any;
  order: number;
  defaultOpen: boolean;
  children: NavItem[];
};

// Words that should keep their canonical casing in virtual subgroup labels (instead of being
// title-cased like "Cli" or "Aws"). Add as needed.
const acronyms = new Set(['cli', 'aws', 'api', 'sdk', 'mcp', 'cdn', 'cdk', 'sql', 'efs', 'sns', 'sqs', 'waf']);

const capitalizeSegment = (segment: string) =>
  segment
    .split('-')
    .map((word) => (acronyms.has(word.toLowerCase()) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ');

/**
 * Build a deep navigation tree from a flat list of pages.
 *
 * Algorithm:
 * 1. Group every page by its first path segment — this picks one of the configured sidebar groups.
 * 2. Within each group, walk every page's remaining segments and build a tree. Each segment that
 *    has no real page becomes a virtual node (no link, expandable, title derived from segment).
 * 3. Real pages are slotted into the tree at their full URL. If a real page lands on a path that
 *    a virtual node already occupies, the virtual node is "promoted" — gains the page's url + title.
 * 4. Sort siblings by order ASC, then title ASC. Virtual nodes carry min(descendant.order) so they
 *    sort sensibly relative to leaf siblings.
 */
export const getNavigationTree = (allDocPages: MdxPageDataForNavigation[]): NavGroup[] => {
  // Initialize groups from config
  const groupMap = new Map<string, NavGroup>();
  for (const g of config.sidebar.groups) {
    const id = g.path.replace(/^\//, '');
    groupMap.set(id, {
      id,
      title: g.title,
      icon: g.icon,
      order: g.order,
      defaultOpen: (g as any).defaultOpen ?? false,
      children: []
    });
  }

  // Catch-all for the root index page (and anything that fails to match a configured group).
  const rootGroup: NavGroup = {
    id: '__root',
    title: '',
    icon: null,
    order: -1,
    defaultOpen: true,
    children: []
  };

  // Map of "path key" → NavItem within each group's tree. Path key is the full URL for a real
  // page or a synthetic path like "/resources/compute" for a virtual node.
  const nodeMap = new Map<string, NavItem>();

  const ensureNode = ({
    pathKey,
    isLeaf,
    realUrl,
    title,
    order,
    parentChildren
  }: {
    pathKey: string;
    isLeaf: boolean;
    realUrl: string | null;
    title: string;
    order: number;
    parentChildren: NavItem[];
  }): NavItem => {
    const existing = nodeMap.get(pathKey);
    if (existing) {
      // Promote a virtual node into a real page if the real page just appeared.
      if (isLeaf && existing.url === null && realUrl) {
        existing.url = realUrl;
        existing.title = title;
        existing.order = order;
      } else if (!isLeaf && order < existing.order) {
        // Virtual nodes track the minimum order of their descendants for sensible sibling sort.
        existing.order = order;
      }
      return existing;
    }
    const node: NavItem = {
      url: realUrl,
      key: pathKey,
      title,
      order,
      children: []
    };
    nodeMap.set(pathKey, node);
    parentChildren.push(node);
    return node;
  };

  for (const page of allDocPages) {
    const url = page.url;
    if (url === '/') {
      const node: NavItem = { url: '/', key: '/', title: page.title, order: page.order ?? 999, children: [] };
      rootGroup.children.push(node);
      continue;
    }

    const segments = url.split('/').filter(Boolean);
    const groupId = segments[0];
    const group = groupMap.get(groupId) || rootGroup;

    // The first segment IS the group's path prefix — the group itself represents it. Walk only
    // segments[1..] to build the tree underneath. Pages whose URL is exactly the group root
    // (e.g. /configuration with no further segment) become the group's first child.
    let parentChildren = group.children;
    let pathSoFar = '/' + segments[0];
    if (segments.length === 1) {
      // Bare-group page (rare — e.g. would be /configuration as a real page).
      ensureNode({
        pathKey: pathSoFar,
        isLeaf: true,
        realUrl: url,
        title: page.title,
        order: page.order ?? 999,
        parentChildren
      });
      continue;
    }
    for (let i = 1; i < segments.length; i += 1) {
      pathSoFar += '/' + segments[i];
      const isLeaf = i === segments.length - 1;
      const node = ensureNode({
        pathKey: pathSoFar,
        isLeaf,
        realUrl: isLeaf ? url : null,
        title: isLeaf ? page.title : capitalizeSegment(segments[i]),
        order: page.order ?? 999,
        parentChildren
      });
      parentChildren = node.children;
    }
  }

  // Sort children recursively. Order is the primary key (lower first), title alphabetic is the
  // tie-breaker.
  const sortItems = (items: NavItem[]) => {
    items.sort((a, b) => {
      const orderDiff = a.order - b.order;
      if (orderDiff !== 0) return orderDiff;
      return a.title.localeCompare(b.title);
    });
    for (const item of items) {
      if (item.children.length > 0) {
        sortItems(item.children);
      }
    }
  };

  for (const group of groupMap.values()) {
    sortItems(group.children);
  }
  sortItems(rootGroup.children);

  // Final assembly: forced order first, then any unmatched groups.
  const result: NavGroup[] = [];
  if (rootGroup.children.length > 0) {
    result.push(rootGroup);
  }
  const orderedPaths = config.sidebar.forcedNavOrder;
  for (const path of orderedPaths) {
    const id = path.replace(/^\//, '');
    const group = groupMap.get(id);
    if (group && group.children.length > 0) {
      result.push(group);
    }
  }
  for (const group of groupMap.values()) {
    if (!result.includes(group) && group.children.length > 0) {
      result.push(group);
    }
  }

  return result;
};

/**
 * Compute the expansion state of every group/item.
 *
 * Three-layer rule:
 *   1. Defaults — group `defaultOpen` flags from config + the configured `defaultOpenPaths` for
 *      virtual subgroups + auto-open of any ancestor of the currently active page.
 *   2. User overrides — explicit toggles from the persisted store. These trump defaults so a user
 *      can collapse a section that's also the active branch (and have it stay collapsed across
 *      navigation).
 *   3. The merged result is what the renderer reads.
 */
export const computeExpandedState = ({
  groups,
  pathname,
  userOverrides
}: {
  groups: NavGroup[];
  pathname: string;
  userOverrides: NavUserOverrides;
}): Record<string, boolean> => {
  const expanded: Record<string, boolean> = {};
  const normalizedPath = pathname.split('?')[0].replace(/\/$/, '') || '/';
  const defaultOpenPaths = new Set(((config.sidebar as any).defaultOpenPaths || []) as string[]);

  const isActiveOrAncestor = (item: NavItem): boolean => {
    if (item.url !== null && normalizedPath === item.url) return true;
    return item.children.some((child) => isActiveOrAncestor(child));
  };

  for (const group of groups) {
    const groupKey = `group:${group.id}`;
    const containsActive = group.children.some((child) => isActiveOrAncestor(child));
    const defaultExpanded = group.defaultOpen || containsActive;
    expanded[groupKey] = userOverrides[groupKey] ?? defaultExpanded;

    const walk = (items: NavItem[]) => {
      for (const item of items) {
        if (item.children.length === 0) continue;
        const itemDefault = defaultOpenPaths.has(item.key) || isActiveOrAncestor(item);
        expanded[item.key] = userOverrides[item.key] ?? itemDefault;
        walk(item.children);
      }
    };
    walk(group.children);
  }

  return expanded;
};
