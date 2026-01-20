import { join } from 'node:path';
import { copy, mkdir, readJson, remove, writeJson } from 'fs-extra';
import { NPM_PACKAGE_JSON_SOURCE_PATH, NPM_RELEASE_FOLDER_PATH } from '../shared/naming/project-fs-paths';
import { logInfo, logSuccess } from '../shared/utils/logging';
import { buildNpmMainExport } from './build-npm-main-export';
import { getVersion } from './release/args';

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

export const buildNpm = async ({ version }: { version?: string } = {}) => {
  const versionToUse = version || (await getVersion());
  logInfo(`Building NPM package for version ${versionToUse}...`);

  await remove(NPM_RELEASE_FOLDER_PATH);
  await mkdir(NPM_RELEASE_FOLDER_PATH);
  await Promise.all([buildNpmMainExport(), copyPackageJson(versionToUse), copyBinWrapper()]);

  logSuccess(`Stacktape npm package for version ${versionToUse} built successfully to ${NPM_RELEASE_FOLDER_PATH}.`);
};

if (import.meta.main) {
  buildNpm();
}
