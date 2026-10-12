/** The property suffix accepted by the resolver's dot paths and numeric array indices. */
export const getDirectivePropertyPath = (suffix: string): string =>
  suffix.match(/^(?:\.[\w$-]+(?:\[\d+\])*)*/)?.[0] ?? '';

export const getEmbeddedDirectives = (
  value: string
): Array<{ definition: string; name: string; startPos: number; endPos: number }> => {
  const directives: Array<{ definition: string; name: string; startPos: number; endPos: number }> = [];

  const tryParseDirectiveAt = (
    str: string,
    startPos: number
  ): { definition: string; name: string; endPos: number } | null => {
    if (str[startPos] !== '$') {
      return null;
    }

    let idx = startPos + 1;
    const firstNameChar = str[idx];
    if (!firstNameChar || !firstNameChar.match(/[A-Z_$]/i)) {
      return null;
    }

    while (str[idx]?.match(/[\w$]/)) {
      idx++;
    }

    const name = str.slice(startPos + 1, idx);

    if (str[idx] !== '(') {
      return null;
    }

    let depth = 0;
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let closingParenPos = -1;

    for (let i = idx; i < str.length; i++) {
      const char = str[i];
      let backslashes = 0;
      for (let cursor = i - 1; cursor >= 0 && str[cursor] === '\\'; cursor--) backslashes++;
      const escaped = backslashes % 2 === 1;

      if (char === "'" && !escaped && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote;
      } else if (char === '"' && !escaped && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
      }

      if (!inSingleQuote && !inDoubleQuote) {
        if (char === '(') {
          depth++;
        } else if (char === ')') {
          depth--;
          if (depth === 0) {
            closingParenPos = i;
            break;
          }
        }
      }
    }

    if (closingParenPos === -1) {
      return null;
    }

    const endPos = closingParenPos + 1 + getDirectivePropertyPath(str.slice(closingParenPos + 1)).length;

    return {
      definition: str.slice(startPos, endPos),
      name,
      endPos
    };
  };

  let idx = 0;
  while (idx < value.length) {
    if (value[idx] === '$') {
      const parsed = tryParseDirectiveAt(value, idx);
      if (parsed) {
        directives.push({ definition: parsed.definition, name: parsed.name, startPos: idx, endPos: parsed.endPos });
        idx = parsed.endPos;
        continue;
      }
    }
    idx++;
  }

  return directives;
};

/** Whether the entire value is one directive, optionally followed by a property path. */
export const isDirectiveExpression = (value: string): boolean => {
  const directives = getEmbeddedDirectives(value);
  const directive = directives[0];
  return directives.length === 1 && directive?.startPos === 0 && directive.endPos === value.length;
};
