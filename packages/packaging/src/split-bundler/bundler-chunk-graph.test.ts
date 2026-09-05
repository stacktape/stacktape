import { expect, test } from 'bun:test';
import { findAllChunksFromMetafile } from './bundler';
import type { BuildMetafile } from './types';

test('a chunk ending in an entrypoint filename is not mistaken for that entrypoint', () => {
  const metafile: BuildMetafile = {
    inputs: {},
    outputs: {
      './a.js': {
        bytes: 1,
        inputs: {},
        exports: [],
        imports: [{ path: './chunks/chunk-data.js', kind: 'import-statement' }]
      },
      './b.js': { bytes: 1, inputs: {}, exports: [], imports: [] },
      './chunks/chunk-data.js': {
        bytes: 1,
        inputs: {},
        exports: [],
        imports: [{ path: './chunk-b.js', kind: 'import-statement' }]
      },
      './chunks/chunk-b.js': { bytes: 1, inputs: {}, exports: [], imports: [] }
    }
  };

  expect([...findAllChunksFromMetafile('./a.js', metafile)]).toEqual(['./chunks/chunk-data.js', './chunks/chunk-b.js']);
});
