import type { z } from 'zod';
import { tuiManager } from '@application-services/tui-manager';
import { capitalizeFirstLetter } from '@shared/utils/misc';
import { getIsDirective } from '@utils/directives';
import get from 'lodash/get';
import yaml from 'yaml';
import { YAMLMap, YAMLSeq, Scalar } from 'yaml/types';
import { readFileSync } from 'fs-extra';

// Import the generated Zod schema
import { stacktapeConfigSchema } from '../../../../@generated/schemas/validate-config-zod';

type FormattedError = {
  path: string;
  message: string;
  hint?: string;
  resourceName?: string;
  section?: string;
  lineNumber?: number;
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

// Get code snippet around a line
const getCodeSnippet = (configPath: string, lineNumber: number, contextLines = 2): SnippetLine[] | null => {
  if (!configPath || configPath.endsWith('.ts') || configPath.endsWith('.js')) {
    return null;
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    const lines = content.split('\n');
    const startLine = Math.max(0, lineNumber - contextLines - 1);
    const endLine = Math.min(lines.length, lineNumber + contextLines);
    const snippetLines: SnippetLine[] = [];
    const lineNumWidth = String(endLine).length;

    for (let i = startLine; i < endLine; i++) {
      const lineNum = String(i + 1).padStart(lineNumWidth, ' ');
      snippetLines.push({
        isHighlighted: i + 1 === lineNumber,
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
    const received = (issue as any).received ?? 'unknown';

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
      // Determine what kind of thing we're validating from the path
      const section = issue.path[0];
      const isScript = section === 'scripts';
      const thingType = isScript ? 'script' : 'resource';
      const validTypes = isScript ? SCRIPT_TYPES : RESOURCE_TYPES;

      message = `Invalid ${thingType} type ${tuiManager.makeBold(formatActualValue(actualValue))}`;

      // Try to find a close match for "did you mean?"
      if (typeof actualValue === 'string') {
        const suggestion = findClosestMatch(actualValue, validTypes);
        if (suggestion) {
          hint = `Did you mean ${tuiManager.makeBold(`"${suggestion}"`)}?`;
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

  // Get line number from source map
  let lineNumber: number | undefined;
  if (sourceMap) {
    const location = sourceMap.get(pathStr);
    if (location) {
      lineNumber = location.line;
    }
  }

  return { path, message, hint, resourceName, section, lineNumber, actualValue };
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
        const marker = isHighlighted ? tuiManager.makeBold('>') : ' ';
        const lineText = `${lineNum} | ${content}`;
        return `${snippetIndent}${marker} ${tuiManager.colorize('gray', lineText)}`;
      })
      .join('\n');
  };

  if (key === '_root') {
    return errors
      .map((e) => {
        const lineInfo = e.lineNumber ? `Line ${e.lineNumber}, ` : '';
        let errorLine = `  - ${lineInfo}${tuiManager.prettyConfigProperty(e.path || '/')}: ${e.message}`;

        // Add hint if available
        if (e.hint) {
          errorLine += `\n${hintPrefix}${e.hint}`;
        }

        // Add code snippet if available
        if (showSnippets && e.lineNumber) {
          const snippet = getCodeSnippet(configPath, e.lineNumber);
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
    let errorLine = `  - ${lineInfo}${tuiManager.prettyConfigProperty(shortPath)}: ${e.message}`;

    // Add hint if available
    if (e.hint) {
      errorLine += `\n${hintPrefix}${e.hint}`;
    }

    // Add code snippet if available and this is a YAML config
    if (showSnippets && e.lineNumber) {
      const snippet = getCodeSnippet(configPath, e.lineNumber);
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
