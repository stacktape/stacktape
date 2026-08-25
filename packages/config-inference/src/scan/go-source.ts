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
