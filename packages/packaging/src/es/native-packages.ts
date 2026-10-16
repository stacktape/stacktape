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
import { open, readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, sep } from 'node:path';
import { findInstalledPackage, readPackageManifest, type PackageManifest } from './installed-packages';

export type LambdaArchitecture = 'x64' | 'arm64';

const INSTALL_SCRIPTS = ['preinstall', 'install', 'postinstall'];

/** npm's `os`, `cpu` and `libc` fields list allowed values, or excluded ones prefixed with `!`. */
const allows = (values: string[] | undefined, value: string) =>
  !values?.length ||
  (values.some((allowed) => !allowed.startsWith('!')) ? values.includes(value) : !values.includes(`!${value}`));

export const declaresPlatform = (manifest: PackageManifest) =>
  Boolean(manifest.os?.length || manifest.cpu?.length || manifest.libc?.length);

/** Whether a package that declares a platform can run on Lambda (Linux with glibc) with this architecture. */
export const runsOnLambda = (manifest: PackageManifest, architecture: LambdaArchitecture) =>
  allows(manifest.os, 'linux') && allows(manifest.cpu, architecture) && allows(manifest.libc, 'glibc');

const hostIsGlibc = () =>
  Boolean((process.report?.getReport() as { header?: { glibcVersionRuntime?: string } })?.header?.glibcVersionRuntime);

/** Whether a binary installed for this machine is one Lambda can load. */
const hostMatchesLambda = (architecture: LambdaArchitecture) =>
  process.platform === 'linux' && process.arch === architecture && hostIsGlibc();

/**
 * What a compiled file was built for: Linux with glibc on one architecture, Linux with musl (Alpine), another Linux, or
 * another operating system.
 */
type CompiledFormat = 'linux-x64' | 'linux-arm64' | 'linux-musl' | 'linux-other' | 'other-os';

type CompiledFile = { path: string; format: CompiledFormat };

type NativeFiles = {
  /** Compiled addons (`*.node`), relative to the package directory. */
  addons: string[];
  /** Every compiled file, addons included, such as an `ffmpeg` an install script downloaded, outside `prebuilds/`. */
  compiled: CompiledFile[];
  hasBindingGyp: boolean;
  /** Platform directories under `prebuilds/`, such as `linux-x64`. */
  prebuildPlatforms: string[];
};

/** Source, text and asset files, whose headers are not worth reading. Every other file may be compiled. */
const TEXT_EXTENSIONS = new Set(
  '.js .cjs .mjs .jsx .ts .cts .mts .tsx .json .map .md .markdown .txt .css .scss .less .html .htm .yml .yaml .xml .svg .png .jpg .jpeg .gif .ico .webp .flow .coffee .vue .svelte .astro .graphql .gql .proto .sql .csv .lock .wasm .woff .woff2 .ttf .eot .c .cc .cpp .h .hpp .gyp .gypi .py .sh .cmd .ps1 .bat'.split(
    ' '
  )
);

/** ELF (Linux), Mach-O (macOS) and PE (Windows) headers; an ELF header also names its machine at byte 18. */
const MACH_O_HEADERS = new Set(['feedface', 'feedfacf', 'cefaedfe', 'cffaedfe', 'cafebabe']);
const ELF_MACHINES: Record<number, CompiledFormat> = { 0x3e: 'linux-x64', 0xb7: 'linux-arm64' };

/**
 * Whether a Linux program or library is linked against musl: its loader (`ld-musl-*`) or C library (`libc.musl-*`,
 * or plain `libc.so`, where glibc's is `libc.so.6`) appears among its dynamic names.
 */
const isLinkedAgainstMusl = (contents: Buffer) =>
  contents.includes('ld-musl-') ||
  contents.includes('libc.musl-') ||
  (contents.includes('\0libc.so\0') && !contents.includes('\0libc.so.6\0'));

const readCompiledFormat = async (path: string): Promise<CompiledFormat | undefined> => {
  const file = await open(path, 'r');
  let header: Buffer;
  try {
    const { buffer, bytesRead } = await file.read(Buffer.alloc(20), 0, 20, 0);
    header = buffer.subarray(0, bytesRead);
  } finally {
    await file.close();
  }
  const magic = header.subarray(0, 4).toString('hex');
  if (MACH_O_HEADERS.has(magic) || magic.startsWith('4d5a')) return 'other-os';
  if (magic !== '7f454c46') return undefined;
  if (isLinkedAgainstMusl(await readFile(path))) return 'linux-musl';
  return header.length >= 20 ? (ELF_MACHINES[header.readUInt16LE(18)] ?? 'linux-other') : 'linux-other';
};

const nativeFilesByPackage = new Map<string, Promise<NativeFiles>>();

/** Addons, `binding.gyp` and prebuilds in the package itself, not in its own `node_modules`. */
const findNativeFiles = (packageRoot: string): Promise<NativeFiles> => {
  let found = nativeFilesByPackage.get(packageRoot);
  if (!found) {
    found = (async () => {
      const addons: string[] = [];
      const compiled: CompiledFile[] = [];
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
            const relativePath = relative(packageRoot, path);
            if (entry.name.endsWith('.node')) addons.push(relativePath);
            if (!entry.isFile() || TEXT_EXTENSIONS.has(extname(entry.name).toLowerCase())) return;
            const format = await readCompiledFormat(path);
            if (format && relativePath.split(sep)[0] !== 'prebuilds') compiled.push({ path: relativePath, format });
          })
        );
      };
      await visit(packageRoot);
      return { addons, compiled, hasBindingGyp: existsSync(join(packageRoot, 'binding.gyp')), prebuildPlatforms };
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
  if (declaresPlatform(manifest)) return 'built for one platform';
  if (manifest.gypfile || manifest.binary?.module_path) return 'native addon';
  if ((await findPlatformPackages(packageRoot, manifest)).length > 0) return 'platform-specific binaries';
  const { addons, compiled, hasBindingGyp, prebuildPlatforms } = await findNativeFiles(packageRoot);
  if (addons.length > 0 || hasBindingGyp || prebuildPlatforms.length > 0) return 'native addon';
  if (compiled.length > 0) return 'contains compiled programs';
  return undefined;
};

/**
 * Whether the installed copy of a package runs on Lambda without being installed again there.
 *
 * An addon under `build/` was compiled on this machine, against its Node.js and its C library, so it is rebuilt in the
 * Lambda build image even when the platforms match. Prebuilds are used when they include Lambda's platform; an install
 * script next to them (node-gyp-build) only compiles into `build/` when they do not. A file linked against musl is
 * always installed again. Compiled files that are all glibc Linux builds for Lambda's architecture are used on any
 * machine. Anything else an install script left behind, and any other
 * compiled file, was chosen for this machine, so it is used only when this machine is Lambda's platform.
 */
export const isInstalledForLambda = async (packageRoot: string, architecture: LambdaArchitecture) => {
  const manifest = await readPackageManifest(packageRoot);
  if (declaresPlatform(manifest) && !runsOnLambda(manifest, architecture)) return false;

  const platformPackages = await findPlatformPackages(packageRoot, manifest);
  if (platformPackages.length > 0) return platformPackages.some((installed) => runsOnLambda(installed, architecture));

  const { addons, compiled, hasBindingGyp, prebuildPlatforms } = await findNativeFiles(packageRoot);
  if (addons.some((addon) => addon.split(sep)[0] === 'build')) return false;
  if ((manifest.gypfile || hasBindingGyp) && addons.length === 0) return false;
  if (prebuildPlatforms.length > 0) return prebuildPlatforms.includes(`linux-${architecture}`);
  // Lambda's C library is glibc, so an addon built on Alpine never loads there, whatever the machine.
  if (compiled.some(({ format }) => format === 'linux-musl')) return false;
  if (compiled.length > 0 && compiled.every(({ format }) => format === `linux-${architecture}`)) return true;
  const hasInstallScript = INSTALL_SCRIPTS.some((script) => manifest.scripts?.[script]);
  if (hasInstallScript || compiled.length > 0 || manifest.binary?.module_path) return hostMatchesLambda(architecture);
  return true;
};
