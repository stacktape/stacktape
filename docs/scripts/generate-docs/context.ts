import { pathExists, readFile } from 'fs-extra';
import { glob } from 'glob';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { marked } from '../utils/marked-mdx-parser';
import { getBackboneSections } from './backbones';
import { pageDefinitions } from './pages';
import { getPricingSummary } from './pricing-summary';
import type {
  CliCommandReferenceArg,
  ContextPack,
  PageDefinition,
  ResolvedSectionInstruction,
  SectionInstructionsConfig
} from './types';

type CommandInfo = {
  args: Record<
    string,
    {
      description?: string;
      required: boolean;
      alias?: string;
      allowedTypes: string[];
      allowedValues?: string[];
    }
  >;
};

const require = createRequire(import.meta.url);
const { getCommandInfo } = require('../../../src/config/cli/utils.ts') as {
  getCommandInfo: (command: string) => CommandInfo;
};

const docsRoot = join(import.meta.dir, '..', '..');
const stacktapeRoot = join(docsRoot, '..');
const llmDocsRoot = join(stacktapeRoot, '@generated', 'llm-docs');
const sectionInstructionsPath = join(import.meta.dir, 'section-instructions.yml');
const styleGuidePath = join(import.meta.dir, 'style-guide.md');

// Hard per-source-file character budget so a single big file (e.g. a 300 KB JSON schema)
// cannot dominate the prompt. Larger files get truncated with a marker.
const MAX_SOURCE_CHARS = 80_000;

const truncateIfNeeded = (content: string, filePath: string) => {
  if (content.length <= MAX_SOURCE_CHARS) {
    return content;
  }
  const head = content.slice(0, MAX_SOURCE_CHARS);
  const droppedChars = content.length - MAX_SOURCE_CHARS;
  return `${head}\n\n... [TRUNCATED: ${droppedChars} chars dropped from ${filePath} to fit prompt budget. Open the file directly if you need the full content.]`;
};

const safeReadFile = async (filePath: string) => {
  try {
    return await readFile(filePath, 'utf8');
  } catch {
    return null;
  }
};

const unique = <T>(items: T[]) => [...new Set(items)];

const loadSectionInstructionsConfig = async (): Promise<SectionInstructionsConfig> => {
  const raw = await safeReadFile(sectionInstructionsPath);
  if (!raw) {
    return {};
  }
  const parsed = parseYaml(raw);
  if (!parsed || typeof parsed !== 'object') {
    return {};
  }
  return parsed as SectionInstructionsConfig;
};

const getPageSection = (route: string) => route.split('/')[0] || 'index';

const resolveSectionInstructions = ({
  config,
  page
}: {
  config: SectionInstructionsConfig;
  page: PageDefinition;
}): ResolvedSectionInstruction[] => {
  const section = getPageSection(page.route);
  const instructions =
    config.sections?.[section]?.filter((instruction): instruction is string => typeof instruction === 'string') || [];
  return instructions.length > 0 ? [{ section, instructions }] : [];
};

const parseDescription = async (description = '') => {
  const [shortDescription, longDescription] = description.split('---');
  const [parsedShortDescription, parsedLongDescription] = await Promise.all([
    marked(shortDescription.replace('####', '')),
    longDescription ? marked(longDescription) : Promise.resolve('')
  ]);
  return {
    shortDescription: parsedShortDescription,
    longDescription: parsedLongDescription
  };
};

// Map resource page slugs (in pages.ts) to the @generated/llm-docs/config-reference filename.
// Only resources whose LLM docs file uses a different basename than the page slug need an entry.
const llmDocsConfigReferenceAliases: Record<string, string> = {
  'lambda-function': 'function',
  'web-service': 'web-service',
  'private-service': 'private-service',
  'worker-service': 'worker-service',
  'multi-container-workload': 'multi-container-workload',
  'batch-job': 'batch-job',
  'edge-function': 'edge-lambda-function',
  'static-hosting': 'hosting-bucket',
  nextjs: 'nextjs-web',
  astro: 'astro-web',
  nuxt: 'nuxt-web',
  sveltekit: 'sveltekit-web',
  solidstart: 'solidstart-web',
  tanstack: 'tanstack-web',
  remix: 'remix-web',
  'relational-database': 'relational-database',
  dynamodb: 'dynamo-db-table',
  redis: 'redis-cluster',
  mongodb: 'mongo-db-atlas-cluster',
  upstash: 'upstash-redis',
  opensearch: 'open-search',
  bucket: 'bucket',
  efs: 'efs-filesystem',
  'http-api-gateway': 'http-api-gateway',
  alb: 'application-load-balancer',
  nlb: 'network-load-balancer',
  cdn: 'cdn',
  'event-bus': 'event-bus',
  'sqs-queue': 'sqs-queue',
  'sns-topic': 'sns-topic',
  'kinesis-stream': 'kinesis-stream',
  'state-machine': 'state-machine',
  'user-auth-pool': 'user-auth-pool',
  waf: 'web-app-firewall',
  bastion: 'bastion',
  'custom-resources': 'custom-resource',
  'deployment-scripts': 'deployment-script',
  'aws-cdk-constructs': 'aws-cdk-construct'
};

// Page route prefix → resource slug (used when the route doesn't carry the slug as the last segment).
const resolveResourceSlugFromRoute = (route: string): string | undefined => {
  const segments = route.split('/');
  if (segments[0] !== 'resources' || segments.length < 3) {
    return undefined;
  }
  return segments[segments.length - 1];
};

const resolveAutoAugmentedSources = async ({ page }: { page: PageDefinition }): Promise<string[]> => {
  const candidates: string[] = [];
  const generatedPagePath = join(llmDocsRoot, 'pages', `${page.route || 'index'}.md`);
  candidates.push(generatedPagePath);

  if (page.kind === 'resource') {
    const slug = resolveResourceSlugFromRoute(page.route);
    const configReferenceBase = slug ? llmDocsConfigReferenceAliases[slug] : undefined;
    if (configReferenceBase) {
      candidates.push(join(llmDocsRoot, 'config-reference', `${configReferenceBase}.md`));
    }
    if (slug === 'relational-database') {
      candidates.push(join(stacktapeRoot, '@generated', 'db-engine-versions', 'versions.json'));
    }
    // Note: pricing summary is added separately as a virtual source by buildContextPack so the writer
    // gets a distilled, ~1 KB markdown summary instead of the 300+ KB raw prices.json.
  }

  if (page.kind === 'cli' && page.cliCommand) {
    candidates.push(join(llmDocsRoot, 'pages', 'cli', `${page.cliCommand.replaceAll(':', '-')}.md`));
  }

  // Filter to only those that exist on disk; missing generated LLM docs are not an error.
  const existing = await Promise.all(
    candidates.map(async (filePath) => ((await pathExists(filePath)) ? filePath : null))
  );
  return existing.filter((value): value is string => value !== null);
};

const buildCliCommandReference = async (command: string) => {
  const commandInfo = getCommandInfo(command);
  const sortedArgs = await Promise.all(
    Object.entries(commandInfo.args).map(async ([name, argInfo]): Promise<CliCommandReferenceArg> => {
      const { shortDescription, longDescription } = await parseDescription(argInfo.description);
      return {
        name,
        required: argInfo.required,
        alias: argInfo.alias,
        allowedTypes: argInfo.allowedTypes,
        allowedValues: argInfo.allowedValues,
        shortDescription,
        longDescription
      };
    })
  );
  sortedArgs.sort((argA, argB) => {
    if (argA.required !== argB.required) {
      return argA.required ? -1 : 1;
    }
    return argA.name.localeCompare(argB.name);
  });
  return { command, sortedArgs };
};

// Capitalize a kebab-cased URL segment for navigation headers. "configuration-files" → "Configuration Files".
const titleCaseSegment = (segment: string) =>
  segment
    .split('-')
    .map((word) => (word.length === 0 ? word : word[0].toUpperCase() + word.slice(1)))
    .join(' ');

// Decide the group header for a page in the navigation index. Two-level for sections that
// naturally split (resources/<category>, packaging/<function|containers>, configuration/triggers,
// reference/troubleshooting); single-level for everything else.
const getNavigationGroupKey = (page: PageDefinition): string => {
  const segments = page.route.split('/');
  if (segments[0] === 'resources' && segments.length >= 3) {
    return `Resources / ${titleCaseSegment(segments[1])}`;
  }
  if (segments[0] === 'packaging' && segments.length >= 3) {
    return `Packaging / ${titleCaseSegment(segments[1])}`;
  }
  if (segments[0] === 'configuration' && segments[1] === 'triggers' && segments.length >= 3) {
    return 'Configuration / Triggers';
  }
  if (segments.length === 1) {
    return 'Root';
  }
  return titleCaseSegment(segments[0]);
};

// Build the navigation index injected into writer + verifier prompts. Renders every page
// in pageDefinitions grouped by section, ordered by each page's `order`. The verifier uses
// this to flag invented cross-link routes as high-severity issues.
const buildNavigationIndex = (): string => {
  const groups = new Map<string, PageDefinition[]>();
  for (const p of pageDefinitions) {
    const key = getNavigationGroupKey(p);
    const list = groups.get(key);
    if (list) {
      list.push(p);
    } else {
      groups.set(key, [p]);
    }
  }
  const sortedGroups = [...groups.entries()]
    .map(([key, pages]) => ({ key, pages: [...pages].sort((a, b) => a.order - b.order) }))
    .sort((a, b) => a.pages[0].order - b.pages[0].order);

  const lines: string[] = [];
  for (const { key, pages } of sortedGroups) {
    lines.push(`${key}:`);
    for (const p of pages) {
      const desc = (p.shortDescription || '').replace(/\s+/g, ' ').trim();
      lines.push(`- /${p.route} — ${desc}`);
    }
    lines.push('');
  }
  return lines.join('\n').trim();
};

export const buildContextPack = async ({
  page,
  examplePath
}: {
  page: PageDefinition;
  examplePath?: string;
}): Promise<ContextPack> => {
  const structurePlan = (await safeReadFile(join(docsRoot, 'DOCS_STRUCTURE_PLAN.md'))) || '';
  const pipelinePlan = (await safeReadFile(join(docsRoot, 'DOCS_PIPELINE_PLAN.md'))) || '';
  const styleGuide = (await safeReadFile(styleGuidePath)) || '';
  const sectionInstructionsConfig = await loadSectionInstructionsConfig();

  const globMatches = await Promise.all((page.sourceGlobs || []).map((pattern) => glob(pattern, { absolute: true })));
  const autoSources = await resolveAutoAugmentedSources({ page });
  const sourceFiles = unique([...(page.sourceFiles || []), ...globMatches.flat(), ...autoSources]);
  const sourceFileResults = await Promise.all(
    sourceFiles.map(async (filePath) => {
      if (!(await pathExists(filePath))) {
        return { filePath, content: null };
      }
      return { filePath, content: await safeReadFile(filePath) };
    })
  );
  const missingSourceFiles = sourceFileResults
    .filter((result) => result.content === null)
    .map((result) => result.filePath);
  if (missingSourceFiles.length > 0) {
    console.warn(`  Missing ${missingSourceFiles.length} configured source file(s) for /${page.route}:`);
    for (const filePath of missingSourceFiles) {
      console.warn(`    - ${filePath}`);
    }
  }
  const sourceDocuments = sourceFileResults
    .filter((result): result is { filePath: string; content: string } => result.content !== null)
    .map(({ filePath, content }) => ({ filePath, content: truncateIfNeeded(content, filePath) }));

  // Virtual source: pricing summary distilled from @generated/aws-price/prices.json.
  // Avoids inlining a 300+ KB JSON for a few pricing facts.
  if (page.kind === 'resource') {
    const slug = resolveResourceSlugFromRoute(page.route);
    if (slug) {
      const pricingMarkdown = await getPricingSummary(slug);
      if (pricingMarkdown) {
        sourceDocuments.push({
          filePath: `@generated/aws-price/distilled/${slug}.md`,
          content: pricingMarkdown
        });
      }
    }
  }

  const cliCommandReference = page.cliCommand ? await buildCliCommandReference(page.cliCommand) : undefined;
  const exampleContent = examplePath ? await safeReadFile(examplePath) : undefined;

  return {
    page,
    structurePlan,
    pipelinePlan,
    styleGuide,
    navigationIndex: buildNavigationIndex(),
    backboneSections: getBackboneSections(page.template),
    sectionInstructions: resolveSectionInstructions({ config: sectionInstructionsConfig, page }),
    exampleDocument: examplePath && exampleContent ? { filePath: examplePath, content: exampleContent } : undefined,
    missingSourceFiles,
    cliCommandReference,
    sourceDocuments
  };
};
