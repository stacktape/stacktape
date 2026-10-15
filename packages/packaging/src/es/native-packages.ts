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
import { open, readdir } from 'node:fs/promises';
import { extname, join, relative, sep } from 'node:path';
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
  /** Executables and shared libraries for some operating system, such as a downloaded `ffmpeg`. */
  binaries: string[];
  hasBindingGyp: boolean;
  /** Platform directories under `prebuilds/`, such as `linux-x64`. */
  prebuildPlatforms: string[];
};

/** The file names a compiled program or library has: no extension on Linux and macOS, or a library extension. */
const mayBeBinary = (fileName: string) =>
  !extname(fileName) || ['.exe', '.dll', '.so', '.dylib'].includes(extname(fileName));

/** The first bytes of ELF (Linux), Mach-O (macOS) and PE (Windows) files. */
const BINARY_HEADERS = new Set(['7f454c46', 'feedface', 'feedfacf', 'cefaedfe', 'cffaedfe', 'cafebabe']);

const isBinary = async (path: string) => {
  const file = await open(path, 'r');
  try {
    const { buffer, bytesRead } = await file.read(Buffer.alloc(4), 0, 4, 0);
    const header = buffer.subarray(0, bytesRead).toString('hex');
    return BINARY_HEADERS.has(header) || header.startsWith('4d5a');
  } finally {
    await file.close();
  }
};

const nativeFilesByPackage = new Map<string, Promise<NativeFiles>>();

/** Addons, `binding.gyp` and prebuilds in the package itself, not in its own `node_modules`. */
const findNativeFiles = (packageRoot: string): Promise<NativeFiles> => {
  let found = nativeFilesByPackage.get(packageRoot);
  if (!found) {
    found = (async () => {
      const addons: string[] = [];
      const binaries: string[] = [];
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
            else if (entry.isFile() && mayBeBinary(entry.name) && (await isBinary(path))) {
              binaries.push(relative(packageRoot, path));
            }
          })
        );
      };
      await visit(packageRoot);
      return { addons, binaries, hasBindingGyp: existsSync(join(packageRoot, 'binding.gyp')), prebuildPlatforms };
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

/**
 * Why an installed package must stay installed instead of being bundled; `undefined` for plain JavaScript.
 *
 * An install script alone does not count: many pure JavaScript packages print a message after installing. What an
 * install script builds or downloads is found among the package's files.
 */
export const getNativeReason = async (packageRoot: string): Promise<string | undefined> => {
  const manifest = await readPackageManifest(packageRoot);
  if (PACKAGES_TO_KEEP_INSTALLED.has(manifest.name ?? '')) return 'reads its own files at run time';
  if (declaresPlatform(manifest)) return 'built for one platform';
  if (manifest.gypfile || manifest.binary?.module_path) return 'native addon';
  if ((await findPlatformPackages(packageRoot, manifest)).length > 0) return 'platform-specific binaries';
  const { addons, binaries, hasBindingGyp, prebuildPlatforms } = await findNativeFiles(packageRoot);
  if (addons.length > 0 || hasBindingGyp || prebuildPlatforms.length > 0) return 'native addon';
  if (binaries.length > 0) return 'contains executables';
  return undefined;
};

/**
 * Whether the installed copy of a package runs on Lambda without being installed again there.
 *
 * An addon under `build/` was compiled on this machine, against its Node.js and its C library, so it is rebuilt in the
 * Lambda build image even when the platforms match. Prebuilds are used when they include Lambda's platform; an install
 * script next to them (node-gyp-build) only compiles into `build/` when they do not. Anything else an install script
 * left behind, and any other addon or executable, was chosen for this machine, so it is used only when this machine is
 * Lambda's platform.
 */
export const isInstalledForLambda = async (packageRoot: string, architecture: LambdaArchitecture) => {
  const manifest = await readPackageManifest(packageRoot);
  if (declaresPlatform(manifest)) return runsOnLambda(manifest, architecture);

  const platformPackages = await findPlatformPackages(packageRoot, manifest);
  if (platformPackages.length > 0) return platformPackages.some((installed) => runsOnLambda(installed, architecture));

  const { addons, binaries, hasBindingGyp, prebuildPlatforms } = await findNativeFiles(packageRoot);
  if (addons.some((addon) => addon.split(sep)[0] === 'build')) return false;
  if ((manifest.gypfile || hasBindingGyp) && addons.length === 0) return false;
  if (prebuildPlatforms.length > 0) return prebuildPlatforms.includes(`linux-${architecture}`);
  const hasInstallScript = INSTALL_SCRIPTS.some((script) => manifest.scripts?.[script]);
  if (hasInstallScript || addons.length > 0 || binaries.length > 0 || manifest.binary?.module_path) {
    return hostMatchesLambda(architecture);
  }
  return true;
};
