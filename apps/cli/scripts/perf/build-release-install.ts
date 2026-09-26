/**
 * Builds a runnable release installation for the host platform, for measuring the CLI as it ships.
 *
 *   bun scripts/perf/build-release-install.ts --out <new or empty directory> [--bytecode off|all|<depth>]
 *
 * Run it from `apps/cli`: the release builder resolves its inputs from the working directory. The executable comes
 * from `buildBinaryFile` with the package.json version, exactly as `test:cli-smoke` builds it; nothing here restates
 * its settings. Without `--bytecode` the executable is the release default as `buildBinaryFile` builds it. `--bytecode`
 * overrides that one `Bun.build` call's bytecode and nothing else: `off` sets `bytecode: false`, `all` sets
 * `bytecode: true`, and a nesting depth adds `bytecodeDepth`; `off` and `all` remove the release call's own depth.
 * `install.json` records the call as made and labels the executable from it, so two installations can be shown to
 * differ only there. Beside it go the files a measured command reads: the
 * helper-Lambda artifacts every command loads, the
 * source-map banner and Lambda tracing runtime that packaging embeds, `release-data.json` and the config schema. The
 * downloaded third-party tools (pack, nixpacks, the Session Manager plugin), the MCP documentation corpus, the init
 * wizard and the starter metadata are left out: no measured command reads them, and fetching them would add network
 * work.
 *
 * `install.json` records the executable's SHA-256, size and compile target, the bundler settings, every other file's
 * SHA-256, the Bun that built it, and the Stacktape source before and after the build. If the source changed during
 * the build or could not be read, the script says so and exits 1.
 */
import type { SupportedPlatform } from '@utils/platform';
import type { SourceIdentity } from './measurement-context';
import { createHash } from 'node:crypto';
import { createReadStream, realpathSync } from 'node:fs';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { getPlatform } from '@utils/bin-executable';
import yargsParser from 'yargs-parser';
import packageJson from '../../package.json';
import { packageHelperLambdas } from '../package-helper-lambdas';
import {
  BUN_COMPILE_TARGETS,
  buildBinaryFile,
  copyConfigSchema,
  createReleaseDataFile,
  generateLambdaTracingRuntime,
  generateSourceMapInstall,
  getReleaseBundleOptions
} from '../release/build-cli-sources';
import {
  claimOutputDirectory,
  createSourceTracker,
  describeSourceIdentity,
  getHostEnvironment
} from './measurement-context';

const CLI_ROOT = resolve(import.meta.dir, '../..');
const REPO_ROOT = resolve(CLI_ROOT, '../..');
/** Everything the release executable is built from, as for `analyze:bundle`. */
const SOURCE_SCOPES = ['apps/cli', 'packages', 'pnpm-lock.yaml'];

export type InstalledFile = { path: string; bytes: number; executable: boolean; sha256: string };

export type ReleaseInstallManifest = {
  schema: 1;
  kind: 'stacktape-release-install';
  /** Directory holding the executable and its files, relative to the manifest. */
  installDirectory: string;
  executable: InstalledFile;
  platform: string;
  compileTarget: string;
  version: string;
  /**
   * The bundler settings `buildBinaryFile` passes to `Bun.build`, apart from the compile target and output file, with
   * the bytecode settings as the executable's build call made them.
   */
  bundleSettings: Record<string, unknown>;
  /** SHA-256 of the release builder, whose `compile` options this manifest does not restate. */
  releaseBuilderSha256: string;
  /** The executable's bytecode, read from its build call: `off`, `all` or `depth-<n>`. */
  bytecode?: string;
  /** What was asked for: `release-default` (no `--bytecode`), or the override `off`, `all` or `depth-<n>`. */
  bytecodeRequest?: string;
  /** The executable's `Bun.build` options as passed, with plugins by name and paths relative. */
  buildCall?: Record<string, unknown>;
  builtBy: ReturnType<typeof getHostEnvironment>;
  buildMs: number;
  files: InstalledFile[];
  omitted: string[];
  source: { before: SourceIdentity; after: SourceIdentity; check: string };
};

export const sha256File = (path: string) =>
  new Promise<string>((resolveHash, reject) => {
    const hash = createHash('sha256');
    createReadStream(path)
      .on('data', (chunk) => hash.update(chunk))
      .on('error', reject)
      .on('end', () => resolveHash(hash.digest('hex')));
  });

const describeFile = async (root: string, path: string): Promise<InstalledFile> => {
  const stats = await stat(path);
  return {
    path: relative(root, path).split('\\').join('/'),
    bytes: stats.size,
    executable: (stats.mode & 0o111) !== 0,
    sha256: await sha256File(path)
  };
};

const listFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? listFiles(path) : [path];
    })
  );
  return nested.flat().toSorted();
};

/** The release bundler settings in a form JSON can hold: plugins by name, paths relative to the CLI package. */
const describeBundleSettings = (version: string, platform: SupportedPlatform) => {
  const { entrypoints, plugins, tsconfig, ...settings } = getReleaseBundleOptions({ platform, version });
  return {
    ...settings,
    entrypoints: entrypoints.map((path) => relative(CLI_ROOT, path)),
    tsconfig: tsconfig ? relative(CLI_ROOT, tsconfig) : tsconfig,
    plugins: plugins.map(({ name }) => name)
  };
};

export type BytecodeSetting = {
  name: string;
  options: { bytecode?: boolean; bytecodeDepth?: number | undefined };
};

/**
 * No value keeps the release call as it is (`release-default`). `off`, `all` or a nesting depth such as `0`, `1` or `2`
 * overrides its bytecode; `off` and `all` remove the release call's own depth instead of inheriting it.
 */
export const parseBytecodeSetting = (value: unknown): BytecodeSetting => {
  if (value === undefined) return { name: 'release-default', options: {} };
  if (value === 'off') return { name: 'off', options: { bytecode: false, bytecodeDepth: undefined } };
  if (value === 'all') return { name: 'all', options: { bytecode: true, bytecodeDepth: undefined } };
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return { name: `depth-${value}`, options: { bytecode: true, bytecodeDepth: Number(value) } };
  }
  throw new Error(`--bytecode must be off, all or a nesting depth such as 0, 1 or 2, not ${JSON.stringify(value)}.`);
};

/**
 * Runs `build` with `extra` added to every `Bun.build` call it makes, and returns those calls as passed. An `extra` key
 * whose value is `undefined` removes that option from the call. `Bun.build` is restored afterwards, whatever happened.
 */
export const withBuildOptions = async <T>(extra: Record<string, unknown>, build: () => Promise<T>) => {
  const original = Bun.build;
  const calls: Record<string, unknown>[] = [];
  Bun.build = ((options: Parameters<typeof Bun.build>[0]) => {
    const passed: Record<string, unknown> = { ...options, ...extra };
    for (const [key, value] of Object.entries(extra)) {
      if (value === undefined) delete passed[key];
    }
    calls.push(passed);
    return original(passed as unknown as Parameters<typeof Bun.build>[0]);
  }) as typeof Bun.build;
  try {
    return { result: await build(), calls };
  } finally {
    Bun.build = original;
  }
};

/** The bytecode an executable build call produces: `off`, `all` or `depth-<n>`. */
const describeBytecode = (call: Record<string, unknown>) =>
  call.bytecode !== true ? 'off' : call.bytecodeDepth === undefined ? 'all' : `depth-${call.bytecodeDepth}`;

/** A path below `base`, relative and with forward slashes whatever the platform wrote; otherwise undefined. */
const pathBelow = (path: string, base: string) => {
  const [child, parent] = [path.replaceAll('\\', '/'), `${base.replaceAll('\\', '/')}/`];
  return child.startsWith(parent) ? child.slice(parent.length) : undefined;
};

/** `Bun.build` options in a form JSON can hold: plugins by name, functions marked, paths relative to `root`. */
export const describeBuildCall = (options: Record<string, unknown>, root: string) =>
  JSON.parse(
    JSON.stringify(options, (key, value) => {
      if (key === 'plugins' && Array.isArray(value)) return value.map((plugin) => plugin?.name ?? '[unnamed]');
      if (typeof value === 'function') return '[function]';
      if (typeof value !== 'string') return value;
      const belowRoot = pathBelow(value, root);
      if (belowRoot !== undefined) return `<out>/${belowRoot}`;
      return pathBelow(value, CLI_ROOT) ?? value;
    })
  ) as Record<string, unknown>;

const main = async () => {
  if (realpathSync(process.cwd()) !== realpathSync(CLI_ROOT)) {
    throw new Error(`Run this script from ${CLI_ROOT}: the release builder resolves its inputs from there.`);
  }
  const args = yargsParser(process.argv.slice(2), { string: ['out', 'bytecode'] });
  if (!args.out) {
    throw new Error(
      'Usage: bun scripts/perf/build-release-install.ts --out <new or empty directory> [--bytecode off|all|<depth>]'
    );
  }
  const bytecode = parseBytecodeSetting(args.bytecode);
  const outDirectory = resolve(args.out);
  await claimOutputDirectory(outDirectory);

  const source = createSourceTracker({ repoRoot: REPO_ROOT, scopes: SOURCE_SCOPES, excludePaths: [outDirectory] });
  const platform = getPlatform();
  const version = packageJson.version;
  const startedAt = performance.now();
  const { result: installDirectory, calls } = await withBuildOptions(bytecode.options, () =>
    buildBinaryFile({ distFolderPath: outDirectory, platform, version })
  );
  if (calls.length !== 1) throw new Error(`Expected one executable build, saw ${calls.length} Bun.build calls.`);
  const call = calls[0]!;
  const effectiveBytecode = describeBytecode(call);
  await Promise.all([
    packageHelperLambdas({ distFolderPath: installDirectory }),
    generateSourceMapInstall({ distFolderPath: installDirectory }),
    generateLambdaTracingRuntime({ distFolderPath: installDirectory }),
    createReleaseDataFile({ distFolderPath: installDirectory, version }),
    copyConfigSchema({ distFolderPath: installDirectory })
  ]);
  const buildMs = Math.round(performance.now() - startedAt);
  const sourceCheck = source.check();

  const executablePath = join(installDirectory, platform === 'win' ? 'stacktape.exe' : 'stacktape');
  const files = await Promise.all(
    (await listFiles(installDirectory)).map((path) => describeFile(installDirectory, path))
  );
  const manifest: ReleaseInstallManifest = {
    schema: 1,
    kind: 'stacktape-release-install',
    installDirectory: relative(outDirectory, installDirectory),
    executable: await describeFile(installDirectory, executablePath),
    platform,
    compileTarget: BUN_COMPILE_TARGETS[platform],
    version,
    bundleSettings: {
      ...describeBundleSettings(version, platform),
      bytecode: call.bytecode === true,
      ...(call.bytecodeDepth !== undefined && { bytecodeDepth: call.bytecodeDepth })
    },
    releaseBuilderSha256: createHash('sha256')
      .update(await readFile(join(CLI_ROOT, 'scripts/release/build-cli-sources.ts')))
      .digest('hex'),
    bytecode: effectiveBytecode,
    bytecodeRequest: bytecode.name,
    buildCall: describeBuildCall(call, outDirectory),
    builtBy: getHostEnvironment(),
    buildMs,
    files,
    omitted: [
      'pack, nixpacks and Session Manager plugin binaries (downloaded)',
      'MCP documentation corpus',
      'init wizard interface',
      'starter project metadata'
    ],
    source: { before: source.before, after: source.after, check: sourceCheck }
  };
  await writeFile(join(outDirectory, 'install.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  console.info(
    [
      `Executable: ${executablePath}`,
      `SHA-256 ${manifest.executable.sha256}, ${manifest.executable.bytes} bytes, target ${manifest.compileTarget}, version ${version}`,
      `Built in ${buildMs} ms with Bun ${Bun.version}, bytecode ${effectiveBytecode} (requested ${bytecode.name})`,
      `Source before: ${describeSourceIdentity(source.before)}`,
      `Source check: ${sourceCheck}`
    ].join('\n')
  );
  if (sourceCheck !== 'unchanged') {
    console.error(
      'The source changed during the build or could not be read; this installation is not tied to one tree.'
    );
    process.exitCode = 1;
  }
};

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
