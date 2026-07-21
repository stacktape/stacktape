import config from '../../config';

export const SITE_URL = (config.metadata.url || 'https://docs.stacktape.com').replace(/\/$/, '');
export const SITE_NAME = config.metadata.name;
export const SITE_IMAGE = config.metadata.siteimage;
const TITLE_SUFFIX = 'Stacktape Docs';

export type FaqItem = { question: string; answer: string };
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
export const buildBreadcrumb = (
  slug: string[],
  allDocPages: { url: string; title: string }[]
): BreadcrumbItem[] => {
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

/** Remove the leading body-level `# Heading` so the page has a single H1 (the layout title). */
export const stripLeadingBodyH1 = (body: string) => body.replace(/^\s*#\s+[^\n]*\r?\n/, '');

/** Make the bare `## FAQ` heading topical (e.g. `## Web Service FAQ`) for query matching. */
export const templateFaqHeading = (body: string, topic?: string) =>
  topic ? body.replace(/^##[ \t]+FAQ[ \t]*$/m, `## ${topic} FAQ`) : body;
