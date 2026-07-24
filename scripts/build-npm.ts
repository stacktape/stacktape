import { join } from 'node:path';
import { copy, mkdir, pathExists, readJson, remove, writeJson } from 'fs-extra';
import {
  DIST_PACKAGE_FOLDER_PATH,
  LLM_DOCS_FOLDER_PATH,
  NPM_PACKAGE_JSON_SOURCE_PATH,
  NPM_RELEASE_FOLDER_PATH
} from '../shared/naming/project-fs-paths';
import { logInfo, logSuccess } from '../shared/utils/logging';
import { buildNpmMainExport } from './build-npm-main-export';
import { generateLlmDocs } from './generate-llm-docs';
import { getVersion } from './release/args';
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
  const binSourcePath = join(process.cwd(), 'src', 'api', 'npm', 'bin', 'stacktape.js');
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

export const copyLlmDocs = async () => {
  logInfo('Copying LLM docs...');
  await copy(LLM_DOCS_FOLDER_PATH, join(NPM_RELEASE_FOLDER_PATH, 'llm-docs'));
  logSuccess('LLM docs copied successfully.');
};

export const buildNpm = async ({ version }: { version?: string } = {}) => {
  const versionToUse = version || (await getVersion());
  const requireChecksums = process.argv.includes('--require-checksums');
  const checksumsPathIndex = process.argv.indexOf('--checksums-path');
  const checksumsSourcePath = checksumsPathIndex === -1 ? undefined : process.argv[checksumsPathIndex + 1];
  if (checksumsPathIndex !== -1 && !checksumsSourcePath) {
    throw new Error('--checksums-path requires a file path.');
  }
  logInfo(`Building NPM package for version ${versionToUse}...`);

  await remove(NPM_RELEASE_FOLDER_PATH);
  await mkdir(NPM_RELEASE_FOLDER_PATH);
  await generateLlmDocs();
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
