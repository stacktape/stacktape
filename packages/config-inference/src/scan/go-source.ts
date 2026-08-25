/** Lexical Go views for probes that must ignore comments or string-shaped code without type-checking a module. */

const lexicalView = (source: string, preserveStrings: boolean): string => {
  let result = '';
  let state: 'code' | 'line-comment' | 'block-comment' | 'double' | 'raw' | 'rune' = 'code';
  const appendHidden = (character: string): void => {
    result += character === '\n' ? '\n' : ' ';
  };
  const isEscaped = (index: number): boolean => {
    let backslashes = 0;
    for (let cursor = index - 1; cursor >= 0 && source[cursor] === '\\'; cursor -= 1) backslashes += 1;
    return backslashes % 2 === 1;
  };
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]!;
    const next = source[index + 1];
    if (state === 'code' && character === '/' && (next === '/' || next === '*')) {
      appendHidden(character);
      appendHidden(next);
      index += 1;
      state = next === '/' ? 'line-comment' : 'block-comment';
      continue;
    }
    if (state === 'line-comment') {
      appendHidden(character);
      if (character === '\n') state = 'code';
      continue;
    }
    if (state === 'block-comment') {
      appendHidden(character);
      if (character === '*' && next === '/') {
        appendHidden(next);
        index += 1;
        state = 'code';
      }
      continue;
    }
    if (state === 'code' && (character === '"' || character === '`' || character === "'")) {
      state = character === '"' ? 'double' : character === '`' ? 'raw' : 'rune';
      if (preserveStrings) result += character;
      else appendHidden(character);
      continue;
    }
    if (state === 'double' || state === 'raw' || state === 'rune') {
      if (preserveStrings) result += character;
      else appendHidden(character);
      const closes =
        (state === 'double' && character === '"' && !isEscaped(index)) ||
        (state === 'raw' && character === '`') ||
        (state === 'rune' && character === "'" && !isEscaped(index));
      if (closes) state = 'code';
      continue;
    }
    result += character;
  }
  return result;
};

export const goCodeWithoutComments = (source: string): string => lexicalView(source, true);

export const goExecutableCode = (source: string): string => lexicalView(source, false);

export type GoImport = { path: string; qualifier: string };

const decodedGoString = (literal: string): string | undefined => {
  if (literal.startsWith('`') && literal.endsWith('`')) return literal.slice(1, -1);
  if (!literal.startsWith('"') || !literal.endsWith('"')) return undefined;
  try {
    const decoded = JSON.parse(literal) as unknown;
    return typeof decoded === 'string' ? decoded : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Imports from actual Go import declarations. Looking for every quoted module path also finds log
 * messages and constants, which can make an unreachable package look part of the built binary.
 */
export const goImports = (source: string): GoImport[] => {
  const code = goCodeWithoutComments(source);
  const imports: GoImport[] = [];
  const declarations =
    /(?:^|\n)\s*import\s+(?:\(([\s\S]*?)\)|((?:(?:\.|_|[A-Za-z_][A-Za-z0-9_]*)\s+)?(?:"(?:\\.|[^"\\])*"|`[^`]*`)))/g;
  for (const declaration of code.matchAll(declarations)) {
    const body = declaration[1] ?? declaration[2] ?? '';
    const entries =
      declaration[1] === undefined
        ? [body]
        : body
            .split(/[;\r\n]+/)
            .map((line) => line.trim())
            .filter((line) => line !== '');
    for (const entry of entries) {
      const match = /^(?:(\.|_|[A-Za-z_][A-Za-z0-9_]*)\s+)?("(?:\\.|[^"\\])*"|`[^`]*`)\s*$/.exec(entry);
      if (match === null) continue;
      const path = decodedGoString(match[2]!);
      if (path === undefined) continue;
      imports.push({ path, qualifier: match[1] ?? '' });
    }
  }
  return imports;
};

export const goHasMainFunction = (source: string): boolean => /^\s*func\s+main\s*\(/m.test(goExecutableCode(source));

const GOOS = new Set([
  'aix',
  'android',
  'darwin',
  'dragonfly',
  'freebsd',
  'hurd',
  'illumos',
  'ios',
  'js',
  'linux',
  'netbsd',
  'openbsd',
  'plan9',
  'solaris',
  'wasip1',
  'windows'
]);
const GOARCH = new Set([
  '386',
  'amd64',
  'arm',
  'arm64',
  'loong64',
  'mips',
  'mips64',
  'mips64le',
  'mipsle',
  'ppc64',
  'ppc64le',
  'riscv64',
  's390x',
  'wasm'
]);
const LINUX_AMD64_TAGS = new Set(['linux', 'unix', 'amd64', 'gc']);

const evaluateBuildExpression = (expression: string): boolean => {
  const tokens = expression.match(/&&|\|\||!|\(|\)|[A-Za-z0-9_.]+/g) ?? [];
  let cursor = 0;
  const valueOf = (tag: string): boolean => LINUX_AMD64_TAGS.has(tag) || /^go1\.\d+$/.test(tag);
  const primary = (): boolean => {
    const token = tokens[cursor++];
    if (token === '!') return !primary();
    if (token === '(') {
      const value = or();
      if (tokens[cursor] === ')') cursor += 1;
      return value;
    }
    return token === undefined ? false : valueOf(token);
  };
  const and = (): boolean => {
    let value = primary();
    while (tokens[cursor] === '&&') {
      cursor += 1;
      const right = primary();
      value = value && right;
    }
    return value;
  };
  const or = (): boolean => {
    let value = and();
    while (tokens[cursor] === '||') {
      cursor += 1;
      const right = and();
      value = value || right;
    }
    return value;
  };
  const result = or();
  return cursor === tokens.length && result;
};

/** Whether the Go buildpack's Linux/amd64 target includes this source file. */
export const goFileMatchesBuildTarget = (path: string, source: string): boolean => {
  const stem = path.split('/').at(-1)?.replace(/\.go$/, '') ?? '';
  const suffixes = stem.split('_');
  const last = suffixes.at(-1);
  const previous = suffixes.at(-2);
  // Go only treats the final `_GOOS`, `_GOARCH`, or `_GOOS_GOARCH` suffix as a
  // filename constraint. An OS-looking word in the package's ordinary basename is inert.
  const arch = last !== undefined && GOARCH.has(last) ? last : undefined;
  const os =
    arch !== undefined && previous !== undefined && GOOS.has(previous)
      ? previous
      : last !== undefined && GOOS.has(last)
        ? last
        : undefined;
  if ((os !== undefined && os !== 'linux') || (arch !== undefined && arch !== 'amd64')) return false;

  const prefix = source.slice(0, Math.max(0, source.search(/^\s*package\s+/m)));
  const modern = /^\s*\/\/go:build\s+(.+)$/m.exec(prefix)?.[1]?.trim();
  if (modern !== undefined) return evaluateBuildExpression(modern);
  const legacy = [...prefix.matchAll(/^\s*\/\/\s*\+build\s+(.+)$/gm)].map((match) => match[1]!.trim());
  return legacy.every((line) =>
    line
      .split(/\s+/)
      .filter(Boolean)
      .some((option) =>
        option
          .split(',')
          .every((tag) => (tag.startsWith('!') ? !LINUX_AMD64_TAGS.has(tag.slice(1)) : LINUX_AMD64_TAGS.has(tag)))
      )
  );
};

const goPathPattern = (pattern: string): RegExp | undefined => {
  let expression = '^';
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index]!;
    if (character === '*') {
      expression += '[^/]*';
      continue;
    }
    if (character === '?') {
      expression += '[^/]';
      continue;
    }
    if (character === '\\') {
      const escaped = pattern[++index];
      if (escaped === undefined) return undefined;
      expression += escaped.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      continue;
    }
    if (character === '[') {
      let end = index + 1;
      let escaped = false;
      for (; end < pattern.length; end += 1) {
        if (!escaped && pattern[end] === ']') break;
        escaped = !escaped && pattern[end] === '\\';
        if (pattern[end] !== '\\') escaped = false;
      }
      if (end >= pattern.length) return undefined;
      let body = pattern.slice(index + 1, end);
      if (body === '' || body === '^') return undefined;
      if (body.startsWith('^')) body = `^${body.slice(1)}`;
      expression += `(?=[^/])[${body}]`;
      index = end;
      continue;
    }
    expression += character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  try {
    return new RegExp(`${expression}$`);
  } catch {
    return undefined;
  }
};

/** Go's path.Match semantics used by go:embed: wildcards never cross a slash and [] is a class. */
export const goPathMatches = (pattern: string, path: string): boolean => goPathPattern(pattern)?.test(path) ?? false;
