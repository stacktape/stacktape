import { mkdir, mkdtemp, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { LLM_DOCS_FOLDER_PATH } from '@shared/naming/project-fs-paths';
import { compareLlmDocPaths, installGeneratedCorpus, recoverInterruptedCorpus } from './generate-llm-docs';
import { htmlToMarkdownText } from './llm-docs/html-to-markdown';

const WORKSPACE_ROOT = join(process.cwd(), '..', '..');
const DOCS_SOURCE_DIR = join(WORKSPACE_ROOT, 'apps', 'docs', 'content');
const normalizePath = (filePath: string) => filePath.replaceAll('\\', '/');

const listFiles = async (dir: string): Promise<string[]> => {
  const entries = await readdir(dir);
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(dir, entry);
      const entryStat = await stat(entryPath);
      return entryStat.isDirectory() ? listFiles(entryPath) : [entryPath];
    })
  );
  return files.flat();
};

describe('generated LLM docs corpus', () => {
  test('sorts paths ordinally after normalizing platform separators', () => {
    expect(
      ['zeta\\last.mdx', 'alpha/shared.mdx', 'alpha\\first.mdx', 'zeta/first.mdx'].sort(compareLlmDocPaths)
    ).toEqual(['alpha\\first.mdx', 'alpha/shared.mdx', 'zeta/first.mdx', 'zeta\\last.mdx']);
    expect(htmlToMarkdownText('<p>&quot;A&quot; &amp; B &#39;C&#39; &#x1F680; &copy;</p>')).toBe(`"A" & B 'C' 🚀 ©`);
  });

  test('recovers the last valid corpus after an interrupted swap', async () => {
    const fixture = await mkdtemp(join(tmpdir(), 'stacktape-llm-doc-recovery-'));
    const distDirectory = join(fixture, 'llm-docs');
    const backupDirectory = `${distDirectory}.previous`;
    try {
      await mkdir(backupDirectory);
      await writeFile(join(backupDirectory, 'index.json'), '{"version":"last-valid"}\n');

      await recoverInterruptedCorpus(distDirectory);

      await expect(readFile(join(distDirectory, 'index.json'), 'utf-8')).resolves.toContain('last-valid');
      await expect(stat(backupDirectory)).rejects.toThrow();
    } finally {
      await rm(fixture, { recursive: true, force: true });
    }
  });

  test('restores the current corpus when installing a staged corpus fails', async () => {
    const fixture = await mkdtemp(join(tmpdir(), 'stacktape-llm-doc-install-'));
    const distDirectory = join(fixture, 'llm-docs');
    const stagingDirectory = join(fixture, 'staging');
    try {
      await mkdir(distDirectory);
      await mkdir(stagingDirectory);
      await writeFile(join(distDirectory, 'index.json'), '{"version":"current"}\n');
      await writeFile(join(stagingDirectory, 'index.json'), '{"version":"next"}\n');

      await expect(
        installGeneratedCorpus({
          distDirectory,
          stagingDirectory,
          renameDirectory: async (source, destination) => {
            if (source === stagingDirectory && destination === distDirectory)
              throw new Error('injected install failure');
            await rename(source, destination);
          }
        })
      ).rejects.toThrow('injected install failure');

      await expect(readFile(join(distDirectory, 'index.json'), 'utf-8')).resolves.toContain('current');
      await expect(stat(`${distDirectory}.previous`)).rejects.toThrow();
    } finally {
      await rm(fixture, { recursive: true, force: true });
    }
  });

  test('contains the expected manifest and chunk files', async () => {
    const manifest = JSON.parse(await readFile(join(LLM_DOCS_FOLDER_PATH, 'index.json'), 'utf-8')) as {
      generatedAt?: string;
      sourceRoots: string[];
      version: string;
      pages: Array<{ outputPath: string; sourcePath: string; docKind: string }>;
    };
    const lexicalIndex = JSON.parse(await readFile(join(LLM_DOCS_FOLDER_PATH, 'lexical-index.json'), 'utf-8')) as {
      docs: unknown[];
      totalDocs: number;
      schemaVersion: number;
    };
    const chunks = (await readFile(join(LLM_DOCS_FOLDER_PATH, 'chunks', 'chunks.jsonl'), 'utf-8'))
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as { id: string });

    expect(manifest.version).toBe('0.2');
    expect(manifest.generatedAt).toBeUndefined();
    expect(manifest.sourceRoots).toContain('apps/docs/content');
    expect(manifest.sourceRoots).toContain('packages/config/src');
    expect(manifest.sourceRoots).toContain('apps/cli/types/stacktape-config');
    const docsPages = manifest.pages.filter((page) => page.docKind === 'docs-page');
    const configPages = manifest.pages.filter((page) => page.docKind === 'config-reference');
    expect(docsPages).toHaveLength(194);
    expect(configPages).toHaveLength(414);
    expect(manifest.pages).toHaveLength(608);

    const canonicalSourcePaths = (await listFiles(DOCS_SOURCE_DIR))
      .filter((file) => file.endsWith('.mdx'))
      .map((file) => normalizePath(relative(WORKSPACE_ROOT, file)))
      .sort(compareLlmDocPaths);
    expect(docsPages.map((page) => page.sourcePath).sort(compareLlmDocPaths)).toEqual(canonicalSourcePaths);

    await Promise.all(
      manifest.pages.map((page) => expect(stat(join(LLM_DOCS_FOLDER_PATH, page.outputPath))).resolves.toBeDefined())
    );
    const generatedMarkdownPaths = (
      await Promise.all([
        listFiles(join(LLM_DOCS_FOLDER_PATH, 'pages')),
        listFiles(join(LLM_DOCS_FOLDER_PATH, 'config-reference'))
      ])
    )
      .flat()
      .filter((file) => file.endsWith('.md'))
      .map((file) => normalizePath(relative(LLM_DOCS_FOLDER_PATH, file)))
      .sort(compareLlmDocPaths);
    expect(generatedMarkdownPaths).toEqual(manifest.pages.map((page) => page.outputPath).sort(compareLlmDocPaths));
    expect(await listFiles(LLM_DOCS_FOLDER_PATH)).toHaveLength(614);
    expect(chunks.length).toBeGreaterThan(1000);
    expect(lexicalIndex.schemaVersion).toBe(1);
    expect(lexicalIndex.totalDocs).toBe(chunks.length);
    expect(lexicalIndex.docs.length).toBe(chunks.length);
    await expect(readFile(join(LLM_DOCS_FOLDER_PATH, 'llms.txt'), 'utf-8')).resolves.toContain(
      '/llms-api-reference.txt'
    );
    await expect(readFile(join(LLM_DOCS_FOLDER_PATH, 'llms-full.txt'), 'utf-8')).resolves.toContain(
      '# LambdaFunctionProps API Reference'
    );
    await expect(readFile(join(LLM_DOCS_FOLDER_PATH, 'llms-api-reference.txt'), 'utf-8')).resolves.toContain(
      '# LambdaFunctionProps API Reference'
    );
  });

  test('does not contain duplicate output paths or chunk ids', async () => {
    const manifest = JSON.parse(await readFile(join(LLM_DOCS_FOLDER_PATH, 'index.json'), 'utf-8')) as {
      pages: Array<{ outputPath: string }>;
    };
    const chunks = (await readFile(join(LLM_DOCS_FOLDER_PATH, 'chunks', 'chunks.jsonl'), 'utf-8'))
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as { id: string });

    expect(new Set(manifest.pages.map((page) => page.outputPath)).size).toBe(manifest.pages.length);
    expect(new Set(chunks.map((chunk) => chunk.id)).size).toBe(chunks.length);
  });

  test('does not contain stale old-docs terms or placeholder component notes', async () => {
    const files = await listFiles(LLM_DOCS_FOLDER_PATH);
    const stalePatterns = [/LLM docs note/, /ai-docs/, /AI_DOCS/, /\bdocType\b/, /config-ref(?!erence)/, /cli-ref\b/];

    for (const file of files) {
      const content = await readFile(file, 'utf-8');
      expect(stalePatterns.some((pattern) => pattern.test(content))).toBe(false);
    }
  });

  test('renders every block MDX component and keeps chunks retrieval-sized', async () => {
    const pageFiles = await listFiles(join(LLM_DOCS_FOLDER_PATH, 'pages'));
    for (const file of pageFiles) {
      const content = await readFile(file, 'utf-8');
      expect(content).not.toMatch(/^[ \t]*<[A-Z][A-Za-z0-9]*\b/m);
      expect(content).not.toContain('@@LLM_DOCS_');
    }

    const chunks = (await readFile(join(LLM_DOCS_FOLDER_PATH, 'chunks', 'chunks.jsonl'), 'utf-8'))
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as { content: string });
    expect(Math.max(...chunks.map((chunk) => chunk.content.length))).toBeLessThan(20_000);
  });

  test('keeps llms.txt concise and puts the complete API reference in dedicated corpora', async () => {
    const concise = await readFile(join(LLM_DOCS_FOLDER_PATH, 'llms.txt'), 'utf-8');
    const full = await readFile(join(LLM_DOCS_FOLDER_PATH, 'llms-full.txt'), 'utf-8');
    const api = await readFile(join(LLM_DOCS_FOLDER_PATH, 'llms-api-reference.txt'), 'utf-8');
    const lambdaReference = await readFile(
      join(LLM_DOCS_FOLDER_PATH, 'config-reference', 'function', 'lambdafunctionprops.md'),
      'utf-8'
    );

    expect(concise.length).toBeLessThan(100_000);
    expect(concise).not.toContain('## Property: `timeout`');
    expect(api).toContain('## Property: `timeout`');
    expect(lambdaReference).toContain('- Default: `10`');
    expect(lambdaReference).toContain('### Example 1 (yaml)');
    expect(full.match(/^# LambdaFunctionProps API Reference$/gm)).toHaveLength(1);
  });

  test('renders generated CLI props containing HTML strings and documentation-only API types', async () => {
    const cliPage = await readFile(join(LLM_DOCS_FOLDER_PATH, 'pages', 'cli', 'aws-profile-update.md'), 'utf-8');
    const alarmReference = await readFile(
      join(LLM_DOCS_FOLDER_PATH, 'config-reference', 'alarms', 'alarmdefinition.md'),
      'utf-8'
    );

    expect(cliPage).toContain('| `--logLevel (-ll)` |');
    expect(cliPage).not.toContain('<CliCommandsApiReference');
    expect(alarmReference).toContain('## Property: `trigger`');
    expect(alarmReference).toContain('## Property: `forStages`');
  });

  test('renders live CLI option metadata as ordered, table-safe prose', async () => {
    const cliPages = await listFiles(join(LLM_DOCS_FOLDER_PATH, 'pages', 'cli'));
    for (const file of cliPages) {
      const optionRows = (await readFile(file, 'utf-8')).split(/\r?\n/).filter((line) => line.startsWith('| `--'));
      expect(optionRows.join('\n')).not.toContain('####');
      expect(optionRows.join('\n')).not.toMatch(/\s---\s/);
    }

    const awsCallPage = await readFile(join(LLM_DOCS_FOLDER_PATH, 'pages', 'cli', 'aws-call.md'), 'utf-8');
    const awsCallOptions = awsCallPage
      .split(/\r?\n/)
      .filter((line) => line.startsWith('| `--'))
      .map((line) => {
        const cells = line.split('|').map((cell) => cell.trim());
        return { name: cells[1].match(/^`--([^ `]+)/)?.[1] ?? '', required: cells[2] === 'yes' };
      });
    const requiredNames = awsCallOptions.filter(({ required }) => required).map(({ name }) => name);
    const optionalNames = awsCallOptions.filter(({ required }) => !required).map(({ name }) => name);
    expect(requiredNames).toEqual(['command', 'region', 'service']);
    expect(optionalNames).toEqual([...optionalNames].sort(compareLlmDocPaths));
    expect(awsCallOptions.findIndex(({ required }) => !required)).toBe(requiredNames.length);
  });

  test('decodes HTML entities from generated API-reference prose and comments', async () => {
    const cachingOptions = await readFile(
      join(LLM_DOCS_FOLDER_PATH, 'config-reference', 'cdn', 'cdncachingoptions.md'),
      'utf-8'
    );
    expect(cachingOptions).toContain("Use `['GET', 'HEAD', 'OPTIONS']`");

    const configReferenceFiles = await listFiles(join(LLM_DOCS_FOLDER_PATH, 'config-reference'));
    const escapedEntity = /&(?:quot|apos|amp|lt|gt|#39|#x27);/i;
    for (const file of configReferenceFiles) {
      expect(await readFile(file, 'utf-8')).not.toMatch(escapedEntity);
    }
  });

  test('does not contain obsolete object-style resource type examples', async () => {
    const files = await listFiles(join(LLM_DOCS_FOLDER_PATH, 'pages'));
    const obsoleteResourceTypePatterns = [
      /type:\s*['"]lambda-function['"]/,
      /type:\s*['"]dynamo-db-table['"]/,
      /type:\s*['"]web-service['"]/,
      /type:\s*['"]relational-database['"]/
    ];

    for (const file of files) {
      const content = await readFile(file, 'utf-8');
      expect(obsoleteResourceTypePatterns.some((pattern) => pattern.test(content))).toBe(false);
    }
  });

  test('renders the starter project gallery as useful text', async () => {
    const content = await readFile(
      join(LLM_DOCS_FOLDER_PATH, 'pages', 'getting-started', 'starter-projects.md'),
      'utf-8'
    );

    expect(content).toContain('stacktape init --starterId <starter-id>');
    expect(content).not.toContain('<StarterProjectGallery');
  });

  test('documents the actual aws:call safety and stack-selection contract everywhere it is represented', async () => {
    const source = await readFile(join(process.cwd(), '..', 'docs', 'content', 'cli', 'aws-call.mdx'), 'utf-8');
    const page = await readFile(join(LLM_DOCS_FOLDER_PATH, 'pages', 'cli', 'aws-call.md'), 'utf-8');
    const full = await readFile(join(LLM_DOCS_FOLDER_PATH, 'llms-full.txt'), 'utf-8');
    const manifestText = await readFile(join(LLM_DOCS_FOLDER_PATH, 'index.json'), 'utf-8');
    const manifest = JSON.parse(manifestText) as {
      pages: Array<{ id: string; sourcePath: string; outputPath: string }>;
    };
    const lexicalIndex = JSON.parse(await readFile(join(LLM_DOCS_FOLDER_PATH, 'lexical-index.json'), 'utf-8')) as {
      docs: Array<{ pageId: string; content: string }>;
    };
    const chunks = (await readFile(join(LLM_DOCS_FOLDER_PATH, 'chunks', 'chunks.jsonl'), 'utf-8'))
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as { pageId: string; content: string });
    const awsCallChunks = chunks
      .filter(({ pageId }) => pageId === 'page:/cli/aws-call')
      .map(({ content }) => content)
      .join('\n');
    const awsCallLexicalEntries = lexicalIndex.docs
      .filter(({ pageId }) => pageId === 'page:/cli/aws-call')
      .map(({ content }) => content)
      .join('\n');
    const awsCallManifestEntry = manifest.pages.find(({ id }) => id === 'page:/cli/aws-call');

    for (const representation of [source, page, full, awsCallChunks, awsCallLexicalEntries]) {
      expect(representation).toContain('explicit allowlist');
      expect(representation).toContain('BatchWriteItem');
      expect(representation).toContain('ReceiveMessage');
      expect(representation).toContain('deployed');
      expect(representation).toContain('debug role');
      expect(representation).toContain('defaults');
    }
    expect(awsCallManifestEntry).toEqual(
      expect.objectContaining({
        sourcePath: 'apps/docs/content/cli/aws-call.mdx',
        outputPath: 'pages/cli/aws-call.md'
      })
    );
    expect(page.match(/^# aws:call$/gm)).toHaveLength(1);
    expect(page).not.toMatch(/^(?:import|export)\s/m);

    const staleClaims = [
      'prefix-based read-only guard',
      'allowed command prefix',
      'five allowed prefixes',
      'BatchWriteItem would pass',
      'does not require a Stacktape configuration file. It operates directly against the AWS API',
      'The --stage and --projectName flags are accepted but optional'
    ];
    for (const representation of [source, page, full, awsCallChunks, awsCallLexicalEntries, manifestText]) {
      for (const staleClaim of staleClaims) expect(representation).not.toContain(staleClaim);
    }
  });

  test('keeps the enhanced documentation schema separate from the canonical validation schema', async () => {
    const canonical = JSON.parse(
      await readFile(join(process.cwd(), '..', '..', 'packages', 'config', 'generated', 'config-schema.json'), 'utf-8')
    ) as { definitions: Record<string, unknown> };
    const enhanced = JSON.parse(
      await readFile(join(process.cwd(), '@generated', 'schemas', 'enhanced-config-schema.json'), 'utf-8')
    ) as {
      definitions: Record<
        string,
        {
          anyOf?: unknown[];
          properties?: Record<string, { $ref?: string }>;
        }
      >;
    };

    expect(enhanced.definitions.AlarmDefinition).toBeDefined();
    expect(enhanced.definitions.LogForwardingBase).toBeDefined();
    expect(Object.keys(enhanced.definitions.AlarmDefinition.properties ?? {})).toEqual([
      'name',
      'trigger',
      'forServices',
      'forStages',
      'evaluation',
      'notificationTargets',
      'includeInHistory',
      'description'
    ]);
    expect(enhanced.definitions.AlarmDefinition.properties?.trigger?.$ref).toBe('#/definitions/AlarmTrigger');
    expect(enhanced.definitions.AlarmTrigger.anyOf).toHaveLength(15);
    const alarmDefinitionPage = await readFile(
      join(process.cwd(), '@generated', 'llm-docs', 'config-reference', 'alarms', 'alarmdefinition.md'),
      'utf-8'
    );
    const manifest = JSON.parse(
      await readFile(join(process.cwd(), '@generated', 'llm-docs', 'index.json'), 'utf-8')
    ) as {
      pages: Array<{ definitionNames: string[]; sourcePath: string }>;
    };
    expect(manifest.pages.find(({ definitionNames }) => definitionNames.includes('AlarmDefinition'))?.sourcePath).toBe(
      'packages/config/src/alarms.ts'
    );
    expect(alarmDefinitionPage).toContain('## Property: `notificationTargets`');
    expect(alarmDefinitionPage).not.toContain('trigger: unknown');
    expect(alarmDefinitionPage).not.toContain('- Type: `unknown`');
    expect(JSON.stringify(enhanced)).toContain('_MdxDesc');
    expect(JSON.stringify(enhanced)).toContain('_examples');
    expect(JSON.stringify(canonical)).not.toContain('_MdxDesc');
    expect(JSON.stringify(canonical)).not.toContain('_examples');
  });
});
