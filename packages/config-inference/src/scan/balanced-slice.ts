/**
 * Slice a JavaScript/TypeScript object without executing or fully parsing the program.
 *
 * Importers only need the literal options passed to a constructor. Counting every `{` and `}`
 * looks sufficient until a command, URL, regular comment, or template contains one; then the slice
 * ends early and properties from a later construct get attributed to the wrong resource. This
 * scanner deliberately understands only the lexical boundaries needed for balanced braces:
 * strings, templates (including `${...}`), and comments. Computed properties still remain absent —
 * the importer reads literals from the returned body exactly as before.
 */

export type BalancedSlice = {
  /** Text inside the opening and closing brace. */
  body: string;
  /** Index immediately after the closing brace. */
  end: number;
};

type Mode = 'code' | 'single-quote' | 'double-quote' | 'template' | 'line-comment' | 'block-comment';

export const sliceBalancedBraces = (contents: string, openingBrace: number): BalancedSlice | undefined => {
  if (contents[openingBrace] !== '{') return undefined;

  let depth = 1;
  let cursor = openingBrace + 1;
  let mode: Mode = 'code';
  /** Depths introduced by `${`; reaching one of them returns to template text. */
  const templateExpressions: number[] = [];

  while (cursor < contents.length) {
    const character = contents[cursor]!;
    const next = contents[cursor + 1];

    if (mode === 'line-comment') {
      if (character === '\n' || character === '\r') mode = 'code';
      cursor += 1;
      continue;
    }
    if (mode === 'block-comment') {
      if (character === '*' && next === '/') {
        mode = 'code';
        cursor += 2;
      } else {
        cursor += 1;
      }
      continue;
    }
    if (mode === 'single-quote' || mode === 'double-quote') {
      const quote = mode === 'single-quote' ? "'" : '"';
      if (character === '\\') {
        cursor += 2;
      } else {
        if (character === quote) mode = 'code';
        cursor += 1;
      }
      continue;
    }
    if (mode === 'template') {
      if (character === '\\') {
        cursor += 2;
        continue;
      }
      if (character === '`') {
        mode = 'code';
        cursor += 1;
        continue;
      }
      if (character === '$' && next === '{') {
        depth += 1;
        templateExpressions.push(depth);
        mode = 'code';
        cursor += 2;
        continue;
      }
      cursor += 1;
      continue;
    }

    if (character === '/' && next === '/') {
      mode = 'line-comment';
      cursor += 2;
      continue;
    }
    if (character === '/' && next === '*') {
      mode = 'block-comment';
      cursor += 2;
      continue;
    }
    if (character === "'") {
      mode = 'single-quote';
      cursor += 1;
      continue;
    }
    if (character === '"') {
      mode = 'double-quote';
      cursor += 1;
      continue;
    }
    if (character === '`') {
      mode = 'template';
      cursor += 1;
      continue;
    }
    if (character === '{') {
      depth += 1;
      cursor += 1;
      continue;
    }
    if (character === '}') {
      const closingDepth = depth;
      depth -= 1;
      cursor += 1;
      if (depth === 0) {
        return { body: contents.slice(openingBrace + 1, cursor - 1), end: cursor };
      }
      if (templateExpressions.at(-1) === closingDepth) {
        templateExpressions.pop();
        mode = 'template';
      }
      continue;
    }
    cursor += 1;
  }

  return undefined;
};
