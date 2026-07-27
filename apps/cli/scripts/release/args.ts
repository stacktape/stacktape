import { logInfo, logSuccess } from '@shared/utils/logging';
import { readJson, writeJson } from 'fs-extra';
import inquirer from 'inquirer';
import { inc } from 'semver';
import yargsParser from 'yargs-parser';
import packageJson from '../../package.json';

type PlatformToBuildFor = SupportedPlatform | 'current-arch' | 'all' | 'current';

export const getCliArgs = () => {
  const argv = yargsParser(process.argv.slice(2));

  return {
    useMajor: argv.major as boolean | undefined,
    useMinor: argv.minor as boolean | undefined,
    usePatch: argv.patch as boolean | undefined,
    explicitVersion: (argv.version || argv.v) as string | undefined,
    isPrerelease: (argv.prerelease || argv.pre) as boolean | undefined,
    skipProjectCheck: argv.spc as boolean | undefined,
    keepUnarchived: Boolean(argv.keepUnarchived || argv.ku) || false,
    skipArchiving: Boolean(argv.skipArchiving || argv.sa) || false,
    debug: Boolean(argv.debug) || false,
    platforms: Array.isArray(argv.platforms)
      ? (argv.platforms as PlatformToBuildFor[])
      : [(argv.platforms as PlatformToBuildFor) || 'all']
  };
};

export const getVersion = async (): Promise<string> => {
  const { useMajor, useMinor, usePatch, explicitVersion, isPrerelease } = getCliArgs();
  let result: string;

  // Check if explicit version is specified
  if (explicitVersion) {
    result = explicitVersion;
    logInfo(`Using explicit version: ${result}`);
  } else if (useMajor) {
    // Check if version increment type is specified via flags
    result = inc(packageJson.version, 'major');
    logInfo(`Auto-incrementing major version: ${packageJson.version} -> ${result}`);
  } else if (useMinor) {
    result = inc(packageJson.version, 'minor');
    logInfo(`Auto-incrementing minor version: ${packageJson.version} -> ${result}`);
  } else if (usePatch) {
    result = inc(packageJson.version, 'patch');
    logInfo(`Auto-incrementing patch version: ${packageJson.version} -> ${result}`);
  } else {
    // Prompt user for version
    const defaultVersion = isPrerelease
      ? `${inc(packageJson.version, 'patch')}-alpha.0`
      : inc(packageJson.version, 'patch');

    const promptResult = await inquirer.prompt({
      type: 'input',
      name: 'newVersion',
      message: `Version: (current version is ${packageJson.version})`,
      default: defaultVersion
    });
    result = promptResult.newVersion;
  }

  // Validate prerelease version format
  if (isPrerelease) {
    const prereleasePattern = /-(?:alpha|beta|rc)\.\d+$/;
    if (!prereleasePattern.test(result)) {
      throw new Error(
        `Invalid prerelease version: ${result}. Prerelease versions must end with -alpha.N, -beta.N, or -rc.N`
      );
    }
  }

  return result;
};

export const adjustPackageJsonVersion = async ({ newVersion, path }: { path: string; newVersion: string }) => {
  logInfo(`Adjusting package.json version (${path})`);
  const pkgContent = await readJson(path);
  pkgContent.version = newVersion;
  await writeJson(path, pkgContent, { spaces: 2 });
  logSuccess(`package.json version adjusted successfully. (${path})`);
};
