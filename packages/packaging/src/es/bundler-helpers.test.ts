import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createModuleResolver, determineIfAlias, ensureDefaultExport } from './bundler-helpers';

const tempDirs: string[] = [];

const writePackage = async (
  directory: string,
  packageJson: Record<string, unknown>,
  files: Record<string, string> = {}
) => {
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`);
  await Promise.all(
    Object.entries(files).map(async ([relativePath, contents]) => {
      const filePath = join(directory, relativePath);
      await mkdir(join(filePath, '..'), { recursive: true });
      await writeFile(filePath, contents);
    })
  );
};

/**
 * Builds a pnpm-style isolated layout with the shape that broke the helper Lambda artifacts:
 *
 *   node_modules/consumer                                    symlink (direct dependency)
 *   node_modules/.pnpm/<name>@<version>/node_modules/<name>   real package directory
 *   node_modules/.pnpm/<name>@<version>/node_modules/<dep>    symlink into the dependency's store dir
 *   node_modules/.pnpm/node_modules/<name>                    pnpm's hoisted fallback
 *
 * `consumer` depends on `deep-a` and `deep-b`, which depend on two different major versions of
 * `cache-lib`. `consumer` itself does not depend on `cache-lib`, so walking up from a `deep-*`
 * file reached through `consumer`'s symlink leaves the store directory that holds the right
 * version and falls into the hoisted fallback, which holds a third, much older version.
 */
const createPnpmWorkspace = async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'stacktape-module-resolution-')));
  tempDirs.push(root);
  const store = join(root, 'node_modules', '.pnpm');
  const storeDir = (name: string, version: string) => join(store, `${name}@${version}`, 'node_modules', name);
  const link = (name: string, version: string, dependency: string, dependencyVersion: string) =>
    symlink(
      storeDir(dependency, dependencyVersion),
      join(store, `${name}@${version}`, 'node_modules', dependency),
      'junction'
    );

  await writeFile(join(root, 'package.json'), '{"name":"project","dependencies":{"consumer":"1.0.0"}}\n');

  await Promise.all(
    ['5.1.1', '10.4.3', '11.5.2'].map((version) =>
      writePackage(
        storeDir('cache-lib', version),
        { name: 'cache-lib', version, main: 'index.js' },
        { 'index.js': `module.exports = ${JSON.stringify(version)};\n` }
      )
    )
  );

  const deepPackages = [
    { name: 'deep-a', cacheLib: '10.4.3' },
    { name: 'deep-b', cacheLib: '11.5.2' }
  ];
  await Promise.all(
    deepPackages.map(async ({ name, cacheLib }) => {
      await writePackage(
        storeDir(name, '1.0.0'),
        { name, version: '1.0.0', main: 'dist/index.js', dependencies: { 'cache-lib': cacheLib } },
        { 'dist/index.js': 'module.exports = require("cache-lib");\n' }
      );
      await link(name, '1.0.0', 'cache-lib', cacheLib);
    })
  );

  await writePackage(
    storeDir('consumer', '1.0.0'),
    { name: 'consumer', version: '1.0.0', main: 'index.js', dependencies: { 'deep-a': '1.0.0', 'deep-b': '1.0.0' } },
    { 'index.js': 'module.exports = [require("deep-a"), require("deep-b")];\n' }
  );
  await link('consumer', '1.0.0', 'deep-a', '1.0.0');
  await link('consumer', '1.0.0', 'deep-b', '1.0.0');

  await mkdir(join(store, 'node_modules'), { recursive: true });
  await symlink(storeDir('cache-lib', '5.1.1'), join(store, 'node_modules', 'cache-lib'), 'junction');

  await symlink(storeDir('consumer', '1.0.0'), join(root, 'node_modules', 'consumer'), 'junction');

  return { root, store, storeDir };
};

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

describe('es bundler module resolution', () => {
  test('recognizes a configured alias by prefix even when the extensionless candidate does not exist', async () => {
    const root = await realpath(await mkdtemp(join(tmpdir(), 'stacktape-alias-resolution-')));
    tempDirs.push(root);
    const sourceDirectory = join(root, 'src');
    await mkdir(sourceDirectory, { recursive: true });
    await writeFile(join(sourceDirectory, 'tool.ts'), 'export const tool = true;\n');

    expect(determineIfAlias({ moduleName: '@app/tool', aliases: { '@app': sourceDirectory } })).toBe(true);
  });

  test("gives two importers the two versions they depend on, not pnpm's hoisted fallback", async () => {
    const { root, store, storeDir } = await createPnpmWorkspace();
    const { findModulePath } = createModuleResolver({ cwd: root, monorepoRoot: root });

    // The importers are the symlinked paths a bundler reaches these packages through.
    const importerOf = (name: string) => join(store, 'consumer@1.0.0', 'node_modules', name, 'dist', 'index.js');

    expect(findModulePath('cache-lib', importerOf('deep-a'))).toBe(storeDir('cache-lib', '10.4.3'));
    expect(findModulePath('cache-lib', importerOf('deep-b'))).toBe(storeDir('cache-lib', '11.5.2'));
  });

  test('resolves a symlinked importer path the same way as its real store path', async () => {
    const { root, store, storeDir } = await createPnpmWorkspace();
    const { findModulePath } = createModuleResolver({ cwd: root, monorepoRoot: root });

    const throughSymlink = join(store, 'consumer@1.0.0', 'node_modules', 'deep-a', 'dist', 'index.js');
    const throughStore = join(store, 'deep-a@1.0.0', 'node_modules', 'deep-a', 'dist', 'index.js');

    expect(findModulePath('cache-lib', throughSymlink)).toBe(findModulePath('cache-lib', throughStore));
    expect(findModulePath('cache-lib', throughStore)).toBe(storeDir('cache-lib', '10.4.3'));
  });

  test('resolves an "exports"-restricted package that hides its own package.json', async () => {
    const { root, store, storeDir } = await createPnpmWorkspace();
    await writePackage(
      storeDir('modern-lib', '3.0.0'),
      { name: 'modern-lib', version: '3.0.0', exports: { '.': { import: './index.mjs' } } },
      { 'index.mjs': 'export default 3;\n' }
    );
    await symlink(
      storeDir('modern-lib', '3.0.0'),
      join(store, 'deep-a@1.0.0', 'node_modules', 'modern-lib'),
      'junction'
    );

    const { findModulePath } = createModuleResolver({ cwd: root, monorepoRoot: root });
    const importer = join(store, 'consumer@1.0.0', 'node_modules', 'deep-a', 'dist', 'index.js');

    expect(findModulePath('modern-lib', importer)).toBe(storeDir('modern-lib', '3.0.0'));
  });

  test('resolves direct and entrypoint imports from the project', async () => {
    const { root, storeDir } = await createPnpmWorkspace();
    const { findModulePath, isNestedLocation } = createModuleResolver({ cwd: root, monorepoRoot: root });

    const projectEntry = join(root, 'src', 'index.ts');
    expect(findModulePath('consumer', projectEntry)).toBe(storeDir('consumer', '1.0.0'));
    // No importer at all (virtual entrypoints, raw code) still resolves from the project.
    expect(findModulePath('consumer')).toBe(storeDir('consumer', '1.0.0'));

    // A project dependency is a standard location, so Bun resolves it natively.
    expect(isNestedLocation(storeDir('consumer', '1.0.0'), 'consumer')).toBe(false);
    // A transitive dependency is not, so the loose-resolve plugin has to resolve it explicitly.
    expect(isNestedLocation(storeDir('cache-lib', '10.4.3'), 'cache-lib')).toBe(true);
  });

  test('falls back to the monorepo root for dependencies the importer cannot see', async () => {
    const { root, store, storeDir } = await createPnpmWorkspace();
    const applicationDir = join(root, 'apps', 'cli');
    await mkdir(join(applicationDir, 'src'), { recursive: true });

    const { findModulePath } = createModuleResolver({ cwd: applicationDir, monorepoRoot: root });

    // cache-lib is reachable from neither the application nor the monorepo root, only from importers.
    expect(findModulePath('cache-lib')).toBeNull();
    // consumer lives only in the monorepo root's node_modules.
    expect(findModulePath('consumer', join(applicationDir, 'src', 'index.ts'))).toBe(storeDir('consumer', '1.0.0'));
    // An importer that cannot see the package still falls back to the project.
    expect(findModulePath('consumer', join(store, 'unrelated', 'index.js'))).toBe(storeDir('consumer', '1.0.0'));
  });
});

describe('Lambda ESM default handler compatibility', () => {
  test('re-exports the minified local binding that Bun aliases as handler', () => {
    expect(ensureDefaultExport('var e=()=>1;export{e as handler};')).toBe(
      'var e=()=>1;export{e as handler, e as default};'
    );
  });

  test('uses a direct handler binding and preserves existing defaults', () => {
    expect(ensureDefaultExport('const handler=()=>1; export { handler };')).toBe(
      'const handler=()=>1; export { handler, handler as default };'
    );
    expect(ensureDefaultExport('const e=()=>1; export { e as handler, e as default };')).toBe(
      'const e=()=>1; export { e as handler, e as default };'
    );
  });
});
