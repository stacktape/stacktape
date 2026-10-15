import { test, expect } from 'bun:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateLlmDocs } from '../generate-llm-docs';

test('generates a retrievable corpus with unique identities and readable, accurate documentation', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-mcp-corpus-'));
  const outputDirectory = join(directory, 'corpus');
  try {
    await generateLlmDocs({ outputDirectory, apiReferenceDataPath: join(directory, 'api-reference-data.json') });
    const manifest = JSON.parse(await readFile(join(outputDirectory, 'index.json'), 'utf8')) as {
      pages: Array<{ id: string; route: string; outputPath: string; docKind: string; chunks: string[] }>;
    };
    const chunks = (await readFile(join(outputDirectory, 'chunks/chunks.jsonl'), 'utf8'))
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as { id: string; pageId: string; content: string });
    const lexical = JSON.parse(await readFile(join(outputDirectory, 'lexical-index.json'), 'utf8')) as {
      docs: Array<{ id: string; pageId: string; content: string }>;
    };
    expect(manifest.pages.length).toBeGreaterThan(0);
    expect(chunks.length).toBeGreaterThan(manifest.pages.length);
    expect(new Set(manifest.pages.map(({ outputPath }) => outputPath)).size).toBe(manifest.pages.length);
    expect(new Set(manifest.pages.map(({ id }) => id)).size).toBe(manifest.pages.length);
    expect(new Set(chunks.map(({ id }) => id)).size).toBe(chunks.length);
    expect(lexical.docs.map(({ id }) => id)).toEqual(chunks.map(({ id }) => id));
    const chunkIds = new Set(chunks.map(({ id }) => id));
    const renderedPages = await Promise.all(
      manifest.pages.map(async (page) => {
        expect(page.chunks.length, page.route).toBeGreaterThan(0);
        expect(
          page.chunks.every((id) => chunkIds.has(id)),
          page.route
        ).toBe(true);
        const content = await readFile(join(outputDirectory, page.outputPath), 'utf8');
        // JSX examples remain valid code; unrendered MDX components outside code do not help a docs client.
        const prose = content.replace(/```[\s\S]*?```/g, '');
        expect(prose, page.route).not.toMatch(/^[ \t]*<[A-Z][A-Za-z0-9]*\b/m);
        expect(content, page.route).not.toContain('@@LLM_DOCS_');
        if (page.docKind === 'config-reference')
          expect(content, page.route).not.toMatch(/&(?:quot|apos|amp|lt|gt|#39|#x27);/i);
        if (page.docKind === 'docs-page') {
          expect(content, page.route).not.toMatch(
            /\btype:\s*['"](?:lambda-function|dynamo-db-table|web-service|relational-database)['"]/
          );
        }
        return { ...page, content };
      })
    );
    const awsPage = manifest.pages.find(({ route }) => route === '/cli/aws-call');
    expect(awsPage).toBeDefined();
    const pageText = renderedPages.find(({ id }) => id === awsPage!.id)!.content;
    const chunkText = chunks
      .filter(({ pageId }) => pageId === awsPage!.id)
      .map(({ content }) => content)
      .join('\n');
    const indexedText = lexical.docs
      .filter(({ pageId }) => pageId === awsPage!.id)
      .map(({ content }) => content)
      .join('\n');
    const full = await readFile(join(outputDirectory, 'llms-full.txt'), 'utf8');
    for (const representation of [pageText, chunkText, indexedText, full]) {
      expect(representation).toMatch(/explicit allowlist/i);
      expect(representation).toContain('BatchWriteItem');
      expect(representation).toContain('ReceiveMessage');
      expect(representation).toMatch(/debug role/i);
      expect(representation).not.toContain('prefix-based read-only guard');
    }
    expect(pageText).toMatch(/deployed/i);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 120_000);
