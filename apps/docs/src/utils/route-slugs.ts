/**
 * The mapping from a canonical content file to its URL.
 *
 * Kept free of Astro imports on purpose: the site renders through `astro:content` while the
 * built-site validator and the route tests run as plain Node scripts, and all three must agree on
 * exactly which routes the corpus produces.
 */

/** Glob-loader id (path without extension) → URL slug segments. `compute/index` → `['compute']`. */
export const entryToUrlSlug = (id: string): string[] => {
  const normalized = id.replace(/\\/g, '/');
  if (normalized === 'index') return [];
  return normalized
    .replace(/\/index$/, '')
    .split('/')
    .filter(Boolean);
};

export const slugToUrl = (slug: string[]) => (slug.length === 0 ? '/' : `/${slug.join('/')}`);
