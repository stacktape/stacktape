import { expect, test } from 'bun:test';
import { canonicalizeEntrypointPath, findAllChunksFromMetafile, mapEntryPointsToOutputs } from './bundler';
import type { BuildMetafile, MetafileOutput } from './types';

const entryOutput = (entryPoint: string): MetafileOutput => ({
  bytes: 1,
  inputs: {},
  exports: [],
  imports: [],
  entryPoint
});

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

// Windows Bun 1.4.1 records a file on another drive than its working directory as `..` segments up to the root followed
// by the file's absolute path. The runner checks out on D: and creates test projects under C:\Users\RUNNER~1.
const runner = { platform: 'win32', workingDirectory: 'D:\\a\\stacktape\\stacktape\\packages\\packaging' } as const;
const runnerProject = 'C:\\Users\\RUNNER~1\\AppData\\Local\\Temp\\stacktape-split-e2e-x';
const recordedFromRunner = (path: string) =>
  `../../../../../../C:/Users/RUNNER~1/AppData/Local/Temp/stacktape-split-e2e-x/${path}`;

test('an entry on another Windows drive than the working directory finds its output', () => {
  const outputs = mapEntryPointsToOutputs(
    {
      inputs: {},
      outputs: {
        './src/handler.js': entryOutput(recordedFromRunner('src/handler.ts')),
        './src/other.js': entryOutput(recordedFromRunner('src/other.ts'))
      }
    },
    runner
  );

  expect(outputs.get(canonicalizeEntrypointPath(`${runnerProject}\\src\\handler.ts`, runner))).toBe('./src/handler.js');
  expect(outputs.get(canonicalizeEntrypointPath(`${runnerProject}\\src\\other.ts`, runner))).toBe('./src/other.js');
  // The dependency tracker records importers by absolute path and reads them back by metafile input key.
  expect(canonicalizeEntrypointPath(recordedFromRunner('src/shared.ts'), runner)).toBe(
    canonicalizeEntrypointPath(`${runnerProject}\\src\\shared.ts`, runner)
  );
});

test('an entry on the working directory drive still finds its output in any letter case', () => {
  const windows = { platform: 'win32', workingDirectory: 'C:\\Work\\tools' } as const;
  const outputs = mapEntryPointsToOutputs(
    { inputs: {}, outputs: { './src/handler.js': entryOutput('../App/src/handler.ts') } },
    windows
  );

  expect(outputs.get(canonicalizeEntrypointPath('c:\\work\\APP\\src\\handler.ts', windows))).toBe('./src/handler.js');
});
