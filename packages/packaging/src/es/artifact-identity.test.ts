import { describe, expect, test } from 'bun:test';
import { normalizeSplitBuildIdentity, projectRelativeSource, resolveBunOutputPath } from './artifact-identity';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('artifact identity', () => {
  test('a dependency edit gives its importer a new filename, and both generations coexist without conflicts', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stp-chunk-generations-'));
    try {
      const build = async (directory: string, revision: string) => {
        await mkdir(directory);
        const sources = {
          'chunk-aaaaaaaa.js': 'import { value } from "./chunk-bbbbbbbb.js"; export const result = () => value;',
          'chunk-bbbbbbbb.js': `export const value = "${revision}";`
        };
        await Promise.all(Object.entries(sources).map(([name, code]) => writeFile(join(directory, name), code)));
        const names = await normalizeSplitBuildIdentity({
          javascriptFiles: Object.keys(sources).map((name) => join(directory, name)),
          projectRoot: root,
          sourcesResolveFrom: directory,
          chunkKeys: new Map([
            ['chunk-aaaaaaaa', 'src/importer.ts'],
            ['chunk-bbbbbbbb', 'src/value.ts']
          ])
        });
        return Promise.all(
          [...names.values()]
            .toSorted()
            .map(async (name) => [name, await readFile(join(directory, `${name}.js`), 'utf8')])
        );
      };
      const first = await build(join(root, 'one'), 'old');
      const second = await build(join(root, 'two'), 'new');
      expect(second.filter(([name]) => first.some(([old]) => old === name))).toEqual([]);
      expect(await build(join(root, 'elsewhere'), 'new')).toEqual(second);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  test('a source outside the project keeps its dependency tail or only its name', () => {
    expect(projectRelativeSource('/home/dev/app/src/x.ts', '/home/dev/app')).toBe('src/x.ts');
    expect(projectRelativeSource('/home/dev/app/node_modules/zod/index.js', '/home/dev/app')).toBe(
      'node_modules/zod/index.js'
    );
    expect(
      projectRelativeSource('/home/dev/.cache/pnpm/node_modules/.pnpm/zod/node_modules/zod/index.js', '/home/dev/app')
    ).toBe('node_modules/zod/index.js');
    expect(projectRelativeSource('/home/dev/elsewhere/helper.ts', '/home/dev/app')).toBe('external/helper.ts');
    expect(projectRelativeSource('C:\\Users\\dev\\app\\src\\x.ts', 'C:\\Users\\dev\\app')).toBe('src/x.ts');
  });

  test("Bun's output-relative paths resolve on both hosts, including Windows' other-drive climb", () => {
    expect(resolveBunOutputPath('/home/dev/app/out', '../src/a.ts')).toBe('/home/dev/app/src/a.ts');
    expect(resolveBunOutputPath('/home/dev/app/out', '../../../../home/dev/app/src/a.ts')).toBe(
      '/home/dev/app/src/a.ts'
    );
    // Bun on Windows, working directory on D: and the project on C: (the CI runner's layout).
    expect(resolveBunOutputPath('D:\\work\\out', '../../C:/Users/dev/app/src/a.ts')).toBe(
      'C:\\Users\\dev\\app\\src\\a.ts'
    );
    expect(resolveBunOutputPath('C:\\Users\\dev\\app\\out', '../src/a.ts')).toBe('C:\\Users\\dev\\app\\src\\a.ts');
    expect(
      projectRelativeSource(
        resolveBunOutputPath('D:\\work\\out', '../../C:/Users/dev/app/src/a.ts'),
        'C:\\Users\\dev\\app'
      )
    ).toBe('src/a.ts');
  });
});
