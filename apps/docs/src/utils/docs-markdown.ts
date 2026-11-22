import { decode } from 'html-entities';
import { Marked } from 'marked';
import config from '@/site-config';
import { ensureTrailingSlash } from './seo';

/**
 * Markdown renderer for description strings that arrive as data rather than as MDX — resource
 * `referenceableParams` descriptions and the config-schema descriptions rendered inside the API
 * reference.
 *
 * This is a dedicated `Marked` instance rather than a configured global: the code block's hover
 * popups also render markdown, and mutating the shared `marked` singleton would silently reshape
 * their links too.
 */
const markedDocsData: Marked = new Marked({
  renderer: {
    codespan(code): string {
      return `<code>${decode(code.text)}</code>`;
    },
    blockquote(quote): string {
      const renderedContent = markedDocsData.parse(quote.text, { async: false });
      // The same markup as the <Warning> callout.
      return `<div class="docs-callout" data-variant="warning" role="note"><span class="docs-callout-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></span><div class="docs-callout-body"><span class="sr-only-docs">Warning: </span>${renderedContent}</div></div>`;
    },
    link({ href, text }): string {
      const normalizedHref = href.startsWith(config.metadata.url)
        ? ensureTrailingSlash(href.slice(config.metadata.url.length))
        : href;
      return `<a href="${normalizedHref}" target="_blank" rel="noreferrer">${text}</a>`;
    }
  }
});

/** Render a documentation-data markdown string to HTML synchronously. */
export const renderDocsMarkdown = (markdown: string): string => markedDocsData.parse(markdown, { async: false });
