import { decode } from 'html-entities';

/**
 * How the API reference turns generated description HTML into what a reader sees.
 *
 * The generated data carries descriptions as HTML, so entities inside it are correct — a browser
 * renders `don&#39;t` as `don't`. They only become visible defects when that HTML is flattened into
 * a React text node, which is what `stripHtml` does for tree rows, search text, and summaries.
 * Decoding here means the site is correct regardless of what the generator sends.
 */

/** Internal marker the schema uses to flag required properties; never shown to a reader. */
const REQUIRED_MARKER = '--stp-required--';

/** Flatten description HTML to plain text for a React text node. */
export const stripHtml = (value = '') =>
  decode(value.replace(/<[^>]*>/g, ''))
    .replaceAll(REQUIRED_MARKER, '')
    .trim();

/** Prepare description HTML for `dangerouslySetInnerHTML`, where the browser decodes entities. */
export const sanitizeHtml = (value = '') => value.replaceAll(REQUIRED_MARKER, '');
