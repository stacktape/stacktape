import config from '@/site-config';

/** What kind of page a search result is. Shown as the result group, and given to the crawler as a meta tag. */
export type DocsPageType = 'Guide' | 'Resource' | 'Command' | 'Console';

export type SearchContext = {
  type: DocsPageType;
  /** The sidebar section ("Observability", or "Databases" for a resource), when the type alone does not say it. */
  section: string | null;
  /** The result group heading: "Commands", "Console", "Resources · Databases", "Guides · Observability". */
  group: string;
};

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).replaceAll('-', ' ');

const GROUP_TITLES = new Map(config.sidebar.groups.map((group) => [group.path, group.title]));
const RESOURCE_TITLES = new Map(
  (config.sidebar.groups.find((group) => group.path === '/resources')?.subgroups ?? []).map((subgroup) => [
    subgroup.path,
    subgroup.title ?? capitalize(subgroup.path.split('/').at(-1) ?? '')
  ])
);

/** The type and section of a docs path, such as `/resources/databases/redis/`. */
export const searchContextFor = (pathname: string): SearchContext => {
  const segments = pathname.split('/').filter(Boolean);
  const top = segments[0] ? `/${segments[0]}` : '';
  if (top === '/cli') return { type: 'Command', section: null, group: 'Commands' };
  if (top === '/stacktape-console') return { type: 'Console', section: null, group: 'Console' };
  if (top === '/resources') {
    const section = segments[1] ? (RESOURCE_TITLES.get(`/resources/${segments[1]}`) ?? null) : null;
    return { type: 'Resource', section, group: section ? `Resources · ${section}` : 'Resources' };
  }
  const section = GROUP_TITLES.get(top) ?? null;
  return { type: 'Guide', section, group: section ? `Guides · ${section}` : 'Guides' };
};
