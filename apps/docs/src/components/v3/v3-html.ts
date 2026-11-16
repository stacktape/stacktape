import { isExternalHref } from '@/utils/seo';
import { toV3Href } from '@/utils/v3-archive';

/** What a v3 component needs to know about the page it renders on. */
export type V3PageContext = {
  /** The page's v3 path without the `/v3` prefix, e.g. `/compute-resources/functions`. */
  path: string;
  /** Definition names of the property tables on this page; type badges link only to these. */
  tableDefinitions: Set<string>;
};

const rewriteHref = (href: string, page: V3PageContext) => toV3Href(href, page.path);

/**
 * Prepare a v3 description (HTML from the frozen 3.7.1 data) for `dangerouslySetInnerHTML`: keep links
 * inside the archive, open external links in a new tab, and drop v3's inline click handlers and the
 * schema's internal required marker.
 */
export const v3Html = Object.assign(
  (html: string, page: V3PageContext) =>
    html
      .replaceAll('--stp-required--', '')
      .replace(/\s+onclick="[^"]*"/g, '')
      .replace(/<a\s([^>]*?)href="([^"]*)"([^>]*)>/g, (_, before: string, href: string, after: string) => {
        const target = rewriteHref(href, page);
        const attributes = `${before}href="${target}"${after}`.replace(/\s+(target|rel)="[^"]*"/g, '');
        return isExternalHref(target)
          ? `<a ${attributes} target="_blank" rel="noopener noreferrer">`
          : `<a ${attributes}>`;
      }),
  { href: rewriteHref }
);
