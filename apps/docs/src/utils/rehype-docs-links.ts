import { visit } from 'unist-util-visit';
import type { AstNode } from './ast';
import { ensureTrailingSlash, isAbsoluteHref, isExternalHref } from './seo';

/**
 * Link handling for MDX content (build-time, zero JS):
 *  - Internal links: strip a trailing `.mdx`/`.md` and normalize to a trailing slash.
 *  - External links: open in a new tab with a safe `rel`.
 *
 * Mirrors the `<Link>` component's behavior, but as static HTML so Astro's `<ClientRouter />`
 * handles smooth navigation + prefetch on the resulting anchors.
 */
export function rehypeDocsLinks() {
  return (tree: AstNode) => {
    visit(tree, 'element', (node: AstNode) => {
      if (node.tagName !== 'a') return;
      const properties = (node.properties ?? {}) as Record<string, unknown>;
      const href = typeof properties.href === 'string' ? properties.href : undefined;
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

      if (isAbsoluteHref(href)) {
        if (isExternalHref(href)) {
          properties.target = '_blank';
          properties.rel = 'noopener noreferrer';
        }
        return;
      }

      // Relative / root-relative internal link.
      properties.href = ensureTrailingSlash(href.replace(/\.mdx?($|[?#])/, '$1'));
    });
  };
}
