import { visit } from 'unist-util-visit';

const DOCS_ORIGINS = ['https://docs.stacktape.com', 'http://localhost'];

const isAbsolute = (href: string) => /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//');

const ensureTrailingSlash = (href: string): string => {
  let end = href.indexOf('?');
  if (end === -1) end = href.indexOf('#');
  if (end === -1) end = href.length;
  const path = href.slice(0, end);
  const rest = href.slice(end);
  if (path.includes('.') || path.endsWith('/') || path.length === 0) return `${path}${rest}`;
  return `${path}/${rest}`;
};

/**
 * Link handling for MDX content (build-time, zero JS):
 *  - Internal links: strip a trailing `.mdx`/`.md` and normalize to a trailing slash.
 *  - External links (not docs.stacktape.com / localhost): open in a new tab with safe rel.
 * Mirrors the old <Link> component's behavior, but as static HTML so Astro's <ClientRouter />
 * handles smooth navigation + prefetch on the resulting anchors.
 */
export function rehypeDocsLinks() {
  return (tree: any) => {
    visit(tree, 'element', (node: any) => {
      if (node.tagName !== 'a') return;
      const href: string | undefined = node.properties?.href;
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

      if (isAbsolute(href)) {
        const isInternal = DOCS_ORIGINS.some((origin) => href.startsWith(origin));
        if (!isInternal) {
          node.properties.target = '_blank';
          node.properties.rel = 'noopener noreferrer';
        }
        return;
      }

      // Relative / root-relative internal link.
      const stripped = href.replace(/\.mdx?($|[?#])/, '$1');
      node.properties.href = ensureTrailingSlash(stripped);
    });
  };
}

export default rehypeDocsLinks;
