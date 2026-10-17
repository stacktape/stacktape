import type { BunPlugin } from 'bun';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const CLI_ROOT = join(import.meta.dir, '..', '..');

const readVersion = (packageJsonPath: string) => JSON.parse(readFileSync(packageJsonPath, 'utf8')).version as string;

/**
 * Resolves every `fs-extra` import to the CLI's copy. The internal packages install their own copy of the same version,
 * and `addCallerStacksToFileErrors` (`src/utils/file-error-stacks.ts`) can only wrap the copy the CLI imports. Fails
 * the build when an importer's own copy has a different version, instead of silently giving it another one.
 */
export const createFsExtraSingleCopyPlugin = (): BunPlugin => ({
  name: 'stacktape-fs-extra-single-copy',
  setup(build) {
    const cliEntry = Bun.resolveSync('fs-extra', CLI_ROOT);
    const cliVersion = readVersion(Bun.resolveSync('fs-extra/package.json', CLI_ROOT));
    const checkedDirectories = new Set<string>();
    build.onResolve({ filter: /^fs-extra$/ }, ({ importer }) => {
      const importerDirectory = dirname(importer);
      if (!checkedDirectories.has(importerDirectory)) {
        const version = readVersion(Bun.resolveSync('fs-extra/package.json', importerDirectory));
        if (version !== cliVersion) {
          throw new Error(`${importer} uses fs-extra ${version}, the CLI ${cliVersion}. Align the versions.`);
        }
        checkedDirectories.add(importerDirectory);
      }
      return { path: cliEntry };
    });
  }
});
