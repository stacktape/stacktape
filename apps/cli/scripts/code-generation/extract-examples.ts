/**
 * Extracts fenced examples (```yaml and ```ts) embedded in JSDoc comments of a type file, recovering
 * the raw source the docs/editors would render. Shared by the YAML gate and the TS gate.
 *
 * Convention (must mirror the docs renderer + generation strip):
 *   - JSDoc prefix `^\s*\*\s?` is stripped from each comment line.
 *   - the escaped `*\/` (which cannot terminate the block comment) is unescaped back to a real star-slash.
 *   - Focus markers (`# stp-focus`/`# stp-end-focus` in YAML, `// stp-focus`/`// stp-end-focus` in TS)
 *     are authoring-only; they are removed here so the extracted code is exactly what users run.
 */
export type FencedExample = {
  file: string;
  property: string;
  line: number; // 1-based line of the first code line in the source file
  lang: 'yaml' | 'ts';
  code: string;
};

// Remove a focus marker from a line. Standalone (`# stp-focus`) -> drop the line (returns null);
// trailing (`- # stp-focus`) -> keep the content before it.
const stripMarker = (l: string): string | null => {
  const m = l.match(/^(.*?)[ \t]*(?:#|\/\/)[ \t]*stp-(?:end-)?focus[ \t]*$/);
  if (!m) return l;
  return m[1].trim() === '' ? null : m[1];
};

export const extractFencedExamples = (file: string, content: string): FencedExample[] => {
  const lines = content.split('\n');
  const examples: FencedExample[] = [];
  let lang: 'yaml' | 'ts' | null = null;
  let startLine = 0;

  const stripPrefix = (l: string) => l.replace(/^\s*\*\s?/, '');
  const unescape = (l: string) => l.replaceAll('*\\/', '*/');

  for (let i = 0; i < lines.length; i++) {
    const stripped = stripPrefix(lines[i]).trimEnd();
    if (!lang && (stripped === '```yaml' || stripped === '```ts')) {
      lang = stripped === '```yaml' ? 'yaml' : 'ts';
      startLine = i + 1;
      continue;
    }
    if (lang && stripped === '```') {
      let property = '?';
      for (let j = i + 1; j < Math.min(i + 12, lines.length); j++) {
        const m = lines[j].match(/^\s*([a-zA-Z0-9_]+)\??\s*[:(]/);
        if (m) {
          property = m[1];
          break;
        }
      }
      const code = lines
        .slice(startLine, i)
        .map((l) => unescape(stripPrefix(l)))
        .map(stripMarker)
        .filter((l): l is string => l !== null)
        .join('\n');
      examples.push({ file, property, line: startLine, lang, code });
      lang = null;
      continue;
    }
  }
  return examples;
};
