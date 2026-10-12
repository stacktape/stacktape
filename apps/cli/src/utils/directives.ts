import { isDirectiveExpression } from '@stacktape/config-authoring/directive-expressions';
import { isAlphanumeric } from '@utils/misc';

// A quote after an even run of backslashes closes the string; an odd run escapes it.
const isEscapedCharacter = (input: string, index: number) => {
  let backslashes = 0;
  for (let cursor = index - 1; cursor >= 0 && input[cursor] === '\\'; cursor--) backslashes++;
  return backslashes % 2 === 1;
};

export const startsLikeDirective = (str: string) => {
  return /^\$(.*)\(/.test(str);
};

export const startsLikeDirectiveNotUsableInSub = (str: string) => {
  return str.startsWith('$CfFormat');
};

export const startsLikeGetParamDirective = (str: string) => {
  return str.startsWith('$ResourceParam');
};

export const getIsDirective = (node: unknown): boolean => typeof node === 'string' && isDirectiveExpression(node);

export const getDirectivePathToProp = (rawDirective: string): string[] => {
  const parts = rawDirective.split(')');
  if (parts[parts.length - 1]) {
    return parts[parts.length - 1].split('.').slice(1);
  }
  return [];
};

export const getDirectiveWithoutPath = (rawDirective: string): string => {
  return rawDirective.slice(0, rawDirective.lastIndexOf(')') + 1);
};

export const getDirectiveName = (str: string) => {
  return str.match(/(?<=\$)(.*?)(?=\()/)[0];
};

export const getEmbeddedDirectiveNames = (value: string): string[] => {
  if (getIsDirective(value)) {
    return [];
  }
  const names = getEmbeddedDirectives(value).map(({ name }) => name);
  return Array.from(new Set(names));
};

export const getEmbeddedDirectives = (value: string): Array<{ definition: string; name: string }> => {
  if (getIsDirective(value)) {
    return [];
  }

  const directives: Array<{ definition: string; name: string }> = [];

  const tryParseDirectiveAt = (
    str: string,
    startPos: number
  ): { definition: string; name: string; endPos: number } | null => {
    if (str[startPos] !== '$') {
      return null;
    }

    let idx = startPos + 1;
    const firstNameChar = str[idx];
    if (!firstNameChar || !firstNameChar.match(/[A-Z_]/i)) {
      return null;
    }

    while (idx < str.length && str[idx].match(/[\w$]/)) {
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
      const escaped = (char === "'" || char === '"') && isEscapedCharacter(str, i);

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

    let endPos = closingParenPos + 1;
    if (str[endPos] === '.') {
      endPos++;
      while (endPos < str.length && str[endPos].match(/[\w$\.]/)) {
        endPos++;
      }
    }

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
        directives.push({ definition: parsed.definition, name: parsed.name });
        idx = parsed.endPos;
        continue;
      }
    }
    idx++;
  }

  return directives;
};

const escapeForSingleQuotedDirectiveParam = (value: string) => {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');
};

export const rewriteEmbeddedDirectivesToCfFormat = (
  value: string,
  directiveNamesToRewrite?: string[]
): string | null => {
  if (getIsDirective(value)) {
    return null;
  }

  const embeddedDirectives = getEmbeddedDirectives(value).filter(
    ({ name }) => !directiveNamesToRewrite || directiveNamesToRewrite.includes(name)
  );
  if (embeddedDirectives.length === 0) {
    return null;
  }

  let interpolatedString = value;
  embeddedDirectives.forEach(({ definition }) => {
    interpolatedString = interpolatedString.replace(definition, '{}');
  });

  const escapedInterpolatedString = escapeForSingleQuotedDirectiveParam(interpolatedString);
  return `$CfFormat('${escapedInterpolatedString}', ${embeddedDirectives.map(({ definition }) => definition).join(', ')})`;
};

export type DirectiveParam = { name?: string; isDirective?: true; definition?: string; value: any };

/**
 * Finds the next parameter or closing parenthesis at the current depth level.
 * Properly handles nested parentheses and quoted strings.
 */
const findNextDelimiter = (
  str: string,
  startPos: number = 0
): { pos: number; char: ',' | ')' | null; endPos: number } => {
  let depth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let i = startPos;

  while (i < str.length) {
    const char = str[i];
    const escaped = (char === "'" || char === '"') && isEscapedCharacter(str, i);

    // Handle quote state (ignore escaped quotes)
    if (char === "'" && !escaped && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
    } else if (char === '"' && !escaped && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
    }

    // Only process delimiters if we're not inside quotes
    if (!inSingleQuote && !inDoubleQuote) {
      if (char === '(') {
        depth++;
      } else if (char === ')') {
        if (depth === 0) {
          // Found closing paren at our level
          return { pos: i, char: ')', endPos: i + 1 };
        }
        depth--;
      } else if (char === ',' && depth === 0) {
        // Found comma at our level
        return { pos: i, char: ',', endPos: i + 1 };
      }
    }

    i++;
  }

  return { pos: str.length, char: null, endPos: str.length };
};

/**
 * Parses a single parameter value (literal or directive).
 */
const parseParamValue = (param: string): DirectiveParam | null => {
  const trimmed = param.trim();

  if (trimmed === '') {
    return null;
  }

  // Check if it's a directive
  if (startsLikeDirective(trimmed)) {
    const name = getDirectiveName(trimmed);

    // Find the closing parenthesis for this directive
    const directiveStart = trimmed.indexOf('(');
    let depth = 0;
    let closingParenPos = -1;
    let inSingleQuote = false;
    let inDoubleQuote = false;

    for (let i = directiveStart; i < trimmed.length; i++) {
      const char = trimmed[i];
      const escaped = (char === "'" || char === '"') && isEscapedCharacter(trimmed, i);

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
      throw new Error(`Cannot parse directive $${name}: Missing closing parenthesis in: ${trimmed.slice(0, 100)}...`);
    }

    // Extract path after the directive (e.g., .property.path)
    let pathEnd = closingParenPos + 1;
    if (trimmed[pathEnd] === '.') {
      while (
        pathEnd < trimmed.length &&
        (trimmed[pathEnd] === '.' || trimmed[pathEnd] === '_' || isAlphanumeric(trimmed[pathEnd]))
      ) {
        pathEnd++;
      }
    }

    return {
      isDirective: true,
      definition: trimmed.slice(0, pathEnd),
      name,
      value: null
    };
  }

  // Parse literal values
  if (trimmed === 'true') {
    return { value: true };
  }
  if (trimmed === 'false') {
    return { value: false };
  }
  if (trimmed !== '' && !Number.isNaN(Number(trimmed))) {
    return { value: Number(trimmed) };
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return { value: trimmed.substring(1, trimmed.length - 1) };
  }
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return { value: JSON.parse(trimmed) };
    } catch {
      // Keep accepting historical quoted values with literal, non-JSON escapes.
      return { value: trimmed.substring(1, trimmed.length - 1) };
    }
  }

  // If we can't parse it, return it as-is (might be an identifier or other value)
  return { value: trimmed };
};

export const getDirectiveParams = (directiveName: string, str: string): DirectiveParam[] => {
  // Extract the parameters string (everything between the outermost parentheses)
  const directivePrefix = `$${directiveName}(`;
  const startIdx = str.indexOf(directivePrefix);

  if (startIdx === -1) {
    throw new Error(`Cannot find directive $${directiveName} in: ${str.slice(0, 100)}...`);
  }

  // Find the matching closing parenthesis
  let depth = 0;
  let closingIdx = -1;
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let i = startIdx + directivePrefix.length - 1; i < str.length; i++) {
    const char = str[i];
    const escaped = (char === "'" || char === '"') && isEscapedCharacter(str, i);

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
          closingIdx = i;
          break;
        }
      }
    }
  }

  if (closingIdx === -1) {
    throw new Error(
      `Cannot parse directive $${directiveName}: Missing closing parenthesis in: ${str.slice(0, 100)}...`
    );
  }

  const paramsString = str.slice(startIdx + directivePrefix.length, closingIdx).trim();

  if (paramsString === '') {
    return [];
  }

  const result: DirectiveParam[] = [];
  let currentPos = 0;

  while (currentPos < paramsString.length) {
    // Skip whitespace
    while (currentPos < paramsString.length && /\s/.test(paramsString[currentPos])) {
      currentPos++;
    }

    if (currentPos >= paramsString.length) {
      break;
    }

    // Find the next delimiter (comma or end of params)
    const delimiter = findNextDelimiter(paramsString, currentPos);
    const paramStr = paramsString.slice(currentPos, delimiter.pos);

    const parsed = parseParamValue(paramStr);
    if (parsed !== null) {
      result.push(parsed);
    }

    currentPos = delimiter.endPos;
  }

  return result;
};

export const getIsValidDirectiveName = (directiveName: string) => /^[$A-Z_][\w$]*$/i.test(directiveName);
