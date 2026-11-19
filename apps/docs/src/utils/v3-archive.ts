/**
 * Build-time helpers for the frozen Stacktape v3 documentation served under `/v3/`.
 *
 * The archive content lives in `archive/v3/content`, outside `content/`, so it never reaches the CLI's
 * LLM corpus. Browser-safe routing data is in `v3-archive-routes.ts`; this module reads the file
 * system and is for the build, the validator and tests only.
 */
import { readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { entryToUrlSlug, slugToUrl } from './route-slugs';
import { V3_BASE, v3Url } from './v3-archive-routes';

/** `process.cwd()` is `apps/docs` for every Astro and test invocation (see `git-dates.ts`). */
export const ARCHIVE_CONTENT_DIR = resolve(process.cwd(), 'archive/v3/content');

/** True for an MDX file that belongs to the v3 archive collection. */
export const isV3ArchiveFile = (path: string | undefined): boolean =>
  Boolean(path && path.replace(/\\/g, '/').includes('/archive/v3/content/'));

const walk = (directory: string): string[] =>
  readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

let v3PagePaths: Set<string> | undefined;

/** Every v3 page path as v3 served it, without the `/v3` prefix: `/`, `/compute-resources/functions`, ... */
export const getV3PagePaths = (): Set<string> => {
  if (v3PagePaths) return v3PagePaths;
  v3PagePaths = new Set(
    walk(ARCHIVE_CONTENT_DIR)
      .filter((path) => path.endsWith('.mdx'))
      .map((path) => slugToUrl(entryToUrlSlug(relative(ARCHIVE_CONTENT_DIR, path).replace(/\.mdx$/, ''))))
  );
  return v3PagePaths;
};

/**
 * Paths that v3 content or the 3.7.1 CLI links to but that were not v3 pages. Each points at the v3
 * page that covers the topic. Links that already failed in v3 are repaired here, not in the content.
 */
export const V3_PATH_ALIASES: Record<string, string> = {
  '/compute-resources/lambda-functions': '/compute-resources/functions',
  '/3rd-party-resources/upstash-redis': '/3rd-party-resources/upstash-redises',
  '/bastion-servers': '/security-resources/bastions',
  '/resources/bastion-servers': '/security-resources/bastions',
  '/getting-started/setup-stacktape': '/getting-started/quick-start',
  '/resources/secrets': '/security-resources/secrets',
  '/resources/dynamo-db-tables': '/database-resources/dynamo-db-tables',
  '/getting-started/deploying-using-cli': '/getting-started/deployment',
  '/getting-started/deploying-using-gitops': '/getting-started/deployment',
  '/getting-started/deploying-using-console': '/getting-started/deployment',
  '/getting-started/deploying-using-3rd-party-ci': '/getting-started/deployment'
};

/** Dead v3 links whose topic only the current docs cover. */
const V3_LINKS_TO_CURRENT_DOCS: Record<string, string> = {
  '/starter-projects': '/getting-started/starter-projects/'
};

const DOCS_ORIGIN = /^https?:\/\/docs\.stacktape\.com(?=\/|$)/;

/**
 * Rewrite a link found in v3 content so it stays inside the archive.
 *
 * Root-relative, relative (`../x.mdx`) and absolute `docs.stacktape.com` links to a v3 page go to its
 * `/v3/` copy. Links to pages that v3 itself did not have stay as they are; the built-site validator
 * reports any that do not resolve. External links, fragments and asset paths are untouched.
 */
export const toV3Href = (href: string, fromV3Path: string): string => {
  if (!href || href.startsWith('#') || href.startsWith(`${V3_BASE}/`)) return href;
  const local = href.replace(DOCS_ORIGIN, '') || '/';
  if (/^[a-z][a-z0-9+.-]*:/i.test(local) || local.startsWith('//')) return href;

  const queryOrHash = local.search(/[?#]/);
  const pathPart = queryOrHash === -1 ? local : local.slice(0, queryOrHash);
  const suffix = queryOrHash === -1 ? '' : local.slice(queryOrHash);
  if (/\.(png|jpe?g|gif|svg|webp|pdf)$/i.test(pathPart)) return href;

  const resolveFrom = (base: string) =>
    new URL(pathPart || '.', `https://archive.invalid${base}`).pathname.replace(/\.mdx?$/, '').replace(/\/$/, '') ||
    '/';
  const pages = getV3PagePaths();
  // v3 served pages with a trailing slash, so relative links resolve against the page itself. Links
  // inside shared schema descriptions were written relative to the page's directory instead.
  const candidates = [
    resolveFrom(fromV3Path === '/' ? '/' : `${fromV3Path}/`),
    resolveFrom(fromV3Path.replace(/[^/]*$/, ''))
  ];
  for (const candidate of candidates) {
    const target = pages.has(candidate) ? candidate : V3_PATH_ALIASES[candidate];
    if (target) return `${v3Url(target)}${suffix}`;
  }
  const current = V3_LINKS_TO_CURRENT_DOCS[candidates[0]];
  return current ? `${current}${suffix}` : href;
};
