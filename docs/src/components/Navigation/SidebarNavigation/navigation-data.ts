import config from '../../../../config';

const getGroup = function (url) {
  return url ? config.sidebar.groups.find((group) => url.startsWith(group.path)) : null;
};

const createUnassignedGroup = () => {
  return {
    title: '',
    icon: null,
    order: 0,
    id: '__root',
    children: []
  };
};

// Sections that should have collapsible parent-child navigation
// (e.g., CLI commands should be nested under a collapsible "Commands" item)
const COLLAPSIBLE_SECTIONS = ['/cli'];

const shouldBeCollapsible = (url: string) => {
  return COLLAPSIBLE_SECTIONS.some((section) => url.startsWith(section));
};

export const getNavigationTree = (allDocPages: MdxPageDataForNavigation[]) => {
  // Deep clone to avoid mutating input data (prevents hydration issues)
  const navigationItems = allDocPages
    .map((docPage) => ({
      ...docPage,
      slug: [...(docPage.slug || [])]
    }))
    .map((docPage) => {
      // Build potential parent URLs from the slug
      const parents = [];
      // For a slug like ['sdk', 'methods', 'compileTemplate'], we want to check for:
      // - '/sdk'
      // - '/sdk/methods'
      for (let i = 1; i < docPage.slug.length; i++) {
        const parentSlug = docPage.slug.slice(0, i);
        parents.push(`/${parentSlug.join('/')}`);
      }

      return {
        parent: parents.reverse(), // reverse so we check the most specific parent first
        label: docPage.slug.join(''),
        url: docPage.url,
        children: [],
        title: docPage.title,
        order: docPage.order,
        groupName: '',
        groupIcon: null
      };
    });

  navigationItems.sort((a, b) => {
    const aIdx = config.sidebar.forcedNavOrder.indexOf(a.url);
    const bIdx = config.sidebar.forcedNavOrder.indexOf(b.url);
    // Both in forcedNavOrder - sort by index
    if (aIdx !== -1 && bIdx !== -1) {
      return aIdx - bIdx;
    }
    // One in forcedNavOrder - it comes first
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    // Neither in forcedNavOrder - sort by order, then label, then url
    const orderDiff = (a.order ?? 999) - (b.order ?? 999);
    if (orderDiff !== 0) return orderDiff;
    const labelDiff = (a.label ?? '').localeCompare(b.label ?? '');
    if (labelDiff !== 0) return labelDiff;
    return (a.url ?? '').localeCompare(b.url ?? '');
  });

  let result = {
    __root: createUnassignedGroup()
  };

  navigationItems.forEach((data) => {
    let isChild = false;
    let parent = null;

    // Only create parent-child relationships for collapsible sections
    if (shouldBeCollapsible(data.url)) {
      data.parent.every((p) => {
        parent = navigationItems.find((d) => d.url === p);
        if (parent) {
          parent.children.push(data);
          isChild = true;
          data.parent = parent.url;
          return false;
        }
        return true;
      });
      if (parent) {
        data.parent = parent.title;
      } else {
        data.parent = null;
      }
    } else {
      // For non-collapsible sections, don't create parent-child relationships
      data.parent = null;
    }

    if (!isChild) {
      // Get the first path segment as potential group ID
      const urlParts = data.url.split('/').filter(Boolean);
      const groupId = urlParts.length > 0 ? urlParts[0].toLowerCase() : '';

      // Try to find existing group or create one
      let group = groupId ? result[groupId] : null;
      if (group == null) {
        const configGroup = getGroup(data.url);
        if (!configGroup) {
          group = result.__root;
        } else {
          group = {
            title: configGroup.title || '',
            icon: configGroup.icon || null,
            order: configGroup.order ?? 999,
            id: configGroup.path.replace(/^\//, '').toLowerCase(),
            children: []
          };
          result[group.id] = group;
        }
      }
      data.groupName = group.title;
      data.groupIcon = group.icon;
      if (data.children) {
        data.children.forEach((child) => {
          child.groupName = group.title;
          child.groupIcon = group.icon;
        });
      }
      group.children.push(data);
    }
  });
  // Convert to array and sort by order, then by title for consistent ordering
  const resultArray = Object.values(result) as any[];
  resultArray.sort((a, b) => {
    // Put __root group last if it exists
    if (a.id === '__root') return 1;
    if (b.id === '__root') return -1;
    const ordered = (a.order ?? 999) - (b.order ?? 999);
    return ordered !== 0 ? ordered : (a.title ?? '').localeCompare(b.title ?? '');
  });

  // Also sort children within each group for consistency
  for (const group of resultArray) {
    if (group.children) {
      group.children.sort((a: any, b: any) => {
        const orderDiff = (a.order ?? 999) - (b.order ?? 999);
        if (orderDiff !== 0) return orderDiff;
        const titleDiff = (a.title ?? '').localeCompare(b.title ?? '');
        if (titleDiff !== 0) return titleDiff;
        return (a.url ?? '').localeCompare(b.url ?? '');
      });
      // Recursively sort nested children
      for (const child of group.children) {
        if (child.children && child.children.length > 0) {
          child.children.sort((a: any, b: any) => {
            const orderDiff = (a.order ?? 999) - (b.order ?? 999);
            if (orderDiff !== 0) return orderDiff;
            const titleDiff = (a.title ?? '').localeCompare(b.title ?? '');
            if (titleDiff !== 0) return titleDiff;
            return (a.url ?? '').localeCompare(b.url ?? '');
          });
        }
      }
    }
  }

  return resultArray;
};
