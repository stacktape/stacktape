import { describe, expect, test } from 'bun:test';
import { rewriteChunkImports, rewriteChunkImportsSelective } from './chunk-rewriter';

describe('rewriteChunkImports', () => {
  test('repoints every chunk reference at the new prefix regardless of how it was written', () => {
    const bundled = [
      'import "./chunks/chunk-aaa111.js";',
      'import "../chunks/chunk-bbb222.js";',
      'const lazy = await import("chunk-ccc333.js");',
      "const nested = require('/deeply/nested/chunks/chunk-ddd444.js');"
    ].join('\n');

    expect(rewriteChunkImports(bundled, './chunks/')).toBe(
      [
        'import "./chunks/chunk-aaa111.js";',
        'import "./chunks/chunk-bbb222.js";',
        'const lazy = await import("./chunks/chunk-ccc333.js");',
        "const nested = require('./chunks/chunk-ddd444.js');"
      ].join('\n')
    );
  });

  test('keeps the original quote style so the rewritten module still parses', () => {
    expect(rewriteChunkImports("import 'chunks/chunk-aaa111.js';", './')).toBe("import './chunk-aaa111.js';");
    expect(rewriteChunkImports('import `chunks/chunk-aaa111.js`;', './')).toBe('import `./chunk-aaa111.js`;');
  });

  test('leaves non-chunk imports untouched', () => {
    const source = 'import { handler } from "./handler.js";\nimport fs from "node:fs";';
    expect(rewriteChunkImports(source, './chunks/')).toBe(source);
  });

  test('refuses to emit root-absolute /chunks/ paths, which would not resolve in a Lambda', () => {
    expect(() => rewriteChunkImports('import "./chunks/chunk-aaa111.js";', '/chunks/')).toThrow(
      /unrewritten absolute paths/
    );
  });
});

describe('rewriteChunkImportsSelective', () => {
  const layerPrefix = '/opt/nodejs/chunks/';

  test('sends layered chunks to the layer mount and the rest to the local prefix', () => {
    const bundled = ['import "./chunks/chunk-shared.js";', 'import "./chunks/chunk-local1.js";'].join('\n');

    expect(rewriteChunkImportsSelective(bundled, new Set(['chunk-shared.js']), layerPrefix, './chunks/')).toBe(
      ['import "/opt/nodejs/chunks/chunk-shared.js";', 'import "./chunks/chunk-local1.js";'].join('\n')
    );
  });

  test('uses a chunk-relative local prefix when rewriting a chunk that sits beside its neighbours', () => {
    const chunkBody = ['import "./chunks/chunk-shared.js";', 'import "./chunks/chunk-local1.js";'].join('\n');

    expect(rewriteChunkImportsSelective(chunkBody, new Set(['chunk-shared.js']), layerPrefix, './')).toBe(
      ['import "/opt/nodejs/chunks/chunk-shared.js";', 'import "./chunk-local1.js";'].join('\n')
    );
  });

  test('rewrites nothing when no chunk is layered', () => {
    const bundled = 'import "./chunks/chunk-local1.js";';
    expect(rewriteChunkImportsSelective(bundled, new Set(), layerPrefix, './chunks/')).toBe(bundled);
  });
});
