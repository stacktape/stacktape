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

export const getNavigationTree = (allDocPages: MdxPageDataForNavigation[]) => {
  const navigationItems = allDocPages.map((docPage) => {
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
    const forcedOrder = aIdx - bIdx;
    if (forcedOrder !== 0) {
      return forcedOrder;
    }
    const frontOrder = a.order - b.order;
    return frontOrder !== 0 ? frontOrder : a.label.localeCompare(b.label);
  });

  let result = {
    __root: createUnassignedGroup()
  };

  navigationItems.forEach((data) => {
    let isChild = false;
    let parent = null;
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
    if (!isChild) {
      // assume first level of navigation entry URL may be ID (path) of a group
      let group = result[data.url.split('/')[1].toLowerCase()];
      if (group == null) {
        group = group || getGroup(data.url);
        if (!group) {
          group = result.__root;
        } else {
          group = {
            title: group ? group.title : '',
            icon: group ? group.icon : null,
            order: group ? group.order : 0,
            // assume group have 1 level, e.g. /config
            id: group ? group.path.replace(/^\//, '').toLowerCase() : null,
            children: []
          };
          result[group.id] = group;
        }
      }
      data.groupName = group.title;
      data.groupIcon = group.icon;
      data.children.forEach((child) => {
        child.groupName = group.title;
        child.groupIcon = group.icon;
      });
      group.children.push(data);
    }
  });
  // @ts-expect-error - result is not typed
  result = Object.values(result);
  // @ts-expect-error - result is not typed
  result.sort((a, b) => {
    const ordered = a.order - b.order;
    return ordered !== 0 ? ordered : a.title.localeCompare(b.title);
  });

  // console.log(result);

  return result;
};
