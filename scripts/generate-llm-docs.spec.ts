import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { LLM_DOCS_FOLDER_PATH } from '@shared/naming/project-fs-paths';

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
  test('contains the expected manifest and chunk files', async () => {
    const manifest = JSON.parse(await readFile(join(LLM_DOCS_FOLDER_PATH, 'index.json'), 'utf-8')) as {
      version: string;
      pages: Array<{ outputPath: string; docKind: string }>;
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
    expect(manifest.pages.filter((page) => page.docKind === 'docs-page').length).toBeGreaterThan(150);
    expect(manifest.pages.filter((page) => page.docKind === 'config-reference').length).toBeGreaterThan(400);
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
});
