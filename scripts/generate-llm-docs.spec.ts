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
      pages: Array<{ outputPath: string }>;
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

    expect(manifest.pages.length).toBeGreaterThan(100);
    expect(chunks.length).toBeGreaterThan(1000);
    expect(lexicalIndex.schemaVersion).toBe(1);
    expect(lexicalIndex.totalDocs).toBe(chunks.length);
    expect(lexicalIndex.docs.length).toBe(chunks.length);
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
});
