// Relative rather than aliased: `astro.config.mjs` also pulls this module in (through the rehype
// link rewriter), and that module graph is resolved before the tsconfig `@/*` alias exists.
import config from '../site-config';

export const SITE_URL = config.metadata.url.replace(/\/$/, '');
export const SITE_NAME = config.metadata.name;
const TITLE_SUFFIX = 'Stacktape Docs';

/**
 * Append the trailing slash that `trailingSlash: 'always'` serves, leaving file paths and any
 * `?query`/`#fragment` suffix untouched. Sole owner of that rule: the rehype link rewriter and the
 * documentation-data markdown renderer both call it, so authored links and generated descriptions
 * cannot disagree about the canonical shape of an internal URL.
 */
export const ensureTrailingSlash = (url: string): string => {
  let pathEnd = url.search(/[?#]/);
  if (pathEnd === -1) pathEnd = url.length;
  const path = url.slice(0, pathEnd);
  const rest = url.slice(pathEnd);
  if (path.length === 0 || path.endsWith('/') || path.includes('.')) return `${path}${rest}`;
  return `${path}/${rest}`;
};

/** Origins whose pages this site serves itself, so links to them stay in the current tab. */
const OWN_ORIGINS = [SITE_URL, 'http://localhost'];

export const isAbsoluteHref = (href: string): boolean => /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//');

/** True for a link that leaves this site and should therefore open in a new tab. */
export const isExternalHref = (href: string): boolean =>
  isAbsoluteHref(href) && !OWN_ORIGINS.some((origin) => href.startsWith(origin));

type FaqItem = { question: string; answer: string };
export type BreadcrumbItem = { name: string; url: string };

export type DocsSeo = {
  title: string;
  description: string;
  canonical: string;
  faqItems: FaqItem[];
  breadcrumb: BreadcrumbItem[];
  datePublished?: string;
  dateModified?: string;
  noindex?: boolean;
};

/** Flatten markdown + inline HTML to plain text — required for <title>, meta, and JSON-LD text. */
export const mdToPlainText = (input = ''): string =>
  input
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/[*_~]{1,3}/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();

export const slugToTitle = (segment: string) =>
  segment
    .split('-')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');

export const buildFullTitle = (seoTitle: string | undefined, pageTitle: string) =>
  seoTitle && seoTitle.trim() ? seoTitle.trim() : `${pageTitle} | ${TITLE_SUFFIX}`;

// Trailing slash to match Astro's `trailingSlash: 'always'` — the canonical/OG URL must equal the
// served URL, otherwise every page advertises a URL that redirects.
export const buildCanonical = (slug: string[]) =>
  slug.length === 0 ? `${SITE_URL}/` : `${SITE_URL}/${slug.join('/')}/`;

/**
 * Extract `{ question, answer }` pairs from the `## FAQ` section of a frontmatter-stripped MDX
 * body. The answer is flattened to plain text (links → text, code/emphasis stripped) so it is
 * valid for FAQPage `acceptedAnswer.text`.
 */
export const extractFaqItems = (markdown: string): FaqItem[] => {
  const lines = markdown.split('\n');
  let i = 0;
  while (i < lines.length && !/^##\s+FAQ\s*$/.test(lines[i].trim())) i++;
  if (i >= lines.length) return [];
  i++; // past "## FAQ"

  const items: FaqItem[] = [];
  let question: string | null = null;
  let buffer: string[] = [];
  const flush = () => {
    if (question === null) return;
    const answer = mdToPlainText(buffer.join('\n'));
    const q = mdToPlainText(question);
    if (q && answer) items.push({ question: q, answer });
  };

  for (; i < lines.length; i++) {
    const line = lines[i];
    if (/^##\s+/.test(line.trim())) break; // next top-level section ends the FAQ
    const h3 = line.match(/^###\s+(.*)$/);
    if (h3) {
      flush();
      question = h3[1].trim();
      buffer = [];
    } else if (question !== null) {
      buffer.push(line);
    }
  }
  flush();
  return items;
};

/** Build an absolute-URL breadcrumb trail from the slug, naming each level from real page titles. */
export const buildBreadcrumb = (slug: string[], allDocPages: { url: string; title: string }[]): BreadcrumbItem[] => {
  const titleByUrl = new Map(allDocPages.map((p) => [p.url, p.title]));
  const items: BreadcrumbItem[] = [{ name: 'Docs', url: `${SITE_URL}/` }];
  const acc: string[] = [];
  for (const segment of slug) {
    acc.push(segment);
    const path = `/${acc.join('/')}`;
    // Trailing slash to match the served (trailingSlash: 'always') URLs the breadcrumb points at.
    items.push({ name: titleByUrl.get(path) || slugToTitle(segment), url: `${SITE_URL}${path}/` });
  }
  return items;
};
