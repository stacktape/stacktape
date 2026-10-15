/**
 * Which installed packages are native, and whether their installed files run on Lambda as they are.
 *
 * The answers come from the installed files, not from a list of package names, so they hold for any package manager
 * and for packages nobody listed. A native package cannot be bundled: it loads a compiled addon, or files it fetched
 * or built at install time, from its own directory. Most native packages install a prebuilt binary for the machine
 * that installed them, so on a Linux x64 or arm64 build machine with glibc, the usual CI runner, the installed copy is
 * already the one Lambda needs.
 */
import type { Dirent } from 'node:fs';
import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { findInstalledPackage, readPackageManifest, type PackageManifest } from './installed-packages';

export type LambdaArchitecture = 'x64' | 'arm64';

/** Packages that read their own files at run time without any sign of it in their manifest or files. */
const PACKAGES_TO_KEEP_INSTALLED = new Set(['@sparticuz/chromium']);

const INSTALL_SCRIPTS = ['preinstall', 'install', 'postinstall'];

/** npm's `os`, `cpu` and `libc` fields list allowed values, or excluded ones prefixed with `!`. */
const allows = (values: string[] | undefined, value: string) =>
  !values?.length ||
  (values.some((allowed) => !allowed.startsWith('!')) ? values.includes(value) : !values.includes(`!${value}`));

const declaresPlatform = (manifest: PackageManifest) =>
  Boolean(manifest.os?.length || manifest.cpu?.length || manifest.libc?.length);

/** Whether a package that declares a platform can run on Lambda (Linux with glibc) with this architecture. */
export const runsOnLambda = (manifest: PackageManifest, architecture: LambdaArchitecture) =>
  allows(manifest.os, 'linux') && allows(manifest.cpu, architecture) && allows(manifest.libc, 'glibc');

const hostIsGlibc = () =>
  Boolean((process.report?.getReport() as { header?: { glibcVersionRuntime?: string } })?.header?.glibcVersionRuntime);

/** Whether a binary installed for this machine is one Lambda can load. */
const hostMatchesLambda = (architecture: LambdaArchitecture) =>
  process.platform === 'linux' && process.arch === architecture && hostIsGlibc();

type NativeFiles = {
  /** Compiled addons (`*.node`), relative to the package directory. */
  addons: string[];
  hasBindingGyp: boolean;
  /** Platform directories under `prebuilds/`, such as `linux-x64`. */
  prebuildPlatforms: string[];
};

const nativeFilesByPackage = new Map<string, Promise<NativeFiles>>();

/** Addons, `binding.gyp` and prebuilds in the package itself, not in its own `node_modules`. */
const findNativeFiles = (packageRoot: string): Promise<NativeFiles> => {
  let found = nativeFilesByPackage.get(packageRoot);
  if (!found) {
    found = (async () => {
      const addons: string[] = [];
      const prebuildPlatforms: string[] = [];
      const visit = async (directory: string): Promise<void> => {
        let entries: Dirent[];
        try {
          entries = await readdir(directory, { withFileTypes: true });
        } catch {
          // An unreadable directory holds nothing the package could load either.
          return;
        }
        await Promise.all(
          entries.map(async (entry) => {
            const path = join(directory, entry.name);
            if (entry.isDirectory()) {
              if (entry.name === 'node_modules') return;
              if (entry.name === 'prebuilds' && directory === packageRoot) {
                prebuildPlatforms.push(...(await readdir(path)));
              }
              return visit(path);
            }
            if (entry.name.endsWith('.node')) addons.push(relative(packageRoot, path));
          })
        );
      };
      await visit(packageRoot);
      return { addons, hasBindingGyp: existsSync(join(packageRoot, 'binding.gyp')), prebuildPlatforms };
    })();
    nativeFilesByPackage.set(packageRoot, found);
  }
  return found;
};

/**
 * The installed optional dependencies that are builds for one platform, as napi-rs and esbuild publish their binaries:
 * the parent loads whichever of them the package manager installed for this machine.
 */
const findPlatformPackages = async (packageRoot: string, manifest: PackageManifest) => {
  const platformPackages: PackageManifest[] = [];
  for (const name of Object.keys(manifest.optionalDependencies ?? {})) {
    // oxlint-disable-next-line no-await-in-loop -- a package has a handful of optional dependencies.
    const installedRoot = await findInstalledPackage({ name, fromDirectory: packageRoot });
    // oxlint-disable-next-line no-await-in-loop -- see above.
    const installed = installedRoot && (await readPackageManifest(installedRoot));
    if (installed && declaresPlatform(installed)) platformPackages.push(installed);
  }
  return platformPackages;
};

/** Why an installed package must stay installed instead of being bundled; `undefined` for plain JavaScript. */
export const getNativeReason = async (packageRoot: string): Promise<string | undefined> => {
  const manifest = await readPackageManifest(packageRoot);
  if (PACKAGES_TO_KEEP_INSTALLED.has(manifest.name ?? '')) return 'reads its own files at run time';
  if (declaresPlatform(manifest)) return 'built for one platform';
  if (manifest.gypfile || manifest.binary?.module_path) return 'native addon';
  if (INSTALL_SCRIPTS.some((script) => manifest.scripts?.[script])) return 'install script';
  if ((await findPlatformPackages(packageRoot, manifest)).length > 0) return 'platform-specific binaries';
  const { addons, hasBindingGyp, prebuildPlatforms } = await findNativeFiles(packageRoot);
  if (addons.length > 0 || hasBindingGyp || prebuildPlatforms.length > 0) return 'native addon';
  return undefined;
};

/**
 * Whether the installed copy of a package runs on Lambda without being installed again there.
 *
 * An addon under `build/` was compiled on this machine, against its Node.js and its C library, so it is rebuilt in the
 * Lambda build image even when the platforms match. Prebuilt addons are used when they are for Lambda's platform.
 * Packages without an addon (an install script that downloads nothing platform-specific) are copied as they are.
 */
export const isInstalledForLambda = async (packageRoot: string, architecture: LambdaArchitecture) => {
  const manifest = await readPackageManifest(packageRoot);
  if (declaresPlatform(manifest)) return runsOnLambda(manifest, architecture);

  const platformPackages = await findPlatformPackages(packageRoot, manifest);
  if (platformPackages.length > 0) return platformPackages.some((installed) => runsOnLambda(installed, architecture));

  const { addons, hasBindingGyp, prebuildPlatforms } = await findNativeFiles(packageRoot);
  if (addons.some((addon) => addon.split(sep)[0] === 'build')) return false;
  if ((manifest.gypfile || hasBindingGyp) && addons.length === 0) return false;
  if (prebuildPlatforms.length > 0) return prebuildPlatforms.includes(`linux-${architecture}`);
  if (addons.length > 0 || manifest.binary?.module_path) return hostMatchesLambda(architecture);
  return true;
};
