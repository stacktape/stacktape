import { getCollection } from 'astro:content';
import { entryToUrlSlug, slugToUrl } from './route-slugs';
import { slugToTitle } from './seo';
import { V3_BASE } from './v3-archive-routes';

/** A canonical documentation page reduced to what navigation, breadcrumbs, and SEO need. */
export type DocPage = {
  url: string;
  slug: string[];
  title: string;
  order: number;
  category: string;
};

export type TableOfContentsItem = { level: number; text: string; href: string };

export const getTitleFromSlug = (slug: string[]) => {
  if (slug.length === 0) return 'Introduction';
  return slugToTitle(slug[slug.length - 1]);
};

/** Flat, sorted page list used to build the sidebar navigation + breadcrumbs. */
export async function getAllDocPages(): Promise<DocPage[]> {
  const entries = await getCollection('docs');

  const pages: DocPage[] = entries.map((entry) => {
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

  return pages.toSorted((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.title.localeCompare(b.title);
  });
}

/** The v3 archive's pages, with `/v3/` URLs, for the archive's own sidebar. */
export async function getAllV3DocPages(): Promise<DocPage[]> {
  const entries = await getCollection('v3');
  const pages: DocPage[] = entries.map((entry) => {
    const slug = entryToUrlSlug(entry.id);
    const data = entry.data as { title?: string; order?: number };
    return {
      url: slug.length === 0 ? V3_BASE : `${V3_BASE}/${slug.join('/')}`,
      slug,
      title: data.title || getTitleFromSlug(slug),
      order: data.order ?? 999,
      category: slug.length === 0 ? 'introduction' : slug[0]
    };
  });
  return pages.toSorted((a, b) => (a.order !== b.order ? a.order - b.order : a.title.localeCompare(b.title)));
}
