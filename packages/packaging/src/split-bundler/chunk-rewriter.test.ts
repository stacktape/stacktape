import { describe, expect, test } from 'bun:test';
import { applyTextEdits } from '../es/source-map-edits';
import { getChunkImportEdits } from './chunk-rewriter';

const rewrite = (source: string) =>
  applyTextEdits(
    source,
    getChunkImportEdits(source, () => '/opt/nodejs/chunks/')
  );

describe('strings that only look like chunk references', () => {
  /*
   * The rewriter runs over whole bundled files, and a Lambda's own code is in there. Any quoted string
   * ending in a chunk-shaped name used to be rewritten, so a URL a customer sends a request to, or a key
   * they read from storage, was silently replaced with a path into the Lambda layer. The artifact still
   * deploys; it just does the wrong thing at run time.
   */
  test('a URL in application code is left alone', () => {
    const source = 'const asset = "https://cdn.example.com/build/chunk-deadbeef.js";';

    expect(rewrite(source)).toBe(source);
  });

  test('a storage key in application code is left alone', () => {
    const source = "const key = 'uploads/chunk-deadbeef.js'; const url = `https://bucket.s3.amazonaws.com/${key}`;";

    expect(rewrite(source)).toBe(source);
  });

  test('the import that really points at a chunk is still rewritten', () => {
    const source = [
      'import { shared } from "./chunks/chunk-deadbeef.js";',
      'const lazy = await import("./chunks/chunk-cafebabe.js");',
      "const required = require('./chunks/chunk-feedface.js');",
      'const asset = "https://cdn.example.com/build/chunk-deadbeef.js";'
    ].join('\n');

    expect(rewrite(source)).toBe(
      [
        'import { shared } from "/opt/nodejs/chunks/chunk-deadbeef.js";',
        'const lazy = await import("/opt/nodejs/chunks/chunk-cafebabe.js");',
        "const required = require('/opt/nodejs/chunks/chunk-feedface.js');",
        'const asset = "https://cdn.example.com/build/chunk-deadbeef.js";'
      ].join('\n')
    );
  });
});
