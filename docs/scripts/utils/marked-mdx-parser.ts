import { decode } from 'html-entities';
import { marked } from 'marked';
import config from '../../config';
import { ensureTrailingSlash } from './misc';

marked.use({
  renderer: {
    codespan(code) {
      return `<code>${decode(code.text)}</code>`;
    },
    blockquote(quote) {
      // Render the inner markdown as HTML
      const renderedContent = marked.parse ? marked.parse(quote.text) : marked(quote.text);
      return `<div class="highlight-wrapper">
  <div style="margin-right: 16px;line-height: 0px;">
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ED8B00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
  </div>
  <div>${renderedContent}</div>
</div>`;
    },
    link({ href, text }) {
      const normalizedHref = href.startsWith(config.metadata.url)
        ? ensureTrailingSlash(href.slice(config.metadata.url.length))
        : href;
      return `<a href="${normalizedHref}" style="font-weight: bold;" target="_blank" rel="noreferrer" onclick="event.stopPropagation();">${text}</a>`;
    }
  }
});

export { marked };
