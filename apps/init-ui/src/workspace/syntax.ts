/**
 * Quiet syntax colouring for the code window: comments, strings, numbers, keywords and keys, nothing more.
 *
 * The window shows what the analysis is reading, not an IDE, so a small line scanner is enough and it never guesses
 * structure across lines beyond block comments. Its output is plain text runs, rendered as React text nodes.
 */

export type TokenKind = 'plain' | 'comment' | 'string' | 'number' | 'keyword' | 'key';
export type Token = { text: string; kind: TokenKind };
type Language = 'c' | 'python' | 'hash' | 'yaml' | 'json' | 'env' | 'plain';

export const languageOf = (path: string): Language => {
  const name = path.split('/').at(-1)?.toLowerCase() ?? '';
  if (name.startsWith('.env')) return 'env';
  if (/^(dockerfile|makefile|procfile)$|\.(sh|toml|dockerfile|ini|conf|properties)$/.test(name)) return 'hash';
  if (/\.(ya?ml)$/.test(name)) return 'yaml';
  if (name.endsWith('.json')) return 'json';
  if (name.endsWith('.py')) return 'python';
  if (/\.([cm]?[jt]sx?|go|prisma|rs|java|kt|cs|php|swift|css|scss)$/.test(name)) return 'c';
  return 'plain';
};

const KEYWORDS: Readonly<Record<Language, ReadonlySet<string>>> = {
  c: new Set(
    'import export from default const let var function return async await if else for while new class extends interface type enum package func go defer range struct map chan select case switch break continue try catch finally throw typeof instanceof in of as public private static model datasource generator true false null undefined nil'.split(
      ' '
    )
  ),
  python: new Set(
    'import from as def class return if elif else for while in not and or is with async await try except finally raise lambda yield pass None True False'.split(
      ' '
    )
  ),
  hash: new Set(
    'FROM RUN COPY WORKDIR ENV ARG EXPOSE CMD ENTRYPOINT USER LABEL VOLUME AS export if then fi'.split(' ')
  ),
  yaml: new Set(['true', 'false', 'null']),
  json: new Set(['true', 'false', 'null']),
  env: new Set<string>(),
  plain: new Set<string>()
};

const lineComment = (language: Language, line: string, index: number): boolean => {
  if (language === 'c') return line.startsWith('//', index);
  if (language === 'plain' || language === 'json') return false;
  // `#` starts a comment at the start of a line or after a space, not inside `a#b`.
  return line[index] === '#' && (index === 0 || /\s/.test(line[index - 1]!));
};

/** One line's tokens, and whether a block comment is still open at its end. */
export const tokenizeLine = (
  line: string,
  language: Language,
  inBlockComment = false
): { tokens: Token[]; inBlockComment: boolean } => {
  const tokens: Token[] = [];
  const push = (text: string, kind: TokenKind) => {
    if (text === '') return;
    const last = tokens.at(-1);
    if (last !== undefined && last.kind === kind) last.text += text;
    else tokens.push({ text, kind });
  };
  let index = 0;
  let open = inBlockComment;

  // A key at the start of the line: `key:` in YAML, `KEY=` in .env, `key =` in TOML-like files.
  const key =
    language === 'yaml'
      ? /^(\s*(?:-\s+)?)([\w.$/-]+|"[^"]*"|'[^']*')(?=\s*:(\s|$))/.exec(line)
      : language === 'env'
        ? /^(\s*(?:export\s+)?)([A-Za-z_][\w.-]*)(?=\s*=)/.exec(line)
        : language === 'hash'
          ? /^(\s*)([A-Za-z_][\w.-]*)(?=\s*=)/.exec(line)
          : null;
  if (key !== null && !line.trimStart().startsWith('#')) {
    push(key[1]!, 'plain');
    push(key[2]!, 'key');
    index = key[0].length;
  }

  while (index < line.length) {
    if (open) {
      const end = line.indexOf('*/', index);
      const stop = end < 0 ? line.length : end + 2;
      push(line.slice(index, stop), 'comment');
      index = stop;
      open = end < 0;
      continue;
    }
    const char = line[index]!;
    if (language === 'c' && line.startsWith('/*', index)) {
      open = true;
      continue;
    }
    if (lineComment(language, line, index)) {
      push(line.slice(index), 'comment');
      break;
    }
    if (char === '"' || char === "'" || (char === '`' && language === 'c')) {
      let end = index + 1;
      while (end < line.length && line[end] !== char) end += line[end] === '\\' ? 2 : 1;
      const text = line.slice(index, Math.min(end + 1, line.length));
      // A JSON key is a string followed by a colon.
      const isKey = language === 'json' && /^\s*:/.test(line.slice(index + text.length));
      push(text, isKey ? 'key' : 'string');
      index += text.length;
      continue;
    }
    const number = /^\d[\d_.]*\b/.exec(line.slice(index));
    if (number !== null && (index === 0 || !/[\w$.]/.test(line[index - 1]!))) {
      push(number[0], 'number');
      index += number[0].length;
      continue;
    }
    const word = /^[A-Za-z_$][\w$]*/.exec(line.slice(index));
    if (word !== null) {
      push(word[0], KEYWORDS[language].has(word[0]) ? 'keyword' : 'plain');
      index += word[0].length;
      continue;
    }
    push(char, 'plain');
    index += 1;
  }
  return { tokens, inBlockComment: open };
};

/** Every line of a file, tokenized, carrying block comments from one line to the next. */
export const tokenizeFile = (text: string, path: string): Token[][] => {
  const language = languageOf(path);
  let inBlockComment = false;
  return text.split('\n').map((line) => {
    const result = tokenizeLine(line.replace(/\r$/, ''), language, inBlockComment);
    inBlockComment = result.inBlockComment;
    return result.tokens;
  });
};
