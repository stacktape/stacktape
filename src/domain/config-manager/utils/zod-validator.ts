import type { z } from 'zod';
import { tuiManager } from '@application-services/tui-manager';
import { capitalizeFirstLetter } from '@shared/utils/misc';
import { getIsDirective } from '@utils/directives';
import { readFileSync } from 'fs-extra';
import get from 'lodash/get';
import yaml from 'yaml';
import { Scalar, YAMLMap, YAMLSeq } from 'yaml/types';
import { stacktapeConfigSchema } from '../../../../@generated/schemas/validate-config-zod';

type FormattedError = {
  path: string;
  message: string;
  hint?: string;
  resourceName?: string;
  section?: string;
  lineNumber?: number;
  lineNumbers?: number[]; // Multiple line numbers for errors spanning multiple lines (e.g., unrecognized_keys)
  actualValue?: unknown;
};

type ZodIssue = z.core.$ZodIssue;

type SourceMap = Map<string, { line: number; col: number }>;

// Levenshtein distance for "did you mean?" suggestions
const levenshteinDistance = (a: string, b: string): number => {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }
  }
  return matrix[b.length][a.length];
};

const findClosestMatch = (value: string, candidates: string[], maxDistance = 3): string | null => {
  if (!value || !candidates?.length) return null;
  const valueLower = String(value).toLowerCase();
  let closest: string | null = null;
  let minDistance = Infinity;

  for (const candidate of candidates) {
    const distance = levenshteinDistance(valueLower, candidate.toLowerCase());
    if (distance < minDistance && distance <= maxDistance) {
      minDistance = distance;
      closest = candidate;
    }
  }
  return closest;
};

// Build source map from YAML file for line numbers
const buildSourceMap = (configPath: string): SourceMap | null => {
  if (!configPath || configPath.endsWith('.ts') || configPath.endsWith('.js')) {
    return null; // TypeScript configs don't have line numbers we can map
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    const doc = yaml.parseDocument(content, { keepCstNodes: true });
    const sourceMap: SourceMap = new Map();

    const processNode = (node: any, path: string[] = []) => {
      if (!node) return;

      if (node.range) {
        const [start] = node.range;
        // Count newlines to get line number
        let line = 1;
        for (let i = 0; i < start && i < content.length; i++) {
          if (content[i] === '\n') line++;
        }
        sourceMap.set(path.join('.'), { line, col: 0 });
      }

      if (node instanceof YAMLMap) {
        for (const item of node.items) {
          const key = item.key instanceof Scalar ? String(item.key.value) : String(item.key);
          processNode(item.value, [...path, key]);
        }
      } else if (node instanceof YAMLSeq) {
        node.items.forEach((item: any, index: number) => {
          processNode(item, [...path, String(index)]);
        });
      }
    };

    processNode(doc.contents);
    return sourceMap;
  } catch {
    return null;
  }
};

type SnippetLine = { isHighlighted: boolean; lineNum: string; content: string };

// Get code snippet around line(s) - supports multiple highlighted lines
const getCodeSnippet = (configPath: string, lineNumbers: number | number[], contextLines = 2): SnippetLine[] | null => {
  if (!configPath || configPath.endsWith('.ts') || configPath.endsWith('.js')) {
    return null;
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    const lines = content.split('\n');

    // Normalize to array
    const highlightLines = Array.isArray(lineNumbers) ? lineNumbers : [lineNumbers];
    const highlightSet = new Set(highlightLines);

    // Calculate range to show (from first highlighted - context to last highlighted + context)
    const minLine = Math.min(...highlightLines);
    const maxLine = Math.max(...highlightLines);
    const startLine = Math.max(0, minLine - contextLines - 1);
    const endLine = Math.min(lines.length, maxLine + contextLines);

    const snippetLines: SnippetLine[] = [];
    const lineNumWidth = String(endLine).length;

    for (let i = startLine; i < endLine; i++) {
      const lineNum = String(i + 1).padStart(lineNumWidth, ' ');
      snippetLines.push({
        isHighlighted: highlightSet.has(i + 1),
        lineNum,
        content: lines[i]
      });
    }

    return snippetLines;
  } catch {
    return null;
  }
};

const formatZodIssuePath = (path: PropertyKey[]): string => {
  return path.map((p) => (typeof p === 'number' ? `[${p}]` : `.${String(p)}`)).join('');
};

const formatActualValue = (value: unknown): string => {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'object') {
    try {
      const str = JSON.stringify(value);
      return str.length > 50 ? `${str.slice(0, 47)}...` : str;
    } catch {
      return '[object]';
    }
  }
  return String(value);
};

// Known resource and script types for "did you mean?" suggestions
const RESOURCE_TYPES = [
  'multi-container-workload',
  'batch-job',
  'web-service',
  'private-service',
  'worker-service',
  'relational-database',
  'application-load-balancer',
  'network-load-balancer',
  'http-api-gateway',
  'bucket',
  'user-auth-pool',
  'event-bus',
  'bastion',
  'dynamo-db-table',
  'state-machine',
  'mongo-db-atlas-cluster',
  'redis-cluster',
  'custom-resource-instance',
  'custom-resource-definition',
  'upstash-redis',
  'deployment-script',
  'aws-cdk-construct',
  'sqs-queue',
  'sns-topic',
  'hosting-bucket',
  'web-app-firewall',
  'nextjs-web',
  'open-search-domain',
  'efs-filesystem',
  'function',
  'edge-lambda-function'
];

const SCRIPT_TYPES = ['local-script', 'bastion-script', 'local-script-with-bastion-tunneling'];

const formatZodIssue = (issue: ZodIssue, config: unknown, sourceMap: SourceMap | null): FormattedError => {
  const path = formatZodIssuePath(issue.path);
  const pathStr = issue.path.join('.');
  const actualValue = get(config, pathStr);
  let message = issue.message;
  let hint: string | undefined;

  // Enhance messages for common error types
  if (issue.code === 'invalid_type') {
    const expected = (issue as any).expected;
    let received = (issue as any).received ?? 'unknown';

    // If Zod reports "unknown", derive the actual JS type from the value
    if (received === 'unknown' && actualValue !== undefined) {
      if (Array.isArray(actualValue)) {
        received = 'array';
      } else if (actualValue === null) {
        received = 'null';
      } else {
        received = typeof actualValue; // 'string', 'number', 'boolean', 'object'
      }
    }

    // Handle missing required property (undefined value)
    if (actualValue === undefined || received === 'undefined') {
      message = `Required property is missing (expected ${tuiManager.makeBold(expected)})`;
    } else {
      message = `Expected ${tuiManager.makeBold(expected)}, received ${tuiManager.makeBold(received)} (${formatActualValue(actualValue)})`;
    }
  } else if (issue.code === 'invalid_union') {
    // Handle missing required union property
    if (actualValue === undefined) {
      message = `Required property is missing`;
    } else if ('note' in issue && issue.note === 'No matching discriminator') {
      // Discriminated union error - check if top-level resource/script
      const isTopLevelResourceType =
        issue.path[0] === 'resources' && issue.path.length === 3 && issue.path[2] === 'type';
      const isTopLevelScriptType = issue.path[0] === 'scripts' && issue.path.length === 3 && issue.path[2] === 'type';

      if (isTopLevelResourceType || isTopLevelScriptType) {
        const thingType = isTopLevelScriptType ? 'script' : 'resource';
        const validTypes = isTopLevelScriptType ? SCRIPT_TYPES : RESOURCE_TYPES;

        message = `Invalid ${thingType} type ${tuiManager.makeBold(formatActualValue(actualValue))}`;

        if (typeof actualValue === 'string') {
          const suggestion = findClosestMatch(actualValue, validTypes);
          if (suggestion) {
            hint = `Did you mean ${tuiManager.makeBold(`"${suggestion}"`)}?`;
          }
        }
      } else {
        message = `Invalid type ${tuiManager.makeBold(formatActualValue(actualValue))}`;
      }
    } else if ('errors' in issue && Array.isArray((issue as any).errors)) {
      // Regular union error - try to find the best matching union member
      // The matching member is the one that does NOT have a top-level type mismatch error
      const unionErrors = (issue as any).errors as Array<
        Array<{ code: string; path: PropertyKey[]; values?: string[] }>
      >;
      const configType =
        typeof actualValue === 'object' && actualValue !== null ? (actualValue as any).type : undefined;

      // Find the union member that doesn't have a type mismatch at root level
      const matchingMemberErrors = unionErrors.find((memberErrors) => {
        const hasTopLevelTypeMismatch = memberErrors.some(
          (err) => err.code === 'invalid_value' && err.path.length === 1 && err.path[0] === 'type'
        );
        return !hasTopLevelTypeMismatch;
      });

      if (matchingMemberErrors && matchingMemberErrors.length > 0) {
        // Found the matching member - show its specific errors
        const firstError = matchingMemberErrors[0] as any;
        if (firstError.code === 'invalid_union' && firstError.path) {
          // Nested union error (e.g., rules[0] has invalid type)
          const nestedPath = [...issue.path, ...firstError.path];
          const nestedValue = get(config, nestedPath.join('.'));
          const nestedType = typeof nestedValue === 'object' && nestedValue !== null ? nestedValue.type : undefined;

          if (nestedType) {
            // Extract valid types from the nested union errors
            const validTypes: string[] = [];
            if (firstError.errors) {
              for (const memberErrs of firstError.errors) {
                const typeErr = memberErrs.find(
                  (e: any) => e.code === 'invalid_value' && e.path.length === 1 && e.path[0] === 'type'
                );
                if (typeErr?.values?.[0]) {
                  validTypes.push(typeErr.values[0]);
                }
              }
            }

            message = `Invalid type ${tuiManager.makeBold(`"${nestedType}"`)} at ${tuiManager.prettyConfigProperty(formatZodIssuePath(nestedPath))}`;
            if (validTypes.length > 0) {
              const suggestion = findClosestMatch(nestedType, validTypes);
              if (suggestion) {
                hint = `Did you mean ${tuiManager.makeBold(`"${suggestion}"`)}? Valid types: ${validTypes.join(', ')}`;
              } else {
                hint = `Valid types: ${validTypes.join(', ')}`;
              }
            }
          } else {
            message = `Invalid configuration at ${tuiManager.prettyConfigProperty(formatZodIssuePath(nestedPath))}`;
          }
        } else if (firstError.code === 'invalid_value' && firstError.values) {
          // Invalid enum value error
          const errorPath = [...issue.path, ...firstError.path];
          const errorValue = get(config, errorPath.join('.'));
          const values = firstError.values as string[];
          message = `Invalid value ${tuiManager.makeBold(formatActualValue(errorValue))} at ${tuiManager.prettyConfigProperty(formatZodIssuePath(errorPath))}`;
          if (typeof errorValue === 'string') {
            const suggestion = findClosestMatch(errorValue, values);
            if (suggestion) {
              hint = `Did you mean ${tuiManager.makeBold(`"${suggestion}"`)}?`;
            }
          }
        } else if (firstError.code === 'invalid_type') {
          // Type mismatch or missing required property
          const errorPath = [...issue.path, ...firstError.path];
          const errorValue = get(config, errorPath.join('.'));
          if (errorValue === undefined) {
            message = `Required property ${tuiManager.prettyConfigProperty(formatZodIssuePath(errorPath))} is missing (expected ${tuiManager.makeBold(firstError.expected)})`;
          } else {
            message = `Expected ${tuiManager.makeBold(firstError.expected)}, received ${tuiManager.makeBold(firstError.received || typeof errorValue)} at ${tuiManager.prettyConfigProperty(formatZodIssuePath(errorPath))}`;
          }
        } else if (firstError.code === 'unrecognized_keys') {
          // Unknown property error
          const unknownKeys = firstError.keys as string[];
          const errorPath = [...issue.path, ...firstError.path];
          const formattedKeys = unknownKeys.map((k: string) => tuiManager.prettyConfigProperty(k)).join(', ');
          message = `Unknown ${unknownKeys.length === 1 ? 'property' : 'properties'} ${formattedKeys} at ${tuiManager.prettyConfigProperty(formatZodIssuePath(errorPath))}`;
        } else {
          // Other type of error
          const errorPath = [...issue.path, ...(firstError.path || [])];
          message = `Invalid configuration at ${tuiManager.prettyConfigProperty(formatZodIssuePath(errorPath))}`;
        }
      } else if (configType && typeof configType === 'string') {
        // No matching member found - the type itself is invalid
        const isTopLevelResource = issue.path[0] === 'resources' && issue.path.length === 2;
        const isTopLevelScript = issue.path[0] === 'scripts' && issue.path.length === 2;

        if (isTopLevelResource) {
          message = `Invalid resource type ${tuiManager.makeBold(`"${configType}"`)}`;
          const suggestion = findClosestMatch(configType, RESOURCE_TYPES);
          if (suggestion) {
            hint = `Did you mean ${tuiManager.makeBold(`"${suggestion}"`)}?`;
          }
        } else if (isTopLevelScript) {
          message = `Invalid script type ${tuiManager.makeBold(`"${configType}"`)}`;
          const suggestion = findClosestMatch(configType, SCRIPT_TYPES);
          if (suggestion) {
            hint = `Did you mean ${tuiManager.makeBold(`"${suggestion}"`)}?`;
          }
        } else {
          message = `Invalid type ${tuiManager.makeBold(`"${configType}"`)}`;
        }
      }
    }
  } else if (issue.code === 'invalid_value') {
    const values = 'values' in issue ? (issue as any).values : [];
    if (values?.length) {
      // Handle missing required property (undefined value)
      if (actualValue === undefined) {
        message = `Required property is missing. Expected one of: ${values
          .slice(0, 5)
          .map((v: string) => tuiManager.makeBold(`"${v}"`))
          .join(', ')}${values.length > 5 ? ', ...' : ''}`;
      } else {
        const actualStr = formatActualValue(actualValue);
        message = `Invalid value ${tuiManager.makeBold(actualStr)}`;

        // Try to find a close match for "did you mean?"
        if (typeof actualValue === 'string') {
          const suggestion = findClosestMatch(actualValue, values);
          if (suggestion) {
            hint = `Did you mean ${tuiManager.makeBold(`"${suggestion}"`)}?`;
          }
        }
      }
    }
  } else if (issue.code === 'unrecognized_keys') {
    const unknownKeys = issue.keys as string[];
    const formattedKeys = unknownKeys.map((k: string) => tuiManager.prettyConfigProperty(k)).join(', ');
    message = `Unknown ${unknownKeys.length === 1 ? 'property' : 'properties'}: ${formattedKeys}`;

    // For single unknown property, try to suggest
    if (unknownKeys.length === 1 && 'allowedKeys' in (issue as any)) {
      const allowed = (issue as any).allowedKeys as string[];
      const suggestion = findClosestMatch(unknownKeys[0], allowed);
      if (suggestion) {
        hint = `Did you mean ${tuiManager.prettyConfigProperty(suggestion)}?`;
      }
    }
  }

  // Extract resource/script name from path
  let resourceName: string | undefined;
  let section: string | undefined;
  const pathParts = issue.path;

  if (pathParts[0] === 'resources' && typeof pathParts[1] === 'string') {
    section = 'resources';
    resourceName = pathParts[1];
  } else if (pathParts[0] === 'scripts' && typeof pathParts[1] === 'string') {
    section = 'scripts';
    resourceName = pathParts[1];
  }

  // Get line number(s) from source map
  let lineNumber: number | undefined;
  let lineNumbers: number[] | undefined;

  if (sourceMap) {
    // For unrecognized_keys, find line numbers for ALL unknown keys
    if (issue.code === 'unrecognized_keys') {
      const unknownKeys = issue.keys as string[];
      const foundLines: number[] = [];
      for (const key of unknownKeys) {
        const keyPath = pathStr ? `${pathStr}.${key}` : key;
        const location = sourceMap.get(keyPath);
        if (location) {
          foundLines.push(location.line);
        }
      }
      if (foundLines.length > 0) {
        lineNumber = foundLines[0]; // First line for the "Line X" display
        lineNumbers = foundLines; // All lines for snippet highlighting
      }
    }
    // Fall back to the issue path if no unknown key found or not unrecognized_keys
    if (!lineNumber) {
      const location = sourceMap.get(pathStr);
      if (location) {
        lineNumber = location.line;
      }
    }
  }

  return { path, message, hint, resourceName, section, lineNumber, lineNumbers, actualValue };
};

const groupErrorsByResource = (errors: FormattedError[]): Map<string, FormattedError[]> => {
  const grouped = new Map<string, FormattedError[]>();

  for (const error of errors) {
    const key = error.resourceName ? `${error.section}:${error.resourceName}` : '_root';
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(error);
  }

  return grouped;
};

const formatErrorGroup = (key: string, errors: FormattedError[], configPath: string, showSnippets: boolean): string => {
  // Fixed indent for code snippets and hints
  const snippetIndent = '      ';
  const hintPrefix = `${snippetIndent}${tuiManager.colorize('cyan', 'Hint:')} `;

  // Format snippet with proper indentation - colorize each line separately to preserve spacing
  const formatSnippet = (snippetLines: SnippetLine[]): string => {
    return snippetLines
      .map(({ isHighlighted, lineNum, content }) => {
        // Highlighted: "> 14 |", Non-highlighted: "  14 |" - keeps | aligned
        if (isHighlighted) {
          // Extract comment if present
          const commentMatch = content.match(/^([^#]*)(#.*)$/);
          if (commentMatch) {
            const [, code, comment] = commentMatch;
            const lineText = `${lineNum} | ${code}`;
            return `${snippetIndent}${tuiManager.makeBold('> ')}${tuiManager.colorize('gray', lineText)}${tuiManager.makeBold(comment)}`;
          }
          const lineText = `${lineNum} | ${content}`;
          return `${snippetIndent}${tuiManager.makeBold('> ')}${tuiManager.colorize('gray', lineText)}`;
        }
        const lineText = `  ${lineNum} | ${content}`;
        return `${snippetIndent}${tuiManager.colorize('gray', lineText)}`;
      })
      .join('\n');
  };

  if (key === '_root') {
    return errors
      .map((e) => {
        const lineInfo = e.lineNumber ? `Line ${e.lineNumber}, ` : '';
        let errorLine = `• ${lineInfo}${tuiManager.prettyConfigProperty(e.path || '/')}: ${e.message}`;

        // Add hint if available
        if (e.hint) {
          errorLine += `\n${hintPrefix}${e.hint}`;
        }

        // Add code snippet if available - use lineNumbers array if available for multi-line highlighting
        if (showSnippets && e.lineNumber) {
          const snippet = getCodeSnippet(configPath, e.lineNumbers || e.lineNumber);
          if (snippet) {
            errorLine += `\n\n${formatSnippet(snippet)}`;
          }
        }
        return errorLine;
      })
      .join('\n');
  }

  const [section, name] = key.split(':');
  const sectionName = capitalizeFirstLetter(section.slice(0, -1)); // "resources" -> "Resource"

  const header = `${sectionName} ${tuiManager.prettyResourceName(name)} is invalid:`;

  const errorLines = errors.map((e) => {
    // Remove the resource prefix from path for cleaner output
    const shortPath = e.path.replace(new RegExp(`^\\.${section}\\.${name}`), '') || '/';
    const lineInfo = e.lineNumber ? `Line ${e.lineNumber}, ` : '';
    let errorLine = `• ${lineInfo}${tuiManager.prettyConfigProperty(shortPath)}: ${e.message}`;

    // Add hint if available
    if (e.hint) {
      errorLine += `\n${hintPrefix}${e.hint}`;
    }

    // Add code snippet if available and this is a YAML config - use lineNumbers array if available
    if (showSnippets && e.lineNumber) {
      const snippet = getCodeSnippet(configPath, e.lineNumbers || e.lineNumber);
      if (snippet) {
        errorLine += `\n\n${formatSnippet(snippet)}`;
      }
    }
    return errorLine;
  });

  return `${header}\n${errorLines.join('\n')}`;
};

export const validateConfigWithZod = ({
  config,
  configPath,
  templateId
}: {
  config: unknown;
  configPath: string;
  templateId?: string;
}): { valid: true } | { valid: false; errorMessage: string } => {
  const result = stacktapeConfigSchema.safeParse(config);

  if (result.success) {
    return { valid: true };
  }

  const zodError = result.error;

  // Filter out errors on directive values
  const filteredIssues = zodError.issues.filter((issue) => {
    const pathStr = issue.path.join('.');
    const value = get(config, pathStr);
    return !getIsDirective(value);
  });

  if (filteredIssues.length === 0) {
    return { valid: true };
  }

  // Build source map for YAML configs
  const isYamlConfig = configPath && !configPath.endsWith('.ts') && !configPath.endsWith('.js');
  const sourceMap = isYamlConfig ? buildSourceMap(configPath) : null;

  // Show snippets only for YAML configs and when there aren't too many errors
  const showSnippets = isYamlConfig && filteredIssues.length <= 5;

  // Format and group errors
  const formattedErrors = filteredIssues.map((issue) => formatZodIssue(issue, config, sourceMap));
  const groupedErrors = groupErrorsByResource(formattedErrors);

  // Build error message
  const configLocation = templateId
    ? `https://console.stacktape.com/template-editor?templateId=${templateId}`
    : tuiManager.prettyFilePath(configPath);

  const configType = isYamlConfig ? '' : ' (TypeScript)';
  const baseMessage = `Config${configType} at ${configLocation} is invalid.\n\n`;

  const errorSections: string[] = [];

  // Process root-level errors first
  const rootErrors = groupedErrors.get('_root');
  if (rootErrors?.length) {
    errorSections.push(formatErrorGroup('_root', rootErrors, configPath, showSnippets));
    groupedErrors.delete('_root');
  }

  // Process resource/script errors
  for (const [key, errors] of groupedErrors) {
    errorSections.push(formatErrorGroup(key, errors, configPath, showSnippets));
  }

  return {
    valid: false,
    errorMessage: `${baseMessage}${errorSections.join('\n\n')}`
  };
};

export { stacktapeConfigSchema };
