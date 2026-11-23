import { LuHouse } from 'react-icons/lu';
import config, { type DocsVersion, type SidebarIcon, type SidebarSubgroup } from '@/site-config';
import type { DocPage } from '@/utils/docs-data';

/** Sort key of configured subgroups: after every page that sits directly in the group. */
const CONFIGURED_SUBGROUP_ORDER = 1_000_000;

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
  /** Page order from frontmatter (or the position in a subgroup's `pages` list). Configured
   *  subgroups sort by their position in the config; other virtual nodes inherit min(descendant.order). */
  order: number;
  /** Optional icon for virtual subgroup nodes; resolved from config.sidebar.groups[].subgroups
   *  during tree construction. Null for real pages and virtual nodes without a configured icon. */
  icon: SidebarIcon | null;
  children: NavItem[];
};

export type NavGroup = {
  id: string;
  title: string;
  icon: SidebarIcon | null;
  order: number;
  defaultOpen: boolean;
  children: NavItem[];
};

// Words that should keep their canonical casing in virtual subgroup labels (instead of being
// title-cased like "Cli" or "Aws"). Add as needed.
const acronyms = new Set(['ai', 'cli', 'aws', 'api', 'sdk', 'mcp', 'cdn', 'cdk', 'sql', 'efs', 'sns', 'sqs', 'waf']);

export const capitalizeSegment = (segment: string) =>
  segment
    .split('-')
    .map((word) =>
      acronyms.has(word.toLowerCase()) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1)
    )
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
 * 4. Pages listed in a configured subgroup's `pages` go under that subgroup instead of their URL
 *    path, in list order.
 * 5. Sort siblings by order ASC, then title ASC. Configured subgroups sort by their position in the
 *    config, after the group's own pages; other virtual nodes carry min(descendant.order).
 */
// Sort children recursively. Order is the primary key (lower first), title alphabetic is the
// tie-breaker.
const sortItems = (items: NavItem[]) => {
  items.sort((a, b) => {
    const orderDiff = a.order - b.order;
    if (orderDiff !== 0) return orderDiff;
    return a.title.localeCompare(b.title);
  });
  for (const item of items) {
    if (item.children.length > 0) sortItems(item.children);
  }
};

export const getNavigationTree = (allDocPages: DocPage[], version: DocsVersion = 'v4'): NavGroup[] => {
  // The v3 archive has its own taxonomy; its URLs carry a `/v3` prefix that grouping ignores.
  const sidebar = version === 'v3' ? config.v3Sidebar : config.sidebar;
  const basePath = version === 'v3' ? config.v3Sidebar.basePath : '';
  // Initialize groups from config + build lookups for the configured subgroups: their icon, label
  // and position, and which subgroup each explicitly listed page belongs to.
  const groupMap = new Map<string, NavGroup>();
  const subgroupIconByPath = new Map<string, SidebarIcon>();
  const subgroupTitleByPath = new Map<string, string>();
  const subgroupRankByPath = new Map<string, number>();
  const listedPageParent = new Map<string, { subgroupPath: string; rank: number }>();
  for (const g of sidebar.groups) {
    const id = g.path.replace(/^\//, '');
    groupMap.set(id, {
      // Prefixed in the archive so its expand/collapse state is kept apart from the v4 groups.
      id: basePath ? `${basePath}/${id}` : id,
      title: g.title,
      icon: g.icon,
      order: g.order,
      defaultOpen: ('defaultOpen' in g && g.defaultOpen) || false,
      children: []
    });
    const subgroups: SidebarSubgroup[] = 'subgroups' in g ? (g.subgroups ?? []) : [];
    subgroups.forEach((sub, index) => {
      if (sub.icon) subgroupIconByPath.set(sub.path, sub.icon);
      if (sub.title) subgroupTitleByPath.set(sub.path, sub.title);
      subgroupRankByPath.set(sub.path, index);
      sub.pages?.forEach((pageUrl, rank) => listedPageParent.set(pageUrl, { subgroupPath: sub.path, rank }));
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
      // Subgroup icons are only meaningful for virtual nodes (where url is null at create time).
      // Real pages don't get a sidebar icon; only the level-2 grouping nodes do.
      icon: !isLeaf ? (subgroupIconByPath.get(pathKey) ?? null) : null,
      children: []
    };
    nodeMap.set(pathKey, node);
    parentChildren.push(node);
    return node;
  };

  for (const page of allDocPages) {
    const url = page.url;
    if (url === (basePath || '/')) {
      // The docs home sits above the sections and reads like one of them: same icon column, same weight.
      const node: NavItem = {
        url,
        key: url,
        title: page.title,
        order: page.order ?? 999,
        icon: LuHouse,
        children: []
      };
      rootGroup.children.push(node);
      continue;
    }

    const segments = url.slice(basePath.length).split('/').filter(Boolean);
    const groupId = segments[0];
    const group = groupMap.get(groupId) || rootGroup;

    // A page listed in a subgroup's `pages` sits under that subgroup whatever its URL, ranked by
    // its position in the list (the CLI keeps flat `/cli/<command>` URLs but groups them by task).
    const listed = listedPageParent.get(url);
    if (listed) {
      const subgroupNode = ensureNode({
        pathKey: listed.subgroupPath,
        isLeaf: false,
        realUrl: null,
        title:
          subgroupTitleByPath.get(listed.subgroupPath) ?? capitalizeSegment(listed.subgroupPath.split('/').pop() ?? ''),
        order: listed.rank,
        parentChildren: group.children
      });
      ensureNode({
        pathKey: url,
        isLeaf: true,
        realUrl: url,
        title: page.title,
        order: listed.rank,
        parentChildren: subgroupNode.children
      });
      continue;
    }

    // The first segment IS the group's path prefix — the group itself represents it. Walk only
    // segments[1..] to build the tree underneath. Pages whose URL is exactly the group root
    // (e.g. /configuration with no further segment) become the group's first child.
    let parentChildren = group.children;
    let pathSoFar = basePath + '/' + segments[0];
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
        title: isLeaf ? page.title : (subgroupTitleByPath.get(pathSoFar) ?? capitalizeSegment(segments[i])),
        order: page.order ?? 999,
        parentChildren
      });
      parentChildren = node.children;
    }
  }

  // Configured subgroups keep the position they have in the config, after the group's own pages
  // (an overview or index page comes first). Without this they would inherit the lowest order of
  // their pages, so one low-ranked page could move a whole family up the list.
  for (const [subgroupPath, rank] of subgroupRankByPath) {
    const node = nodeMap.get(subgroupPath);
    if (node && node.url === null) node.order = CONFIGURED_SUBGROUP_ORDER + rank;
  }

  for (const group of groupMap.values()) {
    sortItems(group.children);
  }
  sortItems(rootGroup.children);

  // Final assembly: forced order first, then any unmatched groups.
  const result: NavGroup[] = [];
  if (rootGroup.children.length > 0) {
    result.push(rootGroup);
  }
  const orderedPaths = sidebar.forcedNavOrder;
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
 *   1. Defaults — auto-open of every ancestor of the current page. Only on the home page do the
 *      config's group `defaultOpen` flags and `defaultOpenPaths` apply, so a reader on a resource
 *      page sees that page's neighbours, not unrelated sections.
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
  const defaultOpenPaths = new Set<string>(config.sidebar.defaultOpenPaths);

  const isActiveOrAncestor = (item: NavItem): boolean => {
    if (item.url !== null && normalizedPath === item.url) return true;
    return item.children.some((child) => isActiveOrAncestor(child));
  };

  // The configured default-open sections only apply on the home page. Elsewhere the tree opens the current page's
  // branch and nothing else (the 404 page opens nothing, so its recovery actions carry the weight).
  const isHome = normalizedPath === '/' || normalizedPath === config.v3Sidebar.basePath;

  for (const group of groups) {
    const groupKey = `group:${group.id}`;
    const containsActive = group.children.some((child) => isActiveOrAncestor(child));
    const defaultExpanded = containsActive || (isHome && group.defaultOpen);
    expanded[groupKey] = userOverrides[groupKey] ?? defaultExpanded;

    const walk = (items: NavItem[]) => {
      for (const item of items) {
        if (item.children.length === 0) continue;
        const itemDefault = isActiveOrAncestor(item) || (isHome && defaultOpenPaths.has(item.key));
        expanded[item.key] = userOverrides[item.key] ?? itemDefault;
        walk(item.children);
      }
    };
    walk(group.children);
  }

  return expanded;
};

/** The section names above a page, as the sidebar shows them: `/resources/compute/web-service` → Resources, Compute. */
export const getSectionTrail = (pathname: string, allDocPages: DocPage[]): string[] => {
  const segments = pathname.split('/').filter(Boolean);
  return segments.slice(0, -1).map((segment, index) => {
    const path = `/${segments.slice(0, index + 1).join('/')}`;
    const title =
      index === 0
        ? config.sidebar.groups.find((group) => group.path === path)?.title
        : allDocPages.find((page) => page.url === path)?.title;
    return title ?? capitalizeSegment(segment);
  });
};
