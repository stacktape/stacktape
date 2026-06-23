import { getCollection } from 'astro:content';
import { slugToTitle } from './seo';

/** Glob-loader id → URL slug segments. Normalizes index files (compute/index → ['compute']). */
export const entryToUrlSlug = (id: string): string[] => {
  if (id === 'index') return [];
  return id.replace(/\/index$/, '').split('/').filter(Boolean);
};

export const slugToUrl = (slug: string[]) => (slug.length === 0 ? '/' : `/${slug.join('/')}`);

export const getTitleFromSlug = (slug: string[]) => {
  if (slug.length === 0) return 'Introduction';
  return slugToTitle(slug[slug.length - 1]);
};

/** Flat, sorted page list used to build the sidebar navigation + breadcrumbs. */
export async function getAllDocPages(): Promise<MdxPageDataForNavigation[]> {
  const entries = await getCollection('docs');

  const pages: MdxPageDataForNavigation[] = entries.map((entry) => {
    const slug = entryToUrlSlug(entry.id);
    const data = entry.data as { title?: string; order?: number; category?: string };
    return {
      url: slugToUrl(slug),
      slug,
      title: data.title || getTitleFromSlug(slug),
      order: data.order ?? 999,
      category: data.category || (slug.length === 0 ? 'introduction' : slug[0])
    };
  });

  return pages.sort((a, b) => {
    if (a.order !== b.order) return (a.order ?? 999) - (b.order ?? 999);
    return a.title.localeCompare(b.title);
  });
}
