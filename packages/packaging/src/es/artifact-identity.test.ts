import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  deterministicDebugId,
  normalizeBundleIdentity,
  normalizeSplitBuildIdentity,
  projectRelativeSource,
  resolveBunOutputPath
} from './artifact-identity';

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

/** The same two-function project written and built with Bun under a fresh directory. */
const buildProject = async ({ splitting }: { splitting: boolean }) => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-artifact-identity-'));
  roots.push(root);
  const src = join(root, 'src');
  await Bun.write(join(src, 'shared.ts'), `export const shared = ${JSON.stringify('x'.repeat(2048))};\n`);
  await Bun.write(
    join(src, 'a.ts'),
    "import { shared } from './shared';\nexport const handler = async () => shared.length;\n"
  );
  await Bun.write(
    join(src, 'b.ts'),
    "import { shared } from './shared';\nexport const handler = async () => shared.length + 1;\n"
  );
  const outdir = join(root, 'out');
  const result = await Bun.build({
    entrypoints: splitting ? [join(src, 'a.ts'), join(src, 'b.ts')] : [join(src, 'a.ts')],
    outdir,
    target: 'node',
    format: 'esm',
    splitting,
    sourcemap: 'linked',
    root,
    naming: { entry: '[dir]/[name].js', chunk: 'chunks/chunk-[hash].js' }
  });
  if (!result.success) throw new Error('Bun build failed');
  return {
    root,
    outdir,
    javascriptFiles: result.outputs.filter(({ path }) => path.endsWith('.js')).map(({ path }) => path)
  };
};

/** Every file under `outdir` as `relative path: sha256`, sorted: what a ZIP of it would carry. */
const identity = async (outdir: string) => {
  const files = (await readdir(outdir, { recursive: true, withFileTypes: true })).filter((entry) => entry.isFile());
  const lines = await Promise.all(
    files.map(async (entry) => {
      const path = join(entry.parentPath, entry.name);
      const hash = new Bun.CryptoHasher('sha256').update(await readFile(path)).digest('hex');
      return `${path.slice(outdir.length + 1).replace(/\\/g, '/')}: ${hash}`;
    })
  );
  return lines.toSorted();
};

describe('artifact identity', () => {
  test('a split build from two directories has identical chunk names, debug IDs and bytes', async () => {
    const [first, second] = await Promise.all([buildProject({ splitting: true }), buildProject({ splitting: true })]);
    // Bun's own output differs between the two directories.
    expect(await identity(first.outdir)).not.toEqual(await identity(second.outdir));
    await Promise.all(
      [first, second].map((build) =>
        normalizeSplitBuildIdentity({
          javascriptFiles: build.javascriptFiles,
          projectRoot: build.root,
          sourcesResolveFrom: build.outdir
        })
      )
    );
    const normalized = await identity(first.outdir);
    expect(normalized).toEqual(await identity(second.outdir));
    expect(normalized.some((line) => /^chunks\/chunk-[a-z0-9]{8}\.js:/.test(line))).toBe(true);
  });

  test('a renamed chunk is still imported and its map names the project files only', async () => {
    const build = await buildProject({ splitting: true });
    const renames = await normalizeSplitBuildIdentity({
      javascriptFiles: build.javascriptFiles,
      projectRoot: build.root,
      sourcesResolveFrom: build.outdir
    });
    expect(renames.size).toBe(1);
    const [oldName, newName] = [...renames][0]!;
    const entry = await readFile(join(build.outdir, 'src', 'a.js'), 'utf8');
    expect(entry).toContain(`./chunks/${newName}.js`);
    expect(entry).not.toContain(oldName);
    const chunk = await readFile(join(build.outdir, 'chunks', `${newName}.js`), 'utf8');
    const chunkMap = JSON.parse(await readFile(join(build.outdir, 'chunks', `${newName}.js.map`), 'utf8')) as {
      sources: string[];
      debugId: string;
    };
    expect(chunkMap.sources).toEqual(['src/shared.ts']);
    expect(chunk).toContain('// src/shared.ts');
    expect(chunk).not.toContain(build.root);
    expect(chunk).toContain(`//# debugId=${chunkMap.debugId}`);
    expect(chunkMap.debugId).toBe(deterministicDebugId(chunk));
    const entryMap = JSON.parse(await readFile(join(build.outdir, 'src', 'a.js.map'), 'utf8')) as { sources: string[] };
    expect(entryMap.sources).toEqual(['src/a.ts']);
  });

  test('a single bundle gets a content-derived debug ID shared with its map', async () => {
    const [first, second] = await Promise.all([buildProject({ splitting: false }), buildProject({ splitting: false })]);
    await Promise.all(
      [first, second].map((build) =>
        normalizeBundleIdentity({
          javascriptPath: join(build.outdir, 'src', 'a.js'),
          projectRoot: build.root,
          sourcesResolveFrom: build.outdir
        })
      )
    );
    expect(await identity(first.outdir)).toEqual(await identity(second.outdir));
    const code = await readFile(join(first.outdir, 'src', 'a.js'), 'utf8');
    const map = JSON.parse(await readFile(join(first.outdir, 'src', 'a.js.map'), 'utf8')) as {
      debugId: string;
      sources: string[];
    };
    expect(code).toContain(`//# debugId=${map.debugId}`);
    expect(map.sources.toSorted()).toEqual(['src/a.ts', 'src/shared.ts']);
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
