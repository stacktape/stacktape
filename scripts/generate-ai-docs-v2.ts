import { basename, join } from 'node:path';
import { AI_DOCS_FOLDER_PATH } from '@shared/naming/project-fs-paths';
import { logInfo, logSuccess } from '@shared/utils/logging';
import { emptyDir, ensureDir, pathExists, readFile, readdir, writeFile } from 'fs-extra';

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPES_DIR = 'types/stacktape-config';
const CURATED_DOCS_DIR = 'docs/_curated-docs';
const COMMANDS_FILE = 'src/config/cli/commands.ts';
const OPTIONS_FILE = 'src/config/cli/options.ts';

const SYNONYM_MAP: Record<string, string[]> = {
  function: ['lambda', 'serverless', 'faas'],
  'web-service': ['container', 'docker', 'ecs', 'fargate', 'http-service'],
  'worker-service': ['background', 'worker', 'async-worker'],
  'private-service': ['internal-service', 'vpc-service'],
  'batch-job': ['batch', 'job', 'scheduled-job'],
  'multi-container-workload': ['multi-container', 'sidecar'],
  'nextjs-web': ['nextjs', 'next.js', 'next', 'ssr'],
  'astro-web': ['astro', 'astro.js'],
  'nuxt-web': ['nuxt', 'nuxt.js'],
  'sveltekit-web': ['sveltekit', 'svelte'],
  'solidstart-web': ['solidstart', 'solid'],
  'tanstack-web': ['tanstack', 'tanstack-start'],
  'remix-web': ['remix'],
  'relational-database': ['rds', 'postgres', 'postgresql', 'mysql', 'database', 'db', 'sql', 'aurora'],
  'dynamo-db-table': ['dynamodb', 'nosql', 'document-db'],
  'redis-cluster': ['elasticache', 'redis', 'cache'],
  bucket: ['s3', 'storage', 'object-storage'],
  'hosting-bucket': ['static-site', 'static-website', 'spa'],
  'http-api-gateway': ['api-gateway', 'apigateway', 'gateway', 'api'],
  'application-load-balancer': ['alb', 'load-balancer'],
  'network-load-balancer': ['nlb'],
  cdn: ['cloudfront', 'distribution'],
  'user-auth-pool': ['cognito', 'auth', 'authentication'],
  'event-bus': ['eventbridge', 'events'],
  'sns-topic': ['sns', 'notification', 'pubsub'],
  'sqs-queue': ['sqs', 'queue', 'message-queue'],
  'state-machine': ['step-functions', 'stepfunctions', 'workflow'],
  'efs-filesystem': ['efs', 'filesystem', 'persistent-storage'],
  bastion: ['jump-host', 'ssh'],
  'web-app-firewall': ['waf', 'firewall'],
  'mongo-db-atlas-cluster': ['mongodb', 'mongo'],
  'upstash-redis': ['upstash'],
  'open-search': ['opensearch', 'elasticsearch', 'elastic'],
  'custom-resource': ['cloudformation-custom'],
  'deployment-script': ['deploy-script', 'migration-script'],
  'kinesis-stream': ['kinesis', 'streaming'],
  'aws-cdk-construct': ['cdk', 'construct']
};

// Maps .d.ts filename (without extension) to the resource `type` value used in config
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
  'open-search': 'open-search',
  'custom-resources': 'custom-resource',
  'deployment-script': 'deployment-script',
  'aws-cdk-construct': 'aws-cdk-construct',
  'kinesis-streams': 'kinesis-stream',
  'edge-lambda-functions': 'edge-lambda-function'
};

// Files to skip in config-ref generation (internal helpers, not user-facing resources)
const SKIP_TYPE_FILES = [
  '__helpers.d.ts',
  'alarm-metrics.d.ts',
  'deployment-artifacts.d.ts',
  'guardrails.d.ts',
  'notifications.d.ts',
  'providers.d.ts',
  'user-integrations.d.ts',
  'ssr-web-shared.d.ts'
];

type DocType = 'config-ref' | 'cli-ref' | 'concept' | 'recipe' | 'troubleshooting' | 'getting-started';

type ManifestEntry = {
  path: string;
  docType: DocType;
  title: string;
  resourceType?: string;
  tags: string[];
  priority: number;
};

// ─── Utilities ───────────────────────────────────────────────────────────────

const buildFrontmatter = (fields: Record<string, string | string[] | number | undefined>): string => {
  const lines = ['---'];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue; // skip empty arrays
      lines.push(`${key}:`);
      for (const item of value) lines.push(`  - ${item}`);
    } else {
      lines.push(`${key}: ${typeof value === 'string' && value.includes(':') ? `"${value}"` : value}`);
    }
  }
  lines.push('---');
  return lines.join('\n');
};

const extractInterfaceJsdocTitle = (content: string): string | undefined => {
  // Match the first JSDoc `#### ...` heading before an interface — used as subtitle/description
  const match = content.match(/\/\*\*[\s\S]*?####\s+(.+?)[\s]*\n[\s\S]*?\*\/\s*\ninterface/);
  return match?.[1]?.trim();
};

const extractInterfaceName = (content: string): string | undefined => {
  // Extract the first interface name (e.g., LambdaFunction, WebService)
  const match = content.match(/interface\s+(\w+)\s*\{/);
  return match?.[1];
};

const pascalToSpaced = (str: string): string =>
  str.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');

const extractInterfaceJsdocDescription = (content: string): string | undefined => {
  // Match the first JSDoc block: get everything after `---` up to `*/`
  const match = content.match(/\/\*\*[\s\S]*?---\s*\n\s*\*\s*([\s\S]*?)\s*\*\/\s*\ninterface/);
  if (!match) return undefined;
  return match[1]
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, '').trim())
    .filter(Boolean)
    .join('\n');
};

const extractResourceTypeValue = (content: string): string | undefined => {
  const match = content.match(/type:\s*'([^']+)'/);
  return match?.[1];
};

const cleanTypeContent = (content: string): string => {
  // Remove internal Stp* type definitions
  let cleaned = content.replace(/^type Stp\w[\s\S]*?(?=\n(?:\/\*\*|interface|type [A-Z]|$))/gm, '');
  // Remove empty lines resulting from removal
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  return cleaned.trim();
};

const kebabCase = (str: string): string =>
  str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase();

// ─── Config Reference Generator ─────────────────────────────────────────────

const generateConfigRef = async (distPath: string): Promise<ManifestEntry[]> => {
  const configRefDir = join(distPath, 'config-ref');
  await ensureDir(configRefDir);

  const entries: ManifestEntry[] = [];
  const typeFiles = await readdir(TYPES_DIR);

  for (const file of typeFiles) {
    if (!file.endsWith('.d.ts')) continue;
    if (SKIP_TYPE_FILES.includes(file)) continue;

    const fileStem = file.replace('.d.ts', '');
    const content = await readFile(join(TYPES_DIR, file), 'utf-8');

    // Determine resource type and title
    const resourceType = FILENAME_TO_RESOURCE_TYPE[fileStem] || extractResourceTypeValue(content);
    const interfaceName = extractInterfaceName(content);
    const jsdocSubtitle = extractInterfaceJsdocTitle(content);
    const jsdocDescription = extractInterfaceJsdocDescription(content);

    // Build a human-friendly title from the interface name (e.g., LambdaFunction → Lambda Function)
    const title = interfaceName
      ? pascalToSpaced(interfaceName)
      : fileStem
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase())
          .replace(/^_/, '');

    // Build tags from synonym map + resource type
    const tags: string[] = [];
    if (resourceType) {
      tags.push(resourceType);
      const synonyms = SYNONYM_MAP[resourceType];
      if (synonyms) tags.push(...synonyms);
    }
    // Fallback tags for files without a resource type (e.g., _root, events, shared types)
    if (tags.length === 0) {
      tags.push(fileStem.replace(/^_/, ''));
      if (fileStem === '_root') tags.push('config', 'stacktape-config', 'top-level');
    }

    // Clean type content (remove Stp* internals)
    const cleanedContent = cleanTypeContent(content);

    // Determine output filename
    const outputName = fileStem === '_root' ? '_root.md' : `${resourceType || fileStem}.md`;
    const relativePath = `config-ref/${outputName}`;

    // Build markdown
    const frontmatter = buildFrontmatter({
      docType: 'config-ref',
      title,
      resourceType,
      tags,
      source: `types/stacktape-config/${file}`,
      priority: 1
    });

    let body = `# ${title}\n\n`;
    if (jsdocSubtitle) body += `${jsdocSubtitle}\n\n`;
    if (jsdocDescription) body += `${jsdocDescription}\n\n`;
    if (resourceType) body += `Resource type: \`${resourceType}\`\n\n`;
    body += `## TypeScript Definition\n\n\`\`\`typescript\n${cleanedContent}\n\`\`\`\n`;

    await writeFile(join(configRefDir, outputName), `${frontmatter}\n\n${body}`, 'utf-8');

    entries.push({
      path: relativePath,
      docType: 'config-ref',
      title,
      resourceType,
      tags,
      priority: 1
    });
  }

  return entries;
};

// ─── CLI Reference Generator ─────────────────────────────────────────────────

const generateCliRef = async (distPath: string): Promise<ManifestEntry[]> => {
  const cliRefDir = join(distPath, 'cli-ref');
  await ensureDir(cliRefDir);

  const entries: ManifestEntry[] = [];

  // Read commands file as text and extract command definitions
  const commandsContent = await readFile(COMMANDS_FILE, 'utf-8');

  // Parse command blocks: name, description, requiredArgs
  // Matches both quoted keys ('deploy:dev') and bare keys (deploy)
  // Description uses template literals that may contain escaped backticks (\`)
  const commandRegex =
    /(?:['"]([a-z:_-]+)['"]|([a-z][a-zA-Z]*))\s*:\s*\{[\s\S]*?description:\s*`((?:[^`\\]|\\.)*)`,[\s\S]*?requiredArgs:\s*\[([\s\S]*?)\]\s*as\s*const/g;

  let match;
  // eslint-disable-next-line no-cond-assign
  while ((match = commandRegex.exec(commandsContent)) !== null) {
    const commandName = match[1] || match[2]; // match[1] = quoted key, match[2] = bare key
    const description = match[3].replace(/\\`/g, '`').trim();
    const requiredArgsRaw = match[4];
    const requiredArgs = [...requiredArgsRaw.matchAll(/'([^']+)'/g)].map((m) => m[1]);

    // Extract arg names from the block between this command's { and the next
    const blockStart = match.index!;
    const argsMatch = commandsContent.slice(blockStart).match(/args:\s*\{([\s\S]*?)\}/);
    const argNames: string[] = [];
    if (argsMatch) {
      const argBlock = argsMatch[1];
      for (const argMatch of argBlock.matchAll(/(\w+)(?::\s|\.\.\.)/g) || []) {
        const name = argMatch[1];
        // Skip spread groups
        if (!['universalArgs', 'stackArgs', 'configDependentArgs'].includes(name)) {
          argNames.push(name);
        }
      }
    }

    const fileName = `${commandName.replace(/:/g, '-')}.md`;
    const relativePath = `cli-ref/${fileName}`;
    const title = `CLI: ${commandName}`;

    // Deduplicate tags (single-word commands would duplicate otherwise)
    const tags = [...new Set([commandName, ...commandName.split(':')])];

    const frontmatter = buildFrontmatter({
      docType: 'cli-ref',
      title,
      tags,
      source: 'src/config/cli/commands.ts',
      priority: 3
    });

    let body = `# \`stacktape ${commandName}\`\n\n`;
    body += `${description}\n\n`;

    if (requiredArgs.length > 0) {
      body += `## Required Arguments\n\n`;
      for (const arg of requiredArgs) body += `- \`--${arg}\`\n`;
      body += '\n';
    }

    body += `## Usage\n\n`;
    body += `\`\`\`bash\nstacktape ${commandName}`;
    for (const arg of requiredArgs) body += ` --${arg} <value>`;
    body += `\n\`\`\`\n`;

    await writeFile(join(cliRefDir, fileName), `${frontmatter}\n\n${body}`, 'utf-8');

    entries.push({
      path: relativePath,
      docType: 'cli-ref',
      title,
      tags,
      priority: 3
    });
  }

  return entries;
};

// ─── Curated Docs Copier ─────────────────────────────────────────────────────

const DOC_TYPE_MAP: Record<string, DocType> = {
  concepts: 'concept',
  'getting-started': 'getting-started',
  recipes: 'recipe',
  troubleshooting: 'troubleshooting'
};

const PRIORITY_MAP: Record<DocType, number> = {
  'config-ref': 1,
  recipe: 1,
  concept: 1,
  troubleshooting: 2,
  'getting-started': 2,
  'cli-ref': 3
};

const copyCuratedDocs = async (distPath: string): Promise<ManifestEntry[]> => {
  const entries: ManifestEntry[] = [];

  if (!(await pathExists(CURATED_DOCS_DIR))) {
    logInfo('No curated docs found, skipping');
    return entries;
  }

  const categories = await readdir(CURATED_DOCS_DIR, { withFileTypes: true });

  for (const category of categories) {
    if (!category.isDirectory()) continue;

    const docType = DOC_TYPE_MAP[category.name];
    if (!docType) {
      logInfo(`Skipping unknown curated docs category: ${category.name}`);
      continue;
    }

    const outputDir = join(distPath, docType);
    await ensureDir(outputDir);

    const categoryPath = join(CURATED_DOCS_DIR, category.name);
    const files = await readdir(categoryPath);

    for (const file of files) {
      if (!file.endsWith('.mdx') && !file.endsWith('.md')) continue;

      const content = await readFile(join(categoryPath, file), 'utf-8');

      // Extract existing frontmatter title
      const titleMatch = content.match(/^---[\s\S]*?title:\s*['"]?([^'"\n]+)['"]?[\s\S]*?---/);
      const title = titleMatch?.[1]?.trim() || basename(file, '.mdx').replace(/-/g, ' ');

      // Strip existing frontmatter
      const bodyContent = content.replace(/^---[\s\S]*?---\n*/, '').trim();

      // Clean MDX-specific elements
      const cleanedBody = bodyContent
        .replace(/<[A-Z][^>]*\/>/g, '') // self-closing JSX
        .replace(/<[A-Z][^>]*>[\s\S]*?<\/[A-Z][A-Za-z0-9]*>/g, '') // JSX blocks
        .replace(/<br\s*\/?>/g, '') // br tags
        .replace(/!\[.*?\]\(.*?\)/g, '') // images
        .replace(/<img[^>]*>/g, '') // img tags
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      if (!cleanedBody) continue;

      const outputFileName = basename(file, '.mdx') + '.md';
      const relativePath = `${docType}/${outputFileName}`;

      // Build tags from title words + category
      const tags = title
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 2);
      tags.push(docType);

      const priority = PRIORITY_MAP[docType];

      const frontmatter = buildFrontmatter({
        docType,
        title,
        tags,
        source: `docs/_curated-docs/${category.name}/${file}`,
        priority
      });

      await writeFile(join(outputDir, outputFileName), `${frontmatter}\n\n${cleanedBody}\n`, 'utf-8');

      entries.push({
        path: relativePath,
        docType,
        title,
        tags,
        priority
      });
    }
  }

  return entries;
};

// ─── Manifest Generator ──────────────────────────────────────────────────────

const generateManifest = async (distPath: string, entries: ManifestEntry[]): Promise<void> => {
  const manifest = {
    generatedAt: new Date().toISOString(),
    version: '1.0',
    synonymMap: SYNONYM_MAP,
    files: entries.sort((a, b) => a.priority - b.priority || a.path.localeCompare(b.path))
  };

  await writeFile(join(distPath, 'index.json'), JSON.stringify(manifest, null, 2), 'utf-8');
};

// ─── Main ────────────────────────────────────────────────────────────────────

const generateAiDocsV2 = async ({ distFolderPath }: { distFolderPath: string }) => {
  logInfo('Generating AI documentation (v2)...');

  await ensureDir(distFolderPath);
  await emptyDir(distFolderPath);

  const allEntries: ManifestEntry[] = [];

  // 1. Config reference from TypeScript types
  logInfo('Generating config reference...');
  const configRefEntries = await generateConfigRef(distFolderPath);
  allEntries.push(...configRefEntries);
  logInfo(`  Generated ${configRefEntries.length} config-ref files`);

  // 2. CLI reference from command definitions
  logInfo('Generating CLI reference...');
  const cliRefEntries = await generateCliRef(distFolderPath);
  allEntries.push(...cliRefEntries);
  logInfo(`  Generated ${cliRefEntries.length} cli-ref files`);

  // 3. Curated docs (concepts, recipes, troubleshooting, getting-started)
  logInfo('Copying curated docs...');
  const curatedEntries = await copyCuratedDocs(distFolderPath);
  allEntries.push(...curatedEntries);
  logInfo(`  Copied ${curatedEntries.length} curated doc files`);

  // 4. Generate manifest
  logInfo('Generating manifest...');
  await generateManifest(distFolderPath, allEntries);

  logSuccess(`Done! Generated ${allEntries.length} files in ${distFolderPath}/`);
};

if (import.meta.main) {
  generateAiDocsV2({ distFolderPath: AI_DOCS_FOLDER_PATH });
}

export { generateAiDocsV2 };
