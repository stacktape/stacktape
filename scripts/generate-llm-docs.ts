import { basename, dirname, join, relative } from 'node:path';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { emptyDir, ensureDir, readFile, readdir, writeFile } from 'fs-extra';
import ts from 'typescript';
import { LLM_DOCS_FOLDER_PATH } from '@shared/naming/project-fs-paths';
import { generateCommandSchemaInfo } from '../src/config/cli/utils';
import {
  buildApiReferenceData,
  type ApiReferenceGeneratedDefinition
} from '../docs/src/utils/build-api-reference-data';
import {
  LEXICAL_INDEX_FILE_NAME,
  buildIndexFromChunks,
  serializeLexicalIndex
} from '../src/commands/mcp/lexical-index';

type DocKind = 'docs-page' | 'config-reference';

type LlmDocPage = {
  id: string;
  title: string;
  route: string;
  sourcePath: string;
  outputPath: string;
  docKind: DocKind;
  resourceType?: string;
  definitionNames: string[];
  tags: string[];
  content: string;
};

type LlmDocChunk = {
  id: string;
  pageId: string;
  title: string;
  route: string;
  sourcePath: string;
  headingPath: string[];
  docKind: DocKind;
  resourceType?: string;
  definitionNames: string[];
  tags: string[];
  content: string;
};

type ManifestEntry = Omit<LlmDocPage, 'content'> & {
  chunks: string[];
};

const DOCS_SOURCE_DIR = join(process.cwd(), 'docs', 'docs');
const TYPES_DIR = join(process.cwd(), 'types', 'stacktape-config');
const DIST_DIR = LLM_DOCS_FOLDER_PATH;
const ENHANCED_CONFIG_SCHEMA_PATH = join(process.cwd(), '@generated', 'schemas', 'enhanced-config-schema.json');
const RESOURCES_JSON_PATH = join(process.cwd(), 'docs', '.resources.json');

const normalizePath = (filePath: string): string => filePath.replace(/\\/g, '/');

const relativeSourcePath = (filePath: string): string => normalizePath(relative(process.cwd(), filePath));

const enhancedConfigSchema = JSON.parse(readFileSync(ENHANCED_CONFIG_SCHEMA_PATH, 'utf-8')) as {
  definitions: Record<string, unknown>;
};
const apiReferenceData = buildApiReferenceData(enhancedConfigSchema);
const resources = JSON.parse(readFileSync(RESOURCES_JSON_PATH, 'utf-8')) as any[];

const FILENAME_TO_RESOURCE_TYPE: Record<string, string> = {
  functions: 'function',
  'web-services': 'web-service',
  'worker-services': 'worker-service',
  'private-services': 'private-service',
  'batch-jobs': 'batch-job',
  'multi-container-workloads': 'multi-container-workload',
  'nextjs-web': 'nextjs-web',
  'astro-web': 'astro-web',
  'nuxt-web': 'nuxt-web',
  'sveltekit-web': 'sveltekit-web',
  'solidstart-web': 'solidstart-web',
  'tanstack-web': 'tanstack-web',
  'remix-web': 'remix-web',
  'relational-databases': 'relational-database',
  'dynamo-db-tables': 'dynamo-db-table',
  'redis-cluster': 'redis-cluster',
  buckets: 'bucket',
  'hosting-buckets': 'hosting-bucket',
  'http-api-gateways': 'http-api-gateway',
  'application-load-balancers': 'application-load-balancer',
  'network-load-balancer': 'network-load-balancer',
  cdn: 'cdn',
  'user-pools': 'user-auth-pool',
  'event-buses': 'event-bus',
  'sns-topic': 'sns-topic',
  'sqs-queues': 'sqs-queue',
  'state-machines': 'state-machine',
  'efs-filesystem': 'efs-filesystem',
  bastion: 'bastion',
  'web-app-firewall': 'web-app-firewall',
  'mongo-db-atlas-clusters': 'mongo-db-atlas-cluster',
  'upstash-redis': 'upstash-redis',
  'open-search': 'open-search-domain',
  'custom-resources': 'custom-resource',
  'deployment-script': 'deployment-script',
  'aws-cdk-construct': 'aws-cdk-construct',
  'kinesis-streams': 'kinesis-stream',
  'edge-lambda-functions': 'edge-lambda-function',
  _root: 'stacktape-config'
};

const RESOURCE_TYPE_BY_DOC_BASENAME: Record<string, string> = {
  'lambda-function': 'function',
  'web-service': 'web-service',
  'worker-service': 'worker-service',
  'private-service': 'private-service',
  'batch-job': 'batch-job',
  'multi-container-workload': 'multi-container-workload',
  'edge-function': 'edge-lambda-function',
  nextjs: 'nextjs-web',
  astro: 'astro-web',
  nuxt: 'nuxt-web',
  sveltekit: 'sveltekit-web',
  solidstart: 'solidstart-web',
  'tanstack-start': 'tanstack-web',
  remix: 'remix-web',
  'static-hosting': 'hosting-bucket',
  'relational-database': 'relational-database',
  dynamodb: 'dynamo-db-table',
  redis: 'redis-cluster',
  mongodb: 'mongo-db-atlas-cluster',
  opensearch: 'open-search-domain',
  'upstash-redis': 'upstash-redis',
  's3-bucket': 'bucket',
  'efs-filesystem': 'efs-filesystem',
  'http-api-gateway': 'http-api-gateway',
  'application-load-balancer': 'application-load-balancer',
  'network-load-balancer': 'network-load-balancer',
  cdn: 'cdn',
  'event-bus': 'event-bus',
  'kinesis-stream': 'kinesis-stream',
  'sns-topic': 'sns-topic',
  'sqs-queue': 'sqs-queue',
  'state-machine': 'state-machine',
  'web-application-firewall': 'web-app-firewall',
  'user-auth-pool': 'user-auth-pool',
  'bastion-host': 'bastion',
  'deployment-scripts': 'deployment-script',
  'aws-cdk-constructs': 'aws-cdk-construct',
  'custom-resources': 'custom-resource'
};

const REFERENCEABLE_PARAM_TYPE_BY_RESOURCE_TYPE: Record<string, string> = {
  'agentcore-gateway': 'AgentCoreGatewayReferencableParam'
};

const log = (message: string) => {
  // Keep this script usable in CI and local runs without pulling in app logging.
  console.info(`[llm-docs] ${message}`);
};

const listFiles = async (dir: string, predicate: (path: string) => boolean): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(dir, entry.name);
      if (entry.isDirectory()) return listFiles(entryPath, predicate);
      return predicate(entryPath) ? [entryPath] : [];
    })
  );
  return files.flat().sort((a, b) => a.localeCompare(b));
};

const parseFrontmatter = (raw: string): { frontmatter: Record<string, string>; body: string } => {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { frontmatter: {}, body: raw };

  const frontmatter: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const fieldMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!fieldMatch) continue;
    frontmatter[fieldMatch[1]] = fieldMatch[2].replace(/^['"]|['"]$/g, '').trim();
  }

  return { frontmatter, body: raw.slice(match[0].length) };
};

const routeFromDocPath = (filePath: string): string => {
  const rel = relative(DOCS_SOURCE_DIR, filePath).replace(/\.mdx$/, '');
  if (rel === 'index') return '/';
  return `/${rel.replace(/\/index$/, '').replaceAll('\\', '/')}`;
};

const outputPathFromRoute = (route: string): string => {
  const normalized = route === '/' ? 'index' : route.replace(/^\//, '');
  return `pages/${normalized}.md`;
};

const stripHtml = (value = ''): string =>
  value
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<\/p>\s*<p>/g, '\n\n')
    .replace(/<\/?p>/g, '')
    .replace(/<code>([\s\S]*?)<\/code>/g, '`$1`')
    .replace(/<strong>([\s\S]*?)<\/strong>/g, '**$1**')
    .replace(/<em>([\s\S]*?)<\/em>/g, '*$1*')
    .replace(/<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g, '[$2]($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/^[ \t]+$/gm, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const escapeMarkdownTableCell = (value: unknown): string =>
  String(value ?? '')
    .replaceAll('\\', '\\\\')
    .replaceAll('|', '\\|')
    .replace(/\s*\r?\n+\s*/g, ' ')
    .trim();

const typeInfoToMarkdown = (typeInfo: any): string => {
  if (!typeInfo) return 'unknown';
  if (typeInfo.kind === 'primitive') {
    const base = typeInfo.types?.join(' | ') || 'primitive';
    if (typeInfo.constValue !== undefined) return `${base} = ${JSON.stringify(typeInfo.constValue)}`;
    if (typeInfo.enumValues?.length) {
      return `${base}: ${typeInfo.enumValues.map((v: string | number) => JSON.stringify(v)).join(' | ')}`;
    }
    return base;
  }
  if (typeInfo.kind === 'reference') return typeInfo.typeName;
  if (typeInfo.kind === 'array') return `Array<${typeInfoToMarkdown(typeInfo.itemType)}>`;
  if (typeInfo.kind === 'union') {
    return (
      typeInfo.branches
        ?.map((branch: any) => branch.label || branch.typeName)
        .filter(Boolean)
        .join(' | ') || 'union'
    );
  }
  return 'unknown';
};

// Strip authoring-only focus markers (# stp-focus / // stp-focus, standalone or trailing) and unescape
// the comment-safe `*\/` from raw type-file content shown in the LLM docs.
const stripExampleNoise = (text: string): string =>
  text
    .replace(/^[ \t]*\*?[ \t]*(?:#|\/\/)[ \t]*stp-(?:end-)?focus[ \t]*\r?\n/gm, '')
    .replace(/[ \t]*(?:#|\/\/)[ \t]*stp-(?:end-)?focus[ \t]*$/gm, '')
    .replace(/^[ \t]*(?:#|\/\/)[ \t]*\[!code focus-(?:start|end)\][ \t]*\r?\n/gm, '')
    .replace(/[ \t]*(?:#|\/\/)[ \t]*\[!code focus(?:-start|-end)?\][ \t]*$/gm, '')
    .replaceAll('*\\/', '*/');

type DefinitionSourceLocation = {
  sourcePath: string;
  route: string;
  outputGroup: string;
  resourceType?: string;
};

const buildDefinitionSourceLocations = (): Map<string, DefinitionSourceLocation> => {
  const locations = new Map<string, DefinitionSourceLocation>();
  if (!existsSync(TYPES_DIR)) return locations;

  for (const file of readdirSync(TYPES_DIR)
    .filter((name) => name.endsWith('.d.ts'))
    .sort()) {
    const filePath = join(TYPES_DIR, file);
    const stem = basename(file, '.d.ts');
    const resourceType = FILENAME_TO_RESOURCE_TYPE[stem];
    const outputGroup = resourceType || stem.replace(/^_+/, '') || 'shared';
    const sourceFile = ts.createSourceFile(file, readFileSync(filePath, 'utf-8'), ts.ScriptTarget.Latest, false);
    for (const statement of sourceFile.statements) {
      if (!ts.isInterfaceDeclaration(statement) && !ts.isTypeAliasDeclaration(statement)) continue;
      const definitionName = statement.name.text;
      if (!locations.has(definitionName)) {
        locations.set(definitionName, {
          sourcePath: relativeSourcePath(filePath),
          route: `/config-reference/${outputGroup}`,
          outputGroup,
          resourceType
        });
      }
    }
  }
  return locations;
};

const definitionSourceLocations = buildDefinitionSourceLocations();

const cleanGeneratedTypeDeclaration = (declaration: string): string =>
  declaration.replaceAll('// [!code focus-start]\n', '').replaceAll('// [!code focus-end]', '').trim();

const apiReferenceSummaryToMarkdown = (definitionName: string): string => {
  const definition = apiReferenceData[definitionName];
  if (!definition) throw new Error(`API reference definition "${definitionName}" was not found`);
  const location = definitionSourceLocations.get(definitionName);
  const lines = [`\n\n### Definition: \`${definitionName}\``, ''];
  if (definition.shortDescription) lines.push(stripHtml(definition.shortDescription), '');
  lines.push(
    `The complete property-level reference is included in \`llms-api-reference.txt\` and indexed under route \`${location?.route || '/config-reference/shared'}\` with definition name \`${definitionName}\`.`,
    '',
    '| Property | Required | Type | Default |',
    '| --- | --- | --- | --- |'
  );
  for (const property of definition.properties) {
    lines.push(
      `| \`${escapeMarkdownTableCell(property.name)}\` | ${property.required ? 'yes' : 'no'} | \`${escapeMarkdownTableCell(typeInfoToMarkdown(property.typeInfo))}\` | ${property.defaultValue !== undefined ? `\`${escapeMarkdownTableCell(property.defaultValue)}\`` : '-'} |`
    );
  }
  return `${lines.join('\n')}\n\n`;
};

const renderUnionDetails = (property: ApiReferenceGeneratedDefinition['properties'][number]): string[] => {
  const typeInfo = property.typeInfo.kind === 'array' ? property.typeInfo.itemType : property.typeInfo;
  if (typeInfo.kind !== 'union') return [];
  const lines = ['', 'Choices:'];
  for (const branch of typeInfo.branches) {
    const label = branch.typeName ? `\`${branch.label}\` (\`${branch.typeName}\`)` : `\`${branch.label}\``;
    const description = stripHtml(branch.shortDescription);
    const branchProperties = branch.properties
      .map((item) => `\`${item.name}${item.required ? '' : '?'}: ${typeInfoToMarkdown(item.typeInfo)}\``)
      .join(', ');
    lines.push(
      `- ${label}${description ? ` — ${description}` : ''}${branchProperties ? `. Properties: ${branchProperties}.` : ''}`
    );
  }
  return lines;
};

const apiReferenceDefinitionToMarkdown = (definitionName: string): string => {
  const definition = apiReferenceData[definitionName];
  if (!definition) throw new Error(`API reference definition "${definitionName}" was not found`);
  const location = definitionSourceLocations.get(definitionName);
  const lines = [`# ${definitionName} API Reference`, ''];
  if (definition.shortDescription) lines.push(stripHtml(definition.shortDescription), '');
  if (location?.resourceType) lines.push(`Resource type: \`${location.resourceType}\``, '');
  lines.push(
    '## TypeScript definition',
    '',
    '```typescript',
    cleanGeneratedTypeDeclaration(definition.typeDeclaration),
    '```'
  );

  for (const property of definition.properties) {
    lines.push('', `## Property: \`${property.name}\``, '');
    lines.push(`- Required: ${property.required ? 'yes' : 'no'}`);
    lines.push(`- Type: \`${typeInfoToMarkdown(property.typeInfo)}\``);
    if (property.defaultValue !== undefined) lines.push(`- Default: \`${property.defaultValue}\``);
    if (property.inheritedFrom) lines.push(`- Inherited from: \`${property.inheritedFrom}\``);
    const description = [stripHtml(property.shortDescription), stripHtml(property.longDescription)]
      .filter(Boolean)
      .join('\n\n');
    if (description) lines.push('', description);
    lines.push(...renderUnionDetails(property));
    for (const [index, example] of (property.examples || []).entries()) {
      lines.push(
        '',
        `### Example ${index + 1}${example.lang ? ` (${example.lang})` : ''}`,
        '',
        `\`\`\`${example.lang || 'text'}`,
        stripExampleNoise(example.code).trim(),
        '```'
      );
    }
  }
  return `${lines.join('\n')}\n`;
};

const referenceableParamsToMarkdown = (resourceType: string): string => {
  const resource = (resources as any[]).find((item) => item.resourceType === resourceType);
  const referenceableParams = resource?.referenceableParams || referenceableParamsFromTypeDeclaration(resourceType);
  if (!referenceableParams) {
    throw new Error(`Referenceable params for "${resourceType}" were not found`);
  }

  const lines = [`\n\n## Referenceable Parameters: \`${resourceType}\``];
  lines.push(
    'These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.',
    '',
    '| Parameter | Description | Usage |',
    '| --- | --- | --- |'
  );
  for (const [paramName, description] of Object.entries(referenceableParams)) {
    if (paramName === '_hasCdn') continue;
    const normalizedDescription = String(description)
      .replaceAll('(#custom-domain-names)', '(/resources/networking/custom-domains/)')
      .replaceAll('(#cdn)', '(/resources/networking/cdn/)')
      .replaceAll('/compute-resources/web-services/', '/resources/compute/web-service/')
      .replaceAll('/compute-resources/multi-container-workloads/', '/resources/compute/multi-container-workload/')
      .replaceAll('/resources/dynamo-db-tables/#item-change-streaming', '/resources/databases/dynamodb/#streams');
    lines.push(
      `| \`${escapeMarkdownTableCell(paramName)}\` | ${escapeMarkdownTableCell(stripHtml(normalizedDescription)) || '-'} | \`$ResourceParam("<<resource-name>>", "${escapeMarkdownTableCell(paramName)}")\` |`
    );
  }
  return `${lines.join('\n')}\n\n`;
};

const referenceableParamsFromTypeDeclaration = (resourceType: string): Record<string, string> | undefined => {
  const typeName = REFERENCEABLE_PARAM_TYPE_BY_RESOURCE_TYPE[resourceType];
  if (!typeName || !existsSync(TYPES_DIR)) return undefined;

  for (const file of readdirSync(TYPES_DIR)) {
    if (!file.endsWith('.d.ts')) continue;
    const content = readFileSync(join(TYPES_DIR, file), 'utf-8');
    const escaped = typeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = content.match(new RegExp(`type\\s+${escaped}\\s*=\\s*([^;]+);`));
    if (!match?.[1]) continue;
    const params = [...match[1].matchAll(/'([^']+)'/g)].map((paramMatch) => paramMatch[1]);
    if (params.length === 0) continue;
    return Object.fromEntries(params.map((param) => [param, `Referenceable ${param} value.`]));
  }

  return undefined;
};

const parseJsLiteral = <T>(value: string): T | undefined => {
  const source = ts.createSourceFile(
    'llm-docs-static-expression.ts',
    `const __value = (${value});`,
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TS
  );
  const statement = source.statements[0];
  if (!statement || !ts.isVariableStatement(statement)) return undefined;
  const initializer = statement.declarationList.declarations[0]?.initializer;
  const parseDiagnostics = (source as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] }).parseDiagnostics;
  if (!initializer || (parseDiagnostics?.length ?? 0) > 0) return undefined;

  type Evaluation = { ok: true; value: unknown } | { ok: false };
  const fail: Evaluation = { ok: false };
  const evaluate = (node: ts.Expression): Evaluation => {
    if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) {
      return evaluate(node.expression);
    }
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      return { ok: true, value: node.text };
    }
    if (ts.isNumericLiteral(node)) return { ok: true, value: Number(node.text) };
    if (node.kind === ts.SyntaxKind.TrueKeyword) return { ok: true, value: true };
    if (node.kind === ts.SyntaxKind.FalseKeyword) return { ok: true, value: false };
    if (node.kind === ts.SyntaxKind.NullKeyword) return { ok: true, value: null };
    if (ts.isIdentifier(node) && node.text === 'undefined') return { ok: true, value: undefined };
    if (ts.isPrefixUnaryExpression(node)) {
      const operand = evaluate(node.operand);
      if (!operand.ok || typeof operand.value !== 'number') return fail;
      if (node.operator === ts.SyntaxKind.MinusToken) return { ok: true, value: -operand.value };
      if (node.operator === ts.SyntaxKind.PlusToken) return { ok: true, value: operand.value };
      return fail;
    }
    if (ts.isTemplateExpression(node)) {
      let rendered = node.head.text;
      for (const span of node.templateSpans) {
        const expression = evaluate(span.expression);
        if (!expression.ok || !['string', 'number', 'boolean'].includes(typeof expression.value)) return fail;
        rendered += String(expression.value) + span.literal.text;
      }
      return { ok: true, value: rendered };
    }
    if (ts.isArrayLiteralExpression(node)) {
      const items: unknown[] = [];
      for (const element of node.elements) {
        if (ts.isSpreadElement(element) || ts.isOmittedExpression(element)) return fail;
        const item = evaluate(element);
        if (!item.ok) return fail;
        items.push(item.value);
      }
      return { ok: true, value: items };
    }
    if (ts.isObjectLiteralExpression(node)) {
      const object: Record<string, unknown> = {};
      for (const property of node.properties) {
        if (!ts.isPropertyAssignment(property)) return fail;
        const name = property.name;
        const key =
          ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name) ? name.text : undefined;
        if (key === undefined) return fail;
        const propertyValue = evaluate(property.initializer);
        if (!propertyValue.ok) return fail;
        object[key] = propertyValue.value;
      }
      return { ok: true, value: object };
    }
    return fail;
  };

  const evaluated = evaluate(initializer);
  return evaluated.ok ? (evaluated.value as T) : undefined;
};

const featureComparisonToMarkdown = (columnsRaw: string, featuresRaw: string): string | undefined => {
  const columns = parseJsLiteral<string[]>(columnsRaw);
  const features = parseJsLiteral<Array<{ name: string; values: Record<string, string | boolean> }>>(featuresRaw);
  if (!columns || !features) return undefined;

  const lines = [
    '\n\n## Feature Comparison',
    '',
    `| Feature | ${columns.map(escapeMarkdownTableCell).join(' | ')} |`,
    `| --- | ${columns.map(() => '---').join(' | ')} |`
  ];
  for (const feature of features) {
    const values = columns.map((column) => {
      const value = feature.values[column];
      if (value === true) return 'yes';
      if (value === false) return 'no';
      return value ?? '-';
    });
    lines.push(`| ${escapeMarkdownTableCell(feature.name)} | ${values.map(escapeMarkdownTableCell).join(' | ')} |`);
  }
  return `${lines.join('\n')}\n\n`;
};

const codeBlockToMarkdown = (tabsRaw: string): string | undefined => {
  const tabs = parseJsLiteral<Array<{ label?: string; lang?: string; code?: string }>>(tabsRaw);
  if (!tabs) return undefined;

  return tabs
    .map((tab) => {
      const label = tab.label ? ` (${tab.label})` : '';
      const lang = tab.lang || 'text';
      const code = String(tab.code || '')
        .replace(/^\s*(?:\/\/|#)\s*\[!code focus-start\]\n?/gm, '')
        .replace(/^\s*(?:\/\/|#)\s*\[!code focus-end\]\n?/gm, '')
        .replace(/\s*(?:\/\/|#)\s*\[!code (?:focus|highlight)(?::\d+)?\]/g, '')
        .trim();
      return `\n\nExample${label}:\n\n\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
    })
    .join('');
};

const flowDiagramToMarkdown = (stepsRaw: string): string | undefined => {
  const steps = parseJsLiteral<Array<{ title?: string; description?: string }>>(stepsRaw);
  if (!steps) return undefined;
  const lines = ['\n\n## Flow'];
  steps.forEach((step, index) => {
    lines.push(
      `${index + 1}. **${step.title || `Step ${index + 1}`}**${step.description ? `: ${step.description}` : ''}`
    );
  });
  return `${lines.join('\n')}\n\n`;
};

const featureGridToMarkdown = (itemsRaw: string): string | undefined => {
  const items = parseJsLiteral<Array<{ title?: string; text?: string }>>(itemsRaw);
  if (!items) return undefined;
  return `\n\n${items.map((item) => `- **${item.title || 'Feature'}:** ${item.text || ''}`).join('\n')}\n\n`;
};

const propStringValue = (propsRaw: string, propName: string): string | undefined => {
  const match = propsRaw.match(new RegExp(`\\b${propName}="([^"]*)"`));
  return match?.[1];
};

const navBoxToMarkdown = (propsRaw: string): string => {
  const text = propStringValue(propsRaw, 'text');
  const url = propStringValue(propsRaw, 'url');
  const description = propStringValue(propsRaw, 'description');
  const label = text || url || 'Related page';
  const link = url ? `[${label}](${url})` : label;
  return `\n- ${description ? `${link}: ${description}` : link}`;
};

/**
 * Replaces a self-closing MDX component without treating `>` or `/>` inside strings or JSX
 * expressions as the end of the tag. Regex-only parsing broke on generated CLI descriptions that
 * contain HTML such as `<p>...</p>` inside a JSON string.
 */
const replaceSelfClosingMdxComponent = (
  source: string,
  componentName: string,
  render: (fullMatch: string, propsRaw: string) => string
): string => {
  const opening = `<${componentName}`;
  let cursor = 0;
  let result = '';

  while (cursor < source.length) {
    const start = source.indexOf(opening, cursor);
    if (start === -1) return result + source.slice(cursor);
    const boundary = source[start + opening.length];
    if (boundary && !/[\s/]/.test(boundary)) {
      result += source.slice(cursor, start + opening.length);
      cursor = start + opening.length;
      continue;
    }

    let index = start + opening.length;
    let braceDepth = 0;
    let quote: '"' | "'" | '`' | undefined;
    let end = -1;
    for (; index < source.length; index++) {
      const char = source[index];
      if (quote) {
        if (char === '\\') {
          index++;
        } else if (char === quote) {
          quote = undefined;
        }
        continue;
      }
      if (char === '"' || char === "'" || char === '`') {
        quote = char;
        continue;
      }
      if (char === '{') {
        braceDepth++;
        continue;
      }
      if (char === '}') {
        braceDepth = Math.max(0, braceDepth - 1);
        continue;
      }
      if (braceDepth === 0 && char === '/' && source[index + 1] === '>') {
        end = index + 2;
        break;
      }
      if (braceDepth === 0 && char === '>') break;
    }

    if (end === -1) {
      result += source.slice(cursor, start + opening.length);
      cursor = start + opening.length;
      continue;
    }

    const fullMatch = source.slice(start, end);
    const propsRaw = source.slice(start + opening.length, end - 2);
    result += source.slice(cursor, start) + render(fullMatch, propsRaw);
    cursor = end;
  }

  return result;
};

const cliCommandReferenceToMarkdown = (command: string, args: any[]): string => {
  if (args.length === 0) return `\n\n## CLI Options: \`stacktape ${command}\`\n\nNo available options.\n\n`;
  const lines = [
    `\n\n## CLI Options: \`stacktape ${command}\``,
    '',
    '| Option | Required | Type | Description | Values |',
    '| --- | --- | --- | --- | --- |'
  ];
  for (const arg of args) {
    const option = `--${arg.name}${arg.alias ? ` (-${arg.alias})` : ''}`;
    const description = [stripHtml(arg.shortDescription || arg.description), stripHtml(arg.longDescription)]
      .filter(Boolean)
      .join(' ');
    lines.push(
      `| \`${escapeMarkdownTableCell(option)}\` | ${arg.required ? 'yes' : 'no'} | \`${escapeMarkdownTableCell((arg.allowedTypes || []).join(' | ') || 'unknown')}\` | ${escapeMarkdownTableCell(description) || '-'} | ${escapeMarkdownTableCell((arg.allowedValues || []).map((value: string) => `\`${value}\``).join(', ') || '-')} |`
    );
  }
  return `${lines.join('\n')}\n\n`;
};

const generatedCommandSchemaInfo = generateCommandSchemaInfo();

const getGeneratedCliArgs = (command: string): any[] => {
  const info = generatedCommandSchemaInfo[command];
  if (!info) throw new Error(`CLI command "${command}" was not found`);
  return Object.entries(info.args).map(([name, arg]) => ({ name, ...(arg as Record<string, unknown>) }));
};

const transformComponents = (body: string): string => {
  let result = body;

  result = result.replace(/<LandingHero\b([^>]*)>([\s\S]*?)<\/LandingHero>/g, (_, props, children) => {
    const title = propStringValue(props, 'title');
    const accent = propStringValue(props, 'accent');
    const subtitle = propStringValue(props, 'subtitle');
    return ['', `# ${[title, accent].filter(Boolean).join(' ') || 'Stacktape'}`, '', subtitle, '', children.trim(), '']
      .filter((line) => line !== undefined)
      .join('\n');
  });

  result = result.replace(/<CTASection\b([^>]*)>([\s\S]*?)<\/CTASection>/g, (_, props, children) => {
    const title = propStringValue(props, 'title');
    const subtitle = propStringValue(props, 'subtitle');
    return ['\n\n', title ? `## ${title}` : undefined, subtitle, children.trim(), '\n\n']
      .filter((line) => line !== undefined)
      .join('\n\n');
  });

  result = result.replace(/<ApiReference\s+definitionName="([^"]+)"\s*\/>/g, (_, definitionName) =>
    apiReferenceSummaryToMarkdown(definitionName)
  );

  result = result.replace(/<ReferenceableParams\s+(?:resource|resourceType)="([^"]+)"\s*\/>/g, (_, resourceType) =>
    referenceableParamsToMarkdown(resourceType)
  );

  result = replaceSelfClosingMdxComponent(result, 'CliCommandsApiReference', (fullMatch, propsRaw) => {
    const command = propsRaw.match(/\bcommand="([^"]+)"/)?.[1];
    if (!command) throw new Error(`CliCommandsApiReference is missing command: ${fullMatch.slice(0, 120)}`);
    const sortedArgsMatch = propsRaw.match(/\bsortedArgs=\{(\[[\s\S]*?\])\}/);
    const args = sortedArgsMatch ? parseJsLiteral<Array<any>>(sortedArgsMatch[1]) : getGeneratedCliArgs(command);
    if (!args) throw new Error(`CLI args for "${command}" could not be parsed`);
    return cliCommandReferenceToMarkdown(command, args);
  });

  result = result.replace(/<CodeBlock\b[\s\S]*?tabs=\{(\[[\s\S]*?\])\}\s*\/>/g, (fullMatch, tabsRaw) => {
    const markdown = codeBlockToMarkdown(tabsRaw);
    if (!markdown) throw new Error(`CodeBlock could not be parsed: ${fullMatch.slice(0, 120)}`);
    return markdown;
  });

  result = result.replace(
    /<FeatureComparisonTable\s+columns=\{(\[[\s\S]*?\])\}\s+features=\{(\[[\s\S]*?\])\}\s*\/>/g,
    (fullMatch, columnsRaw, featuresRaw) => {
      const markdown = featureComparisonToMarkdown(columnsRaw, featuresRaw);
      if (!markdown) throw new Error(`FeatureComparisonTable could not be parsed: ${fullMatch.slice(0, 120)}`);
      return markdown;
    }
  );

  result = result.replace(/<FlowDiagram\s+steps=\{(\[[\s\S]*?\])\}\s*\/>/g, (fullMatch, stepsRaw) => {
    const markdown = flowDiagramToMarkdown(stepsRaw);
    if (!markdown) throw new Error(`FlowDiagram could not be parsed: ${fullMatch.slice(0, 120)}`);
    return markdown;
  });

  result = result.replace(/<FeatureGrid\s+items=\{(\[[\s\S]*?\])\}\s*\/>/g, (fullMatch, itemsRaw) => {
    const markdown = featureGridToMarkdown(itemsRaw);
    if (!markdown) throw new Error(`FeatureGrid could not be parsed: ${fullMatch.slice(0, 120)}`);
    return markdown;
  });

  result = result
    .replace(/<\/?ButtonRow>/g, '')
    .replace(/^[ \t]*<CTAButton\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/CTAButton>[ \t]*$/gm, '- [$2]($1)')
    .replace(/<\/?Steps>/g, '')
    .replace(/<Step\s+title="([^"]+)">/g, '\n\n### $1\n\n')
    .replace(/<\/Step>/g, '');

  result = result.replace(/<NavBoxGrid\b[^>]*>([\s\S]*?)<\/NavBoxGrid>/g, (_, children) => {
    const items = children.replace(/<NavBox\b([^>]*)\/>/g, (_navBoxMatch: string, propsRaw: string) =>
      navBoxToMarkdown(propsRaw)
    );
    return `\n\n## Related Pages\n${items.trim()}\n\n`;
  });

  result = result.replace(/<ConsoleScreenshot\s+([^>]*?)\/>/g, (_, props) => {
    const alt = props.match(/alt="([^"]*)"/)?.[1];
    const caption = props.match(/caption="([^"]*)"/)?.[1];
    return `\n\n> Screenshot: ${[alt, caption].filter(Boolean).join(' Caption: ') || 'console screenshot'}\n\n`;
  });

  result = result.replace(/<Tabs>([\s\S]*?)<\/Tabs>/g, (_, children) =>
    children.replace(/<Tab\s+label="([^"]+)">/g, '\n\n### Tab: $1\n\n').replace(/<\/Tab>/g, '\n\n')
  );

  for (const tag of ['Warning', 'Info', 'Tip', 'Error']) {
    const block = new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)<\\/${tag}>`, 'g');
    result = result.replace(block, (_, props, content) => {
      const title = propStringValue(props, 'title');
      const label = [tag, title].filter(Boolean).join(' - ');
      return `\n\n> **${label}:** ${content.trim()}\n\n`;
    });
  }

  result = result.replace(/<ProjectStructure\s+(?:structure|files)=\{(\[[\s\S]*?\])\}\s*\/>/g, (_, structureRaw) => {
    const structure = parseJsLiteral<any[]>(structureRaw);
    if (!structure) throw new Error('ProjectStructure could not be parsed');
    const render = (nodes: any[], depth = 0): string[] =>
      nodes.flatMap((node) => [
        `${'  '.repeat(depth)}- \`${node.name}\`${node.description ? `: ${node.description}` : ''}`,
        ...(node.children ? render(node.children, depth + 1) : [])
      ]);
    return `\n\n## Project Structure\n\n${render(structure).join('\n')}\n\n`;
  });

  result = result.replace(/<DecisionTree\s+nodes=\{(\[[\s\S]*?\])\}\s*\/>/g, (_, nodesRaw) => {
    const nodes = parseJsLiteral<any[]>(nodesRaw);
    if (!nodes) throw new Error('DecisionTree could not be parsed');
    const render = (items: any[], depth = 0): string[] =>
      items.flatMap((node) => [
        `${'  '.repeat(depth)}- ${[node.question, node.answer, node.result].filter(Boolean).join(' -> ')}`,
        ...(node.children ? render(node.children, depth + 1) : [])
      ]);
    return `\n\n## Decision Tree\n\n${render(nodes).join('\n')}\n\n`;
  });

  return result;
};

const cleanMdxForLlms = async (body: string): Promise<string> => {
  const fencedCodeBlocks: string[] = [];
  const protectedBody = body.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, (block) => {
    const token = `@@LLM_DOCS_FENCED_CODE_${fencedCodeBlocks.length}@@`;
    fencedCodeBlocks.push(block);
    return token;
  });
  let result = transformComponents(protectedBody);

  result = result
    .replace(/<\/?(?:Divider|PreviousNext|NegativeMargin)[^>]*>/g, '')
    // Decorative landing-page art has no textual meaning for the LLM corpus.
    .replace(/<LandingCover\s*\/>/g, '')
    .replace(
      /<StarterProjectGallery\s*\/>/g,
      '\n\nBrowse the current starter projects at https://docs.stacktape.com/getting-started/starter-projects or scaffold one with `stacktape init --starterId <starter-id>`.\n\n'
    )
    .replace(
      /<OpenSourceBanner\s*\/>/g,
      '\n\nStacktape is open source. Browse the source at https://github.com/stacktape/stacktape.\n\n'
    )
    .replace(/<PricingColumns\s*\/>/g, '\n\nSee current pricing at https://stacktape.com/pricing.\n\n')
    .replace(/<Testimonials\s*\/>/g, '')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();

  // Components in this docs corpus are block-level. Restrict the guard to a tag at the start of a
  // line so prose type syntax such as `Array<EnvironmentVar>` is not mistaken for JSX.
  const unsupportedComponent = result.match(/^[ \t]*<([A-Z][A-Za-z0-9]*)\b/m);
  if (unsupportedComponent) {
    throw new Error(`Unsupported MDX component: ${unsupportedComponent[1]}`);
  }

  return result.replace(/@@LLM_DOCS_FENCED_CODE_(\d+)@@/g, (_, index) => fencedCodeBlocks[Number(index)] || '');
};

const slug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/`/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const extractDefinitionNames = (content: string): string[] =>
  [...content.matchAll(/<ApiReference\s+definitionName="([^"]+)"/g)].map((match) => match[1]);

const inferResourceType = (filePath: string, content: string): string | undefined => {
  const byName = RESOURCE_TYPE_BY_DOC_BASENAME[basename(filePath, '.mdx')];
  if (byName) return byName;
  const refParamMatch = content.match(/<ReferenceableParams\s+(?:resource|resourceType)="([^"]+)"/);
  if (refParamMatch) return refParamMatch[1];
  return undefined;
};

const tagsForPage = ({
  route,
  resourceType,
  definitionNames
}: {
  route: string;
  resourceType?: string;
  definitionNames: string[];
}) => {
  const routeParts = route.split('/').filter(Boolean);
  return [...new Set([...routeParts, ...(resourceType ? [resourceType] : []), ...definitionNames])];
};

const buildChunks = (page: LlmDocPage): LlmDocChunk[] => {
  const lines = page.content.split('\n');
  const chunks: LlmDocChunk[] = [];
  let headingPath: string[] = [page.title];
  let current: string[] = [];
  let currentHeading = page.title;
  const seenChunkIds = new Map<string, number>();

  const flush = () => {
    const content = current.join('\n').trim();
    if (!content) return;
    const baseId = `${page.id}#${slug(currentHeading) || chunks.length + 1}`;
    const seen = seenChunkIds.get(baseId) || 0;
    seenChunkIds.set(baseId, seen + 1);
    chunks.push({
      id: seen === 0 ? baseId : `${baseId}-${seen + 1}`,
      pageId: page.id,
      title: page.title,
      route: page.route,
      sourcePath: page.sourcePath,
      headingPath,
      docKind: page.docKind,
      resourceType: page.resourceType,
      definitionNames: page.definitionNames,
      tags: page.tags,
      content
    });
    current = [];
  };

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch && current.length > 0) {
      flush();
    }
    if (headingMatch) {
      const depth = headingMatch[1].length;
      const heading = headingMatch[2].trim();
      headingPath = [...headingPath.slice(0, Math.max(1, depth - 1)), heading];
      currentHeading = heading;
    }
    current.push(line);
  }
  flush();
  return chunks;
};

const buildDocsPages = async (): Promise<LlmDocPage[]> => {
  const files = await listFiles(DOCS_SOURCE_DIR, (filePath) => filePath.endsWith('.mdx'));
  const pages: LlmDocPage[] = [];

  for (const filePath of files) {
    const raw = await readFile(filePath, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(raw);
    const route = routeFromDocPath(filePath);
    const sourcePath = relativeSourcePath(filePath);
    const definitionNames = extractDefinitionNames(body);
    const resourceType = inferResourceType(filePath, body);
    const title = frontmatter.title || body.match(/^#\s+(.+)$/m)?.[1] || basename(filePath, '.mdx');
    const cleanedContent = await cleanMdxForLlms(body);
    const content = /^#\s+/.test(cleanedContent) ? cleanedContent : `# ${title}\n\n${cleanedContent}`;
    pages.push({
      id: `page:${route}`,
      title,
      route,
      sourcePath,
      outputPath: outputPathFromRoute(route),
      docKind: 'docs-page',
      resourceType,
      definitionNames,
      tags: tagsForPage({ route, resourceType, definitionNames }),
      content
    });
  }

  return pages;
};

const buildConfigReferencePages = async (): Promise<LlmDocPage[]> => {
  const pages: LlmDocPage[] = [];
  for (const definitionName of Object.keys(apiReferenceData).sort()) {
    const definition = apiReferenceData[definitionName];
    const location = definitionSourceLocations.get(definitionName) || {
      sourcePath: relativeSourcePath(ENHANCED_CONFIG_SCHEMA_PATH),
      route: '/config-reference/shared',
      outputGroup: 'shared'
    };
    const content = apiReferenceDefinitionToMarkdown(definitionName);
    pages.push({
      id: `config-reference:${definitionName}`,
      title: `${definitionName} API Reference`,
      route: location.route,
      sourcePath: location.sourcePath,
      outputPath: `config-reference/${location.outputGroup}/${slug(definitionName)}.md`,
      docKind: 'config-reference',
      resourceType: location.resourceType,
      definitionNames: [definitionName],
      tags: [
        ...new Set([
          'config-reference',
          definitionName,
          ...definition.properties.map((property) => property.name),
          ...(location.resourceType ? [location.resourceType] : [])
        ])
      ],
      content
    });
  }

  return pages;
};

const writePagesAndChunks = async (pages: LlmDocPage[]) => {
  const chunks = pages.flatMap(buildChunks);
  const chunksByPage = new Map<string, string[]>();
  for (const chunk of chunks) {
    chunksByPage.set(chunk.pageId, [...(chunksByPage.get(chunk.pageId) || []), chunk.id]);
  }

  for (const page of pages) {
    const outputPath = join(DIST_DIR, page.outputPath);
    await ensureDir(dirname(outputPath));
    await writeFile(outputPath, page.content.endsWith('\n') ? page.content : `${page.content}\n`, 'utf-8');
  }

  await ensureDir(join(DIST_DIR, 'chunks'));
  const chunksJsonl = chunks.map((chunk) => JSON.stringify(chunk)).join('\n');
  await writeFile(join(DIST_DIR, 'chunks', 'chunks.jsonl'), chunksJsonl, 'utf-8');
  await writeFile(
    join(DIST_DIR, LEXICAL_INDEX_FILE_NAME),
    JSON.stringify(serializeLexicalIndex(buildIndexFromChunks(chunksJsonl))),
    'utf-8'
  );

  const manifest = {
    generatedAt: new Date().toISOString(),
    version: '0.2',
    sourceRoots: ['docs/docs', 'types/stacktape-config', '@generated/schemas/enhanced-config-schema.json'],
    pages: pages.map(
      (page): ManifestEntry => ({
        id: page.id,
        title: page.title,
        route: page.route,
        sourcePath: page.sourcePath,
        outputPath: page.outputPath,
        docKind: page.docKind,
        resourceType: page.resourceType,
        definitionNames: page.definitionNames,
        tags: page.tags,
        chunks: chunksByPage.get(page.id) || []
      })
    )
  };
  await writeFile(join(DIST_DIR, 'index.json'), JSON.stringify(manifest, null, 2), 'utf-8');
  return { chunks, manifest };
};

const writeLlmsFiles = async (pages: LlmDocPage[]) => {
  const docsPages = pages.filter((page) => page.docKind === 'docs-page');
  const configReferencePages = pages.filter((page) => page.docKind === 'config-reference');
  const curatedPages = [
    ['/getting-started/configure-your-stack', 'Define your first Stacktape project and resources.'],
    ['/getting-started/deploy-your-first-stage', 'Deploy a stage to your own AWS account.'],
    ['/configuration/resources', 'Understand resource syntax and the available resource catalog.'],
    ['/configuration/connecting-resources', 'Wire resources together with IAM permissions and environment variables.'],
    ['/resources/compute/lambda-function', 'Configure and deploy AWS Lambda functions.'],
    ['/resources/compute/web-service', 'Run containerized HTTP services on AWS.'],
    ['/local-development/dev-mode-overview', 'Develop locally while connected to cloud resources.'],
    ['/deployment-and-lifecycle/deploying-stacks', 'Understand deployments, stages, and lifecycle behavior.'],
    ['/using-with-ai/mcp-server-setup', 'Connect an AI coding assistant to Stacktape tools using MCP.'],
    ['/getting-started/going-to-production', 'Review production readiness, security, cost, and reliability.']
  ] as const;
  const lines = [
    '# Stacktape Documentation',
    '',
    '> Stacktape is an open-source infrastructure framework for defining serverless and container applications in TypeScript or YAML and deploying them to the user’s own AWS account.',
    '',
    'Use the concise index below to locate the canonical documentation page for a task. For a single-file corpus that includes page content and generated TypeScript configuration reference, use [llms-full.txt](/llms-full.txt).',
    '',
    '## Start Here',
    ...curatedPages.flatMap(([route, description]) => {
      const page = docsPages.find((candidate) => candidate.route === route);
      return page ? [`- [${page.title}](${page.route}): ${description}`] : [];
    }),
    '',
    '## Complete Documentation Index',
    ...docsPages.map((page) => `- [${page.title}](${page.route}) - source: ${page.sourcePath}`),
    '',
    '## Machine-Readable Reference',
    '- [Full documentation and generated configuration reference](/llms-full.txt): all guide content plus the property-level API reference in one file.',
    '- [Configuration API reference](/llms-api-reference.txt): API-reference definitions, properties, defaults, union choices, descriptions, and examples without the narrative guides.',
    '- [XML sitemap](/sitemap-index.xml): canonical crawlable documentation URLs.'
  ];
  await writeFile(join(DIST_DIR, 'llms.txt'), `${lines.join('\n')}\n`, 'utf-8');

  const renderCorpusPage = (page: LlmDocPage) => {
    const content = page.content.trim();
    const heading = content.match(/^#\s+[^\n]+/m)?.[0] || `# ${page.title}`;
    const body = content.startsWith(heading) ? content.slice(heading.length).trimStart() : content;
    return `${heading}\n\nSource: \`${page.sourcePath}\`\nRoute: \`${page.route}\`\n\n${body}`.trim();
  };
  const full = [...docsPages, ...configReferencePages].map(renderCorpusPage).join('\n\n---\n\n');
  await writeFile(join(DIST_DIR, 'llms-full.txt'), `${full}\n`, 'utf-8');
  const apiReference = [
    '# Stacktape Configuration API Reference',
    '',
    '> Property-level configuration reference generated from the same enhanced schema as the interactive documentation API reference.',
    '',
    ...configReferencePages.flatMap((page, index) => [index === 0 ? '' : '---', '', renderCorpusPage(page), ''])
  ].join('\n');
  await writeFile(join(DIST_DIR, 'llms-api-reference.txt'), `${apiReference.trim()}\n`, 'utf-8');
};

export const generateLlmDocs = async () => {
  log('Generating LLM docs from docs/docs and types/stacktape-config...');
  await ensureDir(DIST_DIR);
  await emptyDir(DIST_DIR);

  const docsPages = await buildDocsPages();
  const configReferencePages = await buildConfigReferencePages();
  const pages = [...docsPages, ...configReferencePages].sort((a, b) => a.outputPath.localeCompare(b.outputPath));

  const { chunks } = await writePagesAndChunks(pages);
  await writeLlmsFiles(pages);

  log(`Generated ${pages.length} pages and ${chunks.length} chunks in ${relative(process.cwd(), DIST_DIR)}`);
};

if (import.meta.main) {
  generateLlmDocs();
}
