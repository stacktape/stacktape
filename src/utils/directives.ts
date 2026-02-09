import { isAlphanumeric } from '@shared/utils/misc';

export const startsLikeDirective = (str: string) => {
  return /^\$(.*)\(/.test(str);
};

export const startsLikeDirectiveNotUsableInSub = (str: string) => {
  return str.startsWith('$CfFormat');
};

export const startsLikeGetParamDirective = (str: string) => {
  return str.startsWith('$ResourceParam');
};

export const getIsDirective = (node: any) => {
  if (typeof node !== 'string') {
    return false;
  }

  if (!startsLikeDirective(node)) {
    return false;
  }
  if (!node.includes(')')) {
    return false;
  }
  const firstPathCharacter = node[node.lastIndexOf(')') + 1];
  if (firstPathCharacter !== undefined && firstPathCharacter !== '.') {
    return false;
  }
  // const directivePathToProp = getDirectivePathToProp(node);
  // @todo
  // if (directivePathToProp.length && !directivePathToProp.join('').match(/^[$A-Z_][0-9A-Z_$]*\$/i)) {
  //   console.log('node', node);
  //   return false;
  // }
  return true;
};

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
  const directivePattern = /\$([A-Z_][\w$]*)\(/gi;
  const matches = value.matchAll(directivePattern);
  const names = Array.from(matches, (match) => match[1]);
  return Array.from(new Set(names));
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
    const prevChar = i > 0 ? str[i - 1] : '';

    // Handle quote state (ignore escaped quotes)
    if (char === "'" && prevChar !== '\\' && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
    } else if (char === '"' && prevChar !== '\\' && !inSingleQuote) {
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
      const prevChar = i > 0 ? trimmed[i - 1] : '';

      if (char === "'" && prevChar !== '\\' && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote;
      } else if (char === '"' && prevChar !== '\\' && !inSingleQuote) {
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
    return { value: trimmed.substring(1, trimmed.length - 1) };
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
    const prevChar = i > 0 ? str[i - 1] : '';

    if (char === "'" && prevChar !== '\\' && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
    } else if (char === '"' && prevChar !== '\\' && !inSingleQuote) {
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
