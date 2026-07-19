/* eslint-disable no-new-func */
import { basename, dirname, join, relative } from 'node:path';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { emptyDir, ensureDir, readFile, readdir, writeFile } from 'fs-extra';
import { LLM_DOCS_FOLDER_PATH } from '@shared/naming/project-fs-paths';
import { generateCommandSchemaInfo } from '../src/config/cli/utils';
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
const API_REFERENCE_DATA_PATH = join(process.cwd(), 'docs', 'src', 'generated', 'api-reference-data.ts');
const RESOURCES_JSON_PATH = join(process.cwd(), 'docs', '.resources.json');

const normalizePath = (filePath: string): string => filePath.replace(/\\/g, '/');

const relativeSourcePath = (filePath: string): string => normalizePath(relative(process.cwd(), filePath));

const loadApiReferenceData = (): Record<string, any> => {
  const raw = readFileSync(API_REFERENCE_DATA_PATH, 'utf-8');
  const match = raw.match(
    /export const apiReferenceData = ([\s\S]*) satisfies Record<string, ApiReferenceGeneratedDefinition>;/
  );
  if (!match) {
    throw new Error(`Could not parse apiReferenceData from ${API_REFERENCE_DATA_PATH}`);
  }
  return new Function(`"use strict"; return (${match[1]});`)() as Record<string, any>;
};

const apiReferenceData = loadApiReferenceData();
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

const SKIP_TYPE_FILES = new Set([
  '__helpers.d.ts',
  'alarm-metrics.d.ts',
  'deployment-artifacts.d.ts',
  'guardrails.d.ts',
  'notifications.d.ts',
  'providers.d.ts',
  'user-integrations.d.ts',
  'ssr-web-shared.d.ts'
]);

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
    .replace(/\n{3,}/g, '\n\n')
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
    .replaceAll('*\\/', '*/');

const findTypeDeclaration = (definitionName: string): { sourcePath: string; declaration: string } | undefined => {
  if (!existsSync(TYPES_DIR)) return undefined;
  for (const file of readdirSync(TYPES_DIR)) {
    if (!file.endsWith('.d.ts')) continue;
    const filePath = join(TYPES_DIR, file);
    const content = readFileSync(filePath, 'utf-8');
    const escaped = definitionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match =
      content.match(new RegExp(`interface\\s+${escaped}\\s*(?:extends\\s+[^\\{]+)?\\{[\\s\\S]*?\\n\\}`, 'm')) ||
      content.match(new RegExp(`type\\s+${escaped}\\s*=\\s*[\\s\\S]*?(?=\\n(?:interface|type)\\s+\\w|$)`, 'm'));
    if (match) {
      return {
        sourcePath: relativeSourcePath(filePath),
        declaration: stripExampleNoise(match[0]).trim()
      };
    }
  }
  return undefined;
};

const apiReferenceToMarkdown = (definitionName: string): string => {
  const definition = (apiReferenceData as Record<string, any>)[definitionName];
  if (!definition) {
    const typeDeclaration = findTypeDeclaration(definitionName);
    if (typeDeclaration) {
      return [
        `\n\n## API Reference: \`${definitionName}\``,
        '',
        `Source: \`${typeDeclaration.sourcePath}\``,
        '',
        '```typescript',
        typeDeclaration.declaration,
        '```',
        ''
      ].join('\n');
    }
    throw new Error(`API reference definition "${definitionName}" was not found`);
  }

  const lines = [`\n\n## API Reference: \`${definitionName}\``];
  if (definition.shortDescription) lines.push(stripHtml(definition.shortDescription), '');
  lines.push(
    '```typescript',
    definition.typeDeclaration.replaceAll('// [!code focus-start]\n', '').replaceAll('// [!code focus-end]', '').trim(),
    '```'
  );

  if (definition.properties?.length) {
    lines.push('', '| Property | Required | Type | Description | Default |', '| --- | --- | --- | --- | --- |');
    for (const property of definition.properties) {
      const description = [stripHtml(property.shortDescription), stripHtml(property.longDescription)]
        .filter(Boolean)
        .join(' ');
      lines.push(
        `| \`${property.name}\` | ${property.required ? 'yes' : 'no'} | \`${typeInfoToMarkdown(property.typeInfo).replaceAll('|', '\\|')}\` | ${description.replace(/\n/g, '<br>') || '-'} | ${property.defaultValue ? `\`${property.defaultValue}\`` : '-'} |`
      );
    }
  }

  return `${lines.join('\n')}\n\n`;
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
    lines.push(
      `| \`${paramName}\` | ${stripHtml(String(description)).replace(/\n/g, '<br>') || '-'} | \`$ResourceParam("<<resource-name>>", "${paramName}")\` |`
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
  try {
    // MDX component props are authored as JS object/array literals. Evaluate only local docs source.
    return new Function(`"use strict"; return (${value});`)() as T;
  } catch {
    return undefined;
  }
};

const featureComparisonToMarkdown = (columnsRaw: string, featuresRaw: string): string | undefined => {
  const columns = parseJsLiteral<string[]>(columnsRaw);
  const features = parseJsLiteral<Array<{ name: string; values: Record<string, string | boolean> }>>(featuresRaw);
  if (!columns || !features) return undefined;

  const lines = [
    '\n\n## Feature Comparison',
    '',
    `| Feature | ${columns.join(' | ')} |`,
    `| --- | ${columns.map(() => '---').join(' | ')} |`
  ];
  for (const feature of features) {
    const values = columns.map((column) => {
      const value = feature.values[column];
      if (value === true) return 'yes';
      if (value === false) return 'no';
      return value ?? '-';
    });
    lines.push(`| ${feature.name} | ${values.join(' | ')} |`);
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
      `| \`${option}\` | ${arg.required ? 'yes' : 'no'} | \`${(arg.allowedTypes || []).join(' | ') || 'unknown'}\` | ${description.replace(/\n/g, '<br>') || '-'} | ${(arg.allowedValues || []).map((value: string) => `\`${value}\``).join(', ') || '-'} |`
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

  result = result.replace(/<ApiReference\s+definitionName="([^"]+)"\s*\/>/g, (_, definitionName) =>
    apiReferenceToMarkdown(definitionName)
  );

  result = result.replace(/<ReferenceableParams\s+(?:resource|resourceType)="([^"]+)"\s*\/>/g, (_, resourceType) =>
    referenceableParamsToMarkdown(resourceType)
  );

  result = result.replace(/<CliCommandsApiReference\b([^>]*)\/>/g, (fullMatch, propsRaw) => {
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
    .replace(/<LandingHero\b[^>]*>/g, '')
    .replace(/<\/LandingHero>/g, '')
    .replace(/<CTASection\b[^>]*>/g, '')
    .replace(/<\/CTASection>/g, '')
    .replace(/<\/?ButtonRow>/g, '')
    .replace(/<CTAButton\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/CTAButton>/g, '[$2]($1)')
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
  let result = transformComponents(body);

  result = result
    .replace(/<\/?(?:Divider|PreviousNext|NegativeMargin)[^>]*>/g, '')
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

  const unsupportedSelfClosing = result.match(/<([A-Z][A-Za-z0-9]*)\b[^>]*\/>/);
  if (unsupportedSelfClosing) {
    throw new Error(`Unsupported self-closing MDX component: ${unsupportedSelfClosing[1]}`);
  }

  const unsupportedBlock = result.match(/<([A-Z][A-Za-z0-9]*)\b[^>]*>[\s\S]*?<\/\1>/);
  if (unsupportedBlock) {
    throw new Error(`Unsupported MDX component: ${unsupportedBlock[1]}`);
  }

  return result;
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
    const content = await cleanMdxForLlms(body);
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

const cleanTypeContent = (content: string): string =>
  stripExampleNoise(content)
    .replace(/^type Stp\w[\s\S]*?(?=\n(?:\/\*\*|interface|type [A-Z]|$))/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const buildConfigReferencePages = async (): Promise<LlmDocPage[]> => {
  const files = await listFiles(
    TYPES_DIR,
    (filePath) => filePath.endsWith('.d.ts') && !SKIP_TYPE_FILES.has(basename(filePath))
  );
  const pages: LlmDocPage[] = [];

  for (const filePath of files) {
    const stem = basename(filePath, '.d.ts');
    const raw = await readFile(filePath, 'utf-8');
    const interfaceName = raw.match(/interface\s+(\w+)\s*\{/)?.[1] || stem;
    const resourceType = FILENAME_TO_RESOURCE_TYPE[stem];
    const title = interfaceName.replace(/([a-z])([A-Z])/g, '$1 $2');
    const outputSlug = resourceType || stem;
    const route = `/config-reference/${outputSlug}`;
    const sourcePath = relativeSourcePath(filePath);
    const content = [
      `# ${title}`,
      '',
      resourceType ? `Resource type: \`${resourceType}\`` : undefined,
      '',
      '## TypeScript Definition',
      '',
      '```typescript',
      cleanTypeContent(raw),
      '```'
    ]
      .filter((line) => line !== undefined)
      .join('\n');

    pages.push({
      id: `config-reference:${outputSlug}`,
      title,
      route,
      sourcePath,
      outputPath: `config-reference/${outputSlug}.md`,
      docKind: 'config-reference',
      resourceType,
      definitionNames: [interfaceName],
      tags: [...new Set(['config-reference', stem, ...(resourceType ? [resourceType] : [])])],
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
    version: '0.1',
    sourceRoots: ['docs/docs', 'types/stacktape-config'],
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
  const lines = [
    '# Stacktape Documentation',
    '',
    'Stacktape is a deployment and infrastructure framework for defining application infrastructure in TypeScript or YAML and deploying it to AWS.',
    '',
    '## Docs Pages',
    ...docsPages.map((page) => `- [${page.title}](${page.route}) - source: ${page.sourcePath}`),
    '',
    '## Config Reference',
    ...pages
      .filter((page) => page.docKind === 'config-reference')
      .map(
        (page) => `- [${page.title}](${page.route})${page.resourceType ? ` - resource type: ${page.resourceType}` : ''}`
      )
  ];
  await writeFile(join(DIST_DIR, 'llms.txt'), `${lines.join('\n')}\n`, 'utf-8');

  const full = pages
    .map((page) => `# ${page.title}\n\nSource: ${page.sourcePath}\nRoute: ${page.route}\n\n${page.content}`)
    .join('\n\n---\n\n');
  await writeFile(join(DIST_DIR, 'llms-full.txt'), `${full}\n`, 'utf-8');
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
