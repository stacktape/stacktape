import { describe, expect, test } from 'bun:test';
import { buildIndex, formatAnswer, search } from './lexical-index';

describe('MCP docs lexical index', () => {
  test('loads generated LLM docs chunks', async () => {
    const index = await buildIndex();

    expect(index.totalDocs).toBeGreaterThan(1000);
    expect(index.docs.every((doc) => doc.docKind === 'docs-page' || doc.docKind === 'config-reference')).toBe(true);
  });

  test('prefers config reference chunks for property and syntax lookups', async () => {
    const index = await buildIndex();
    const results = search(index, { query: 'function timeout property default', maxItems: 3 });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].doc.docKind).toBe('config-reference');
    expect(results[0].doc.route).toBe('/config-reference/function');
  });

  test('prefers docs pages for workflow queries and diversifies top pages', async () => {
    const index = await buildIndex();
    const results = search(index, { query: 'how to deploy nextjs app with database', maxItems: 3 });

    expect(results.length).toBe(3);
    expect(results[0].doc.docKind).toBe('docs-page');
    expect(new Set(results.map((result) => result.doc.pageId)).size).toBe(results.length);
  });

  test('filters by doc kind and resource type', async () => {
    const index = await buildIndex();
    const results = search(index, {
      query: 'relational database properties',
      docKind: 'config-reference',
      resourceType: 'relational-database',
      maxItems: 5
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((result) => result.doc.docKind === 'config-reference')).toBe(true);
    expect(results.every((result) => result.doc.resourceType === 'relational-database')).toBe(true);
  });

  test('returns route-based references with source and heading metadata', async () => {
    const index = await buildIndex();
    const results = search(index, { query: 'function timeout property default', maxItems: 1 });
    const response = formatAnswer(results, 'reference');

    expect(response.references).toHaveLength(1);
    expect(response.references[0]).toEqual({
      title: 'Lambda Function',
      route: '/config-reference/function',
      docKind: 'config-reference',
      sourcePath: 'types/stacktape-config/functions.d.ts',
      headingPath: ['Lambda Function', 'Lambda Function']
    });
  });
});
