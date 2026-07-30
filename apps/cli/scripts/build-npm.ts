import { join } from 'node:path';
import { copy, mkdir, pathExists, readJson, remove, writeJson } from 'fs-extra';
import {
  DIST_PACKAGE_FOLDER_PATH,
  LLM_DOCS_FOLDER_PATH,
  NPM_PACKAGE_JSON_SOURCE_PATH,
  NPM_RELEASE_FOLDER_PATH
} from 'src/config/project-paths';
import { logInfo, logSuccess } from '@scripts/support/logging';
import packageJson from '../package.json';
import { buildNpmMainExport } from './build-npm-main-export';
import { getCliArgs, getVersion } from './release/args';
import { RELEASE_CHECKSUMS_FILE_NAME } from './release/checksums';

export const copyPackageJson = async (version?: string) => {
  const packageJson = await readJson(NPM_PACKAGE_JSON_SOURCE_PATH);

  if (version) {
    packageJson.version = version;
  }

  await writeJson(join(NPM_RELEASE_FOLDER_PATH, 'package.json'), packageJson, { spaces: 2 });
};

export const copyBinWrapper = async () => {
  logInfo('Copying bin wrapper script...');
  const binSourcePath = join(process.cwd(), 'scripts', 'release', 'npm-package', 'bin', 'stacktape.js');
  const binDestPath = join(NPM_RELEASE_FOLDER_PATH, 'bin', 'stacktape.js');
  await copy(binSourcePath, binDestPath);
  logSuccess('Bin wrapper script copied successfully.');
};

export const copyReleaseChecksums = async ({
  required = false,
  sourcePath = join(DIST_PACKAGE_FOLDER_PATH, RELEASE_CHECKSUMS_FILE_NAME),
  destinationPath = join(NPM_RELEASE_FOLDER_PATH, RELEASE_CHECKSUMS_FILE_NAME)
}: {
  required?: boolean;
  sourcePath?: string;
  destinationPath?: string;
} = {}) => {
  if (!required) {
    return;
  }
  if (!(await pathExists(sourcePath))) {
    throw new Error(`Release build requires ${sourcePath}. Run bun run release:checksums first.`);
  }
  await copy(sourcePath, destinationPath);
};

// The LLM docs under @generated/llm-docs are committed and freshness-checked against apps/docs plus the current
// CLI/config model. Release assembly copies that reviewed deterministic snapshot.
export const copyLlmDocs = async () => {
  logInfo('Copying LLM docs...');
  await copy(LLM_DOCS_FOLDER_PATH, join(NPM_RELEASE_FOLDER_PATH, 'llm-docs'));
  logSuccess('LLM docs copied successfully.');
};

export const buildNpm = async ({ version }: { version?: string } = {}) => {
  // A release run selects the version explicitly (--version) or by increment flag; getVersion() prompts for
  // anything else. An ordinary workspace build passes no flag at all, so it builds this package's own version
  // instead of blocking on a prompt.
  const { explicitVersion, useMajor, useMinor, usePatch } = getCliArgs();
  const selectsReleaseVersion = Boolean(explicitVersion || useMajor || useMinor || usePatch);
  const versionToUse = version || (selectsReleaseVersion ? await getVersion() : packageJson.version);
  const requireChecksums = process.argv.includes('--require-checksums');
  const checksumsPathIndex = process.argv.indexOf('--checksums-path');
  const checksumsSourcePath = checksumsPathIndex === -1 ? undefined : process.argv[checksumsPathIndex + 1];
  if (checksumsPathIndex !== -1 && !checksumsSourcePath) {
    throw new Error('--checksums-path requires a file path.');
  }
  logInfo(`Building NPM package for version ${versionToUse}...`);

  await remove(NPM_RELEASE_FOLDER_PATH);
  await mkdir(NPM_RELEASE_FOLDER_PATH);
  await Promise.all([
    buildNpmMainExport(),
    copyPackageJson(versionToUse),
    copyBinWrapper(),
    copyLlmDocs(),
    copyReleaseChecksums({
      required: requireChecksums,
      ...(checksumsSourcePath && { sourcePath: checksumsSourcePath })
    })
  ]);

  logSuccess(`Stacktape npm package for version ${versionToUse} built successfully to ${NPM_RELEASE_FOLDER_PATH}.`);
};

if (import.meta.main) {
  buildNpm();
}
