/*
 * A small YAML highlighter for the Review screen. Build-time only: the page calls it in frontmatter
 * and inserts the result with `set:html`. It knows exactly what a stacktape.yml contains — keys,
 * scalars, list items and comments — and nothing else, which keeps it under a hundred lines.
 */

const escape = (text: string) =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

const scalar = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed === '') return '';
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return `<span class="cs-y-num">${escape(trimmed)}</span>`;
  if (/^(true|false|null)$/.test(trimmed)) return `<span class="cs-y-bool">${escape(trimmed)}</span>`;
  if (/^['"]/.test(trimmed)) return `<span class="cs-y-str">${escape(trimmed)}</span>`;
  return `<span class="cs-y-val">${escape(trimmed)}</span>`;
};

/** Splits an inline `# comment` off a value, ignoring `#` inside quotes. */
const splitComment = (text: string): [string, string] => {
  let quote: string | null = null;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === "'" || ch === '"') {
      quote = ch;
    } else if (ch === '#' && (i === 0 || text[i - 1] === ' ')) {
      return [text.slice(0, i), text.slice(i)];
    }
  }
  return [text, ''];
};

const highlightLine = (line: string): string => {
  if (line.trim() === '') return '';
  const indent = line.match(/^\s*/)?.[0] ?? '';
  let rest = line.slice(indent.length);
  let out = escape(indent);

  if (rest.startsWith('#')) return `${out}<span class="cs-y-comment">${escape(rest)}</span>`;

  if (rest.startsWith('- ')) {
    out += '<span class="cs-y-dash">-</span> ';
    rest = rest.slice(2);
  }

  const [body, comment] = splitComment(rest);
  const key = body.match(/^([A-Za-z0-9_.$-]+):(\s|$)/);
  if (key) {
    const name = key[1] ?? '';
    const isResource = indent.length === 2 && !rest.startsWith('-');
    out += `<span class="${isResource ? 'cs-y-key cs-y-key--resource' : 'cs-y-key'}">${escape(name)}</span><span class="cs-y-colon">:</span>`;
    const value = body.slice(key[0].length);
    if (value.trim()) out += ` ${scalar(value)}`;
  } else {
    out += scalar(body);
  }
  if (comment) out += `<span class="cs-y-comment">${escape(comment)}</span>`;
  return out;
};

export type HighlightedYaml = { html: string; lineCount: number };

/** Every line wrapped in `.cs-y-line` so the gutter and the code stay aligned. */
export const highlightYaml = (source: string): HighlightedYaml => {
  const lines = source.replace(/\n$/, '').split('\n');
  const html = lines.map((line) => `<span class="cs-y-line">${highlightLine(line) || ' '}</span>`).join('\n');
  return { html, lineCount: lines.length };
};
