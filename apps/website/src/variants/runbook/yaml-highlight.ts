/*
 * A small YAML highlighter for the Review screen's file pane.
 *
 * Runs in `.astro` frontmatter at build time and returns HTML for `set:html`. It knows exactly as
 * much YAML as a Stacktape config uses — keys, list dashes, scalars, comments — and nothing more, so
 * it stays a few lines instead of pulling a grammar into the page. Token classes are `rb-y-*` and
 * are styled globally in `runbook.css`, because injected HTML carries no Astro scope attribute.
 */

export type HighlightedYaml = { html: string; lineCount: number };

const escapeHtml = (text: string): string =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const span = (cls: string, text: string): string => `<span class="${cls}">${escapeHtml(text)}</span>`;

/** Index of a `#` that starts a comment, or -1. A `#` inside quotes or glued to a word is not one. */
const findComment = (line: string): number => {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === "'" && !inDouble) inSingle = !inSingle;
    else if (char === '"' && !inSingle) inDouble = !inDouble;
    else if (char === '#' && !inSingle && !inDouble && (i === 0 || /\s/.test(line[i - 1] ?? ''))) return i;
  }
  return -1;
};

const scalar = (value: string): string => {
  if (value === '') return '';
  const trimmed = value.trim();
  let cls = 'rb-y-plain';
  if (/^(['"]).*\1$/.test(trimmed)) cls = 'rb-y-str';
  else if (/^-?\d+(\.\d+)?$/.test(trimmed)) cls = 'rb-y-num';
  else if (/^(true|false|null|~)$/.test(trimmed)) cls = 'rb-y-bool';
  else if (trimmed.startsWith('$')) cls = 'rb-y-directive';
  return span(cls, value);
};

const KEY_LINE = /^(\s*)(- )?([^\s:#-][^:]*?)(:)(\s+|$)(.*)$/;
const LIST_LINE = /^(\s*)(- )(.*)$/;

const highlightLine = (line: string): string => {
  const commentAt = findComment(line);
  const code = commentAt >= 0 ? line.slice(0, commentAt) : line;
  const comment = commentAt >= 0 ? span('rb-y-comment', line.slice(commentAt)) : '';

  const keyed = KEY_LINE.exec(code);
  if (keyed) {
    const [, indent = '', dash = '', key = '', , gap = '', rest = ''] = keyed;
    const dashHtml = dash ? span('rb-y-dash', dash) : '';
    return `${escapeHtml(indent)}${dashHtml}${span('rb-y-key', key)}${span('rb-y-punct', ':')}${escapeHtml(gap)}${scalar(rest)}${comment}`;
  }

  const listed = LIST_LINE.exec(code);
  if (listed) {
    const [, indent = '', dash = '', rest = ''] = listed;
    return `${escapeHtml(indent)}${span('rb-y-dash', dash)}${scalar(rest)}${comment}`;
  }

  return `${escapeHtml(code)}${comment}`;
};

export const highlightYaml = (source: string): HighlightedYaml => {
  const lines = source.replace(/\s+$/, '').split('\n');
  return { html: lines.map(highlightLine).join('\n'), lineCount: lines.length };
};
