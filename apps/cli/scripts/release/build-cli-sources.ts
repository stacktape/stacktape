import { isWindowsPlatform, type SupportedPlatform } from '@utils/platform';
import type { BunPlugin } from 'bun';
import { randomUUID } from 'node:crypto';
import { arch, tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { brotliCompressSync, constants } from 'node:zlib';
import {
  COMPLETIONS_SCRIPTS_PATH,
  CONFIG_SCHEMA_PATH,
  DIST_FOLDER_PATH,
  INIT_WIZARD_BUNDLE_SOURCE_PATH,
  LAMBDA_TRACING_RUNTIME_FILE_NAME,
  LAMBDA_TRACING_RUNTIME_SOURCE_PATH,
  LLM_DOCS_FOLDER_PATH,
  SCRIPTS_ASSETS_PATH,
  SOURCE_MAP_INSTALL_FILE_NAME,
  BRIDGE_FILES_FOLDER_NAME,
  BRIDGE_FILES_SOURCE_PATH
} from 'src/config/project-paths';
import { buildEsCode } from '@stacktape/packaging/bundlers/es';
import { getPlatform } from '@utils/bin-executable';
import { downloadFile } from '@utils/download-file';
import { logInfo, logSuccess } from '@scripts/support/logging';
import { createCliPackagingError } from '@domain-services/packaging-manager/errors';
import { localBuildTsConfigPath } from '@utils/misc';
import { createStacktapeOpenTuiBuildPlugin } from '@scripts/support/opentui-loader';
import { createCloudFormationSpecBuildPlugin } from '@scripts/support/cloudformation-spec-loader';
import { createFsExtraSingleCopyPlugin } from '@scripts/support/fs-extra-single-copy-plugin';
import { archiveItem, extractTgzArchive } from '@utils/zip';
import {
  chmod,
  copy,
  ensureDir,
  mkdirSync,
  mkdtemp,
  outputFile,
  pathExists,
  readdir,
  readFile,
  readJsonSync,
  realpath,
  remove,
  writeFileSync,
  writeJson
} from 'fs-extra';
import {
  createBashCompletionScript,
  createPowershellCompletionScript,
  createZshCompletionScript
} from '../generate-completions';

// import { generateAllStarterProjects } from './generate-starter-project';

export const ALL_SUPPORTED_PLATFORMS: SupportedPlatform[] = [
  'win',
  'win-arm',
  'linux',
  'macos',
  'macos-arm',
  'alpine',
  'linux-arm'
];

export const buildEsbuildRegister = async ({ distFolderPath }: { distFolderPath?: string }) => {
  logInfo('Copying esbuild-register...');
  const esbuildRegisterDistFolderPath = join(distFolderPath, 'esbuild', 'esbuild-register.js');
  await buildEsCode({
    createPackagingError: createCliPackagingError,
    rawCode: 'require("esbuild-register/dist/node").register();',
    distPath: esbuildRegisterDistFolderPath,
    externals: [],
    sourceMaps: 'disabled',
    sourceMapBannerType: 'disabled',
    tsConfigPath: localBuildTsConfigPath,
    minify: true,
    nodeTarget: '18',
    cwd: process.cwd()
  });
  logSuccess('esbuild-register copied successfully.');
};

const BINARY_FOLDER_NAMES: { [_platform in SupportedPlatform]: string } = {
  win: 'windows',
  'win-arm': 'windows-arm',
  macos: 'macos',
  linux: 'linux',
  'macos-arm': 'macos-arm',
  alpine: 'alpine',
  'linux-arm': 'linux-arm'
};

const ESBUILD_BINARY_PACKAGE_NAMES: { [_platform in SupportedPlatform]: string } = {
  win: '@esbuild/win32-x64',
  'win-arm': '@esbuild/win32-arm64',
  macos: '@esbuild/darwin-x64',
  linux: '@esbuild/linux-x64',
  'macos-arm': '@esbuild/darwin-arm64',
  alpine: '@esbuild/linux-x64',
  'linux-arm': '@esbuild/linux-arm64'
};
const ESBUILD_BINARY_FILE_LOCATIONS: { [_platform in SupportedPlatform]: string[] } = {
  win: ['esbuild.exe'],
  'win-arm': ['esbuild.exe'],
  macos: ['bin', 'esbuild'],
  linux: ['bin', 'esbuild'],
  'macos-arm': ['bin', 'esbuild'],
  alpine: ['bin', 'esbuild'],
  'linux-arm': ['bin', 'esbuild']
};

// File patterns that should have executable permissions in archives
export const EXECUTABLE_FILE_PATTERNS = [
  'stacktape',
  'stacktape.exe',
  // The Session Manager plugin that only the Windows archives ship.
  '*/smp.exe',
  '*/exec',
  '*/exec.exe'
];

export const generateLambdaTracingRuntime = async ({ distFolderPath }: { distFolderPath: string }) => {
  logInfo('Generating the Lambda tracing runtime...');
  await buildEsCode({
    createPackagingError: createCliPackagingError,
    sourcePath: LAMBDA_TRACING_RUNTIME_SOURCE_PATH,
    distPath: join(distFolderPath, LAMBDA_TRACING_RUNTIME_FILE_NAME),
    outputModuleFormat: 'esm',
    externals: [],
    sourceMaps: 'disabled',
    sourceMapBannerType: 'disabled',
    tsConfigPath: localBuildTsConfigPath,
    minify: true,
    nodeTarget: '18.18',
    cwd: process.cwd()
  });
  logSuccess('Lambda tracing runtime generated successfully.');
};

export const generateSourceMapInstall = async ({ distFolderPath }: { distFolderPath: string }) => {
  logInfo('Generating source map install file...');
  await buildEsCode({
    createPackagingError: createCliPackagingError,
    rawCode: 'require("source-map-support").install({ environment: "node", handleUncaughtExceptions: false });',
    distPath: join(distFolderPath, SOURCE_MAP_INSTALL_FILE_NAME),
    externals: ['path'],
    excludeDependencies: ['path'],
    sourceMaps: 'disabled',
    sourceMapBannerType: 'disabled',
    tsConfigPath: localBuildTsConfigPath,
    nodeTarget: '18.18',
    cwd: process.cwd()
  });

  logSuccess('Source map install file generated successfully.');
};

// The Linux runtime selects glibc or musl after startup, so a cross-compiled Linux binary must bundle both native
// variants. Other targets have one native package per OS/architecture pair.
export const OPENTUI_PLATFORM_IDENTIFIERS: { [_platform in SupportedPlatform]: string[] } = {
  win: ['win32-x64'],
  'win-arm': ['win32-arm64'],
  macos: ['darwin-x64'],
  'macos-arm': ['darwin-arm64'],
  linux: ['linux-x64', 'linux-x64-musl'],
  alpine: ['linux-x64', 'linux-x64-musl'],
  'linux-arm': ['linux-arm64', 'linux-arm64-musl']
};

export const BUN_COMPILE_TARGETS: { [_platform in SupportedPlatform]: Bun.Build.CompileTarget } = {
  win: 'bun-windows-x64',
  'win-arm': 'bun-windows-arm64',
  macos: 'bun-darwin-x64',
  'macos-arm': 'bun-darwin-arm64',
  linux: 'bun-linux-x64',
  'linux-arm': 'bun-linux-arm64',
  alpine: 'bun-linux-x64-baseline-musl'
};

/**
 * The bundler resolves @opentui/core's native package from node_modules/@opentui. When cross-compiling, the
 * target platform's package is not installed at all (installers skip packages filtered by os/cpu), so it is
 * downloaded from npm. Building for the current platform reuses what is already installed.
 */
const ensureOpenTuiPlatformPackage = async (platformId: string) => {
  const scopedName = `core-${platformId}`;
  const corePackageDir = join(process.cwd(), 'node_modules', '@opentui', 'core');
  const packageDir = join(process.cwd(), 'node_modules', '@opentui', scopedName);

  if (await pathExists(join(packageDir, 'package.json'))) return;

  // Building for the current platform needs no download: its package is installed, just not at the path above,
  // because pnpm keeps a package's dependencies next to the package itself rather than at the project root.
  const installedPath = join(await realpath(corePackageDir), '..', scopedName);
  if (await pathExists(join(installedPath, 'package.json'))) {
    // pnpm represents this dependency as a relative symlink inside its virtual store. Copying the symlink to the
    // workspace root preserves a target that is only valid at the old depth, so copy the resolved package contents.
    await remove(packageDir);
    await copy(await realpath(installedPath), packageDir, { dereference: true });
    return;
  }

  const coreVersion = readJsonSync(join(corePackageDir, 'package.json')).version;
  const tarballUrl = `https://registry.npmjs.org/@opentui/${scopedName}/-/${scopedName}-${coreVersion}.tgz`;

  logInfo(`Downloading @opentui/${scopedName}@${coreVersion} for cross-compilation...`);

  const response = await fetch(tarballUrl);
  if (!response.ok) throw new Error(`Failed to download ${tarballUrl}: ${response.status}`);

  const tgzBuffer = Buffer.from(await response.arrayBuffer());

  // Extract using tar.t to read entries, then write files manually
  // (tar.x has issues writing small files on some platforms)
  const { Readable } = await import('node:stream');
  const { createGunzip } = await import('node:zlib');
  const tar = await import('tar');

  await remove(packageDir);
  await ensureDir(packageDir);

  await new Promise<void>((resolve, reject) => {
    const parser = new tar.Parser();
    parser.on('entry', (entry: { path: string; on: (event: string, cb: (chunk?: Buffer) => void) => void }) => {
      // Strip leading "package/" prefix from npm tarball paths
      const relativePath = entry.path.replace(/^package\//, '');
      if (!relativePath) {
        entry.on('data', () => {});
        return;
      }
      const chunks: Buffer[] = [];
      entry.on('data', (chunk: Buffer) => chunks.push(chunk));
      entry.on('end', () => {
        const destPath = join(packageDir, relativePath);
        mkdirSync(join(destPath, '..'), { recursive: true });
        writeFileSync(destPath, Buffer.concat(chunks));
      });
    });
    parser.on('end', resolve);
    parser.on('error', reject);
    Readable.from(tgzBuffer).pipe(createGunzip()).pipe(parser);
  });

  logSuccess(`Installed @opentui/${scopedName}@${coreVersion}.`);
};

const ensureOpenTuiPlatformPackages = async (platform: SupportedPlatform) => {
  await Promise.all(OPENTUI_PLATFORM_IDENTIFIERS[platform].map(ensureOpenTuiPlatformPackage));
};

// OpenTUI's Linux libraries are 26 MB each, three quarters of it debug information. The Linux and Alpine executables
// embed copies without it: `strip --strip-debug` leaves the dynamic symbols the runtime binds unchanged. The files in
// node_modules are not modified, and the lockfile-pinned packages keep the debug information for native crash
// diagnosis. Alpine was qualified in an `alpine:3.22` container (Wave 1H): the interactive launcher drew, redrew for
// input and quit on Ctrl+C while mapping exactly the stripped musl copy. Other targets embed their libraries unchanged
// until they are qualified separately.
const OPENTUI_DEBUG_STRIPPED_PLATFORMS: SupportedPlatform[] = ['linux', 'alpine'];

const stripDebugInformation = async (libraryPath: string) => {
  if (!Bun.which('strip')) {
    throw new Error(
      `Linux and Alpine builds need strip from GNU binutils to remove debug information from ${libraryPath}.`
    );
  }
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-opentui-'));
  try {
    const strippedPath = join(directory, basename(libraryPath));
    const strip = Bun.spawnSync({ cmd: ['strip', '--strip-debug', '-o', strippedPath, libraryPath], stderr: 'pipe' });
    if (!strip.success) {
      throw new Error(`strip could not remove debug information from ${libraryPath}:\n${strip.stderr.toString()}`);
    }
    return await readFile(strippedPath);
  } finally {
    await remove(directory);
  }
};

const createOpenTuiDebugStripPlugin = (): BunPlugin => ({
  name: 'stacktape-opentui-strip-debug',
  setup(build) {
    build.onLoad({ filter: /[\\/]@opentui[\\/]core-linux-x64(-musl)?[\\/]libopentui\.so$/ }, async ({ path }) => ({
      contents: await stripDebugInformation(path),
      loader: 'file'
    }));
  }
});

/**
 * Bundler settings of the executable released for `platform`, apart from its compile target and output file.
 * `analyze:bundle` builds with the same settings so the graph it attributes is the one the release ships.
 */
export const getReleaseBundleOptions = ({
  debug,
  platform,
  version,
  errorTrackingChunkId
}: {
  debug?: boolean;
  platform: SupportedPlatform;
  version?: string;
  /** Identifies the executable's source map in PostHog (`writeErrorTrackingSourceMap`). */
  errorTrackingChunkId?: string;
}) => ({
  entrypoints: [join(process.cwd(), 'src', 'entrypoints', 'compiled-cli.ts')],
  // Preserve command-level dynamic imports as ESM chunks inside the executable instead of initializing every command.
  format: 'esm' as const,
  // A compiled executable can emit a separate `compiled-cli.js.map`. It is useful while debugging, but shipping it
  // added more than 70 MB to every installed release.
  sourcemap: debug ? ('external' as const) : ('none' as const),
  // Production executables do not ship their >70 MB source map. Minify syntax and whitespace while retaining
  // identifiers so PostHog exception grouping and stack traces still contain useful function/class names.
  minify: debug ? false : { whitespace: true, syntax: true, identifiers: false },
  plugins: [
    createStacktapeOpenTuiBuildPlugin(),
    createCloudFormationSpecBuildPlugin(),
    createFsExtraSingleCopyPlugin(),
    ...(OPENTUI_DEBUG_STRIPPED_PLATFORMS.includes(platform) ? [createOpenTuiDebugStripPlugin()] : [])
  ],
  tsconfig: localBuildTsConfigPath,
  define: {
    STACKTAPE_VERSION: JSON.stringify(version || 'dev'),
    STACKTAPE_ERROR_TRACKING_CHUNK_ID: JSON.stringify(errorTrackingChunkId || '')
  }
});

/**
 * Release targets whose executable carries Bun bytecode, at nesting depth 1. Bun generates it on the build host, and
 * a target that cannot use it silently parses the source instead, so a target joins only after its cross-built
 * archive ran on its own host (`qualify-bytecode.ts`): identical behavior, and `--version` and `--help` in a quarter
 * to a third of the time. Linux x64 was qualified on its host (Wave 1D), Alpine x64 in an `alpine:3.22` container and
 * Windows x64 natively through WSL interop (Wave 1H). macOS x64 (`macos-15-intel`), macOS arm64 (`macos-15`) and
 * Linux arm64 (`ubuntu-24.04-arm`) were qualified by the release workflow's `bytecode_qualification` run 36174122384
 * on 2026-09-25: 22/22 checks each and `--version` in 0.23-0.25 of the time. Linux arm64's depth-1 archive measured
 * 89.6 MiB against its 90 MiB gate; strip its arm64 OpenTUI libraries if that gate trips. Windows arm64
 * (`windows-11-arm`) was qualified by `bytecode_qualification` run 38414606180 on 2026-10-13: 20/20 checks, `--version`
 * in 0.24 of the time and a 71.5 MiB depth-1 archive.
 */
const BYTECODE_PLATFORMS: SupportedPlatform[] = [
  'linux',
  'alpine',
  'win',
  'win-arm',
  'macos',
  'macos-arm',
  'linux-arm'
];

/**
 * Writes the executable's code and source map for upload to PostHog error tracking, which then shows CLI exceptions with
 * TypeScript files and lines. The map is never shipped (see `sourcemap` above), and Bun embeds it in any executable
 * built with one, so a second build of the same code produces it. That build may only append its `debugId` comment;
 * any other difference means the map does not describe the released code, and the release fails.
 *
 * Both builds define the same `errorTrackingChunkId`. The CLI registers it for its frames at runtime
 * (`utils/telemetry.ts`), and it replaces Bun's own debug ID in the written pair, which `posthog-cli sourcemap upload`
 * uses as the chunk ID.
 */
const writeErrorTrackingSourceMap = async ({
  options,
  compileTarget,
  releasedCode,
  chunkId,
  directory
}: {
  options: ReturnType<typeof getReleaseBundleOptions>;
  compileTarget: Bun.Build.CompileTarget;
  releasedCode: string;
  chunkId: string;
  directory: string;
}) => {
  const workDirectory = await mkdtemp(join(tmpdir(), 'stacktape-error-tracking-map-'));
  try {
    const result = await Bun.build({
      ...options,
      sourcemap: 'external',
      compile: {
        target: compileTarget,
        outfile: join(workDirectory, 'stacktape'),
        autoloadTsconfig: true,
        autoloadPackageJson: true
      },
      throw: false
    });
    const code = result.outputs.find(({ kind }) => kind === 'entry-point');
    const sourceMap = result.outputs.find(({ kind }) => kind === 'sourcemap');
    if (!result.success || !code || !sourceMap) {
      throw new Error(`Failed to build the error-tracking source map:\n${result.logs.map(String).join('\n')}`);
    }
    const mappedCode = (await code.text()).replace(/\n\/\/# debugId=[0-9A-F]+\n$/, '');
    if (mappedCode !== releasedCode) {
      throw new Error('The error-tracking source map build produced different code than the release executable.');
    }
    const map = JSON.parse(await sourceMap.text());
    map.debugId = chunkId;
    await ensureDir(directory);
    await outputFile(
      join(directory, 'stacktape.js'),
      `${mappedCode}\n//# debugId=${chunkId}\n//# sourceMappingURL=stacktape.js.map\n`
    );
    await outputFile(join(directory, 'stacktape.js.map'), JSON.stringify(map));
    logSuccess(`Error-tracking source map written to ${directory}.`);
  } finally {
    await remove(workDirectory);
  }
};

export const buildBinaryFile = async ({
  distFolderPath,
  debug,
  platform,
  version,
  bytecodeDepth = !debug && BYTECODE_PLATFORMS.includes(platform) ? 1 : 'off',
  errorTrackingSourceMapDirectory
}: {
  distFolderPath?: string;
  debug?: boolean;
  platform: SupportedPlatform;
  version?: string;
  /** Overrides the platform's release bytecode, for `qualify-bytecode.ts` only. */
  bytecodeDepth?: number | 'off';
  /** Where to write the executable's code and source map for PostHog (`writeErrorTrackingSourceMap`). */
  errorTrackingSourceMapDirectory?: string;
}) => {
  const binFolderName = BINARY_FOLDER_NAMES[platform];
  const outputFolderPath = join(distFolderPath, binFolderName);

  logInfo(`Building binary for platform ${platform} using Bun... ${debug ? '[DEBUG mode]' : ''}`);

  // Ensure output directory exists
  await ensureDir(outputFolderPath);

  // Ensure the target platform's @opentui/core native package is available for cross-compilation
  await ensureOpenTuiPlatformPackages(platform);

  const compileTarget = BUN_COMPILE_TARGETS[platform];

  const outputFileName = isWindowsPlatform(platform) ? 'stacktape.exe' : 'stacktape';
  const outputPath = join(outputFolderPath, outputFileName);

  const errorTrackingChunkId = errorTrackingSourceMapDirectory && !debug ? randomUUID() : undefined;
  const options = {
    ...getReleaseBundleOptions({ debug, platform, version, errorTrackingChunkId }),
    // Only the executable build: `getReleaseBundleOptions` also serves bundle analysis, which compiles nothing.
    ...(bytecodeDepth !== 'off' && { bytecode: true, bytecodeDepth })
  };
  const result = await Bun.build({
    ...options,
    compile: {
      target: compileTarget,
      outfile: outputPath,
      autoloadTsconfig: true,
      autoloadPackageJson: true
    },
    throw: false
  });

  if (!result.success) {
    const errors = result.logs.map((log) => log.message || String(log)).join('\n');
    throw new Error(`Failed to build binary for platform ${platform}:\n${errors}`);
  }

  if (errorTrackingChunkId) {
    await writeErrorTrackingSourceMap({
      options,
      compileTarget,
      releasedCode: await result.outputs.find(({ kind }) => kind === 'entry-point')!.text(),
      chunkId: errorTrackingChunkId,
      directory: errorTrackingSourceMapDirectory!
    });
  }

  if (!isWindowsPlatform(platform)) {
    await chmod(outputPath, 0o755);
  }
  logSuccess(`Binary for platform ${platform} generated successfully.`);

  return outputFolderPath;
};

/**
 * railpack and the Session Manager plugin are downloaded on first use (`src/utils/external-tools.ts`). The one
 * exception is the plugin on Windows, where AWS publishes only an installer: those archives keep shipping it. AWS
 * builds it for x64 only, so Windows ARM64 runs the same executable under the system's x64 emulation.
 */
export const copySessionsManagerPluginBinary = async ({
  distFolderPath,
  platform
}: {
  distFolderPath?: string;
  platform: SupportedPlatform;
}) => {
  if (!isWindowsPlatform(platform)) return;
  const sourcePath = join(SCRIPTS_ASSETS_PATH, 'session-manager-plugin', 'smp-win.exe');
  const distPath = join(distFolderPath, BINARY_FOLDER_NAMES[platform], 'session-manager-plugin', 'smp.exe');
  return await copy(sourcePath, distPath);
};

export const copyEsbuildBinary = async ({
  distFolderPath,
  platform
}: {
  distFolderPath?: string;
  platform: SupportedPlatform;
}) => {
  const { dependencies } = readJsonSync(join(process.cwd(), 'package.json'));
  const version = dependencies.esbuild.replace('^', '').replace('~', '');
  const esbuildPackageName = ESBUILD_BINARY_PACKAGE_NAMES[platform];
  const esbuildSubPackageName = esbuildPackageName.replace('@esbuild/', '');
  const downloadUrl = `https://registry.yarnpkg.com/${esbuildPackageName}/-/${esbuildSubPackageName}-${version}.tgz`;
  const downloadDir = join(distFolderPath, 'downloaded');
  await downloadFile({ url: downloadUrl, downloadTo: downloadDir });
  const downloadedFilePath = join(downloadDir, `${esbuildSubPackageName}-${version}.tgz`);
  const extractedPath = await extractTgzArchive({
    sourcePath: downloadedFilePath,
    distDirPath: downloadDir
  });
  const esbuildBinFileLocations = ESBUILD_BINARY_FILE_LOCATIONS[platform];
  const binaryDist = join(distFolderPath, BINARY_FOLDER_NAMES[platform]);
  const esbuildExecutableSourcePath = join(extractedPath, ...esbuildBinFileLocations);
  const esbuildExecutableDistPath = join(
    binaryDist,
    'esbuild',
    esbuildBinFileLocations[esbuildBinFileLocations.length - 1].replace('esbuild', 'exec')
  );
  if (!isWindowsPlatform(platform)) {
    await chmod(esbuildExecutableSourcePath, '755');
  }
  await copy(esbuildExecutableSourcePath, esbuildExecutableDistPath);
  if (!isWindowsPlatform(platform)) {
    await chmod(esbuildExecutableDistPath, '755');
  }
  await Promise.all([remove(extractedPath), remove(downloadedFilePath)]);
};

export const generateAutocompletionsScripts = async ({
  distFolderPath
  // platform
}: {
  distFolderPath?: string;
  // platform: SupportedPlatform;
}) => {
  const completionScriptPath = await readdir(COMPLETIONS_SCRIPTS_PATH);
  await ensureDir(join(distFolderPath, 'completions'));

  await Promise.all(
    completionScriptPath.map(async (entry) => {
      const scriptContent = await readFile(join(COMPLETIONS_SCRIPTS_PATH, entry), {
        encoding: 'utf8'
      });

      switch (entry) {
        case 'zsh.sh':
          await createZshCompletionScript({
            scriptTemplate: scriptContent,
            path: join(distFolderPath, 'completions', entry)
          });
          break;
        case 'bash.sh':
          await createBashCompletionScript({
            scriptTemplate: scriptContent,
            path: join(distFolderPath, 'completions', entry)
          });
          break;
        case 'powershell.ps1':
          await createPowershellCompletionScript({
            scriptTemplate: scriptContent,
            path: join(distFolderPath, 'completions', entry)
          });
          break;
        default:
          logInfo(`Skipping '${entry}' - unknown completion script`);
          return;
      }
      logSuccess(`Completion script '${entry}' prepared successfully.`);
    })
  );
};

export const copyConfigSchema = async ({ distFolderPath }: { distFolderPath?: string }) => {
  logInfo('Copying config schema...');
  await copy(CONFIG_SCHEMA_PATH, join(distFolderPath, basename(CONFIG_SCHEMA_PATH)));
  logSuccess('Config schema copied successfully.');
};

export const copyBridgeFiles = async ({ distFolderPath }: { distFolderPath?: string }) => {
  logInfo('Copying bridge files...');
  await copy(BRIDGE_FILES_SOURCE_PATH, join(distFolderPath, BRIDGE_FILES_FOLDER_NAME));
  logSuccess('Bridge files copied successfully.');
};

export const copyHelperLambdas = async ({ distFolderPath }: { distFolderPath?: string }) => {
  logInfo('Copying helper lambdas...');
  const sourcePath = join(DIST_FOLDER_PATH, 'helper-lambdas');
  const destPath = join(distFolderPath, 'helper-lambdas');
  await copy(sourcePath, destPath);
  logSuccess('Helper lambdas copied successfully.');
};

// Every platform's release build waits for this step. Quality 9 compresses the corpus in about 0.3 s; the maximum,
// quality 11, saves another 72 KB but takes about 9.5 s.
const MCP_DOCS_BROTLI_QUALITY = 9;

export const copyMcpDocs = async ({ distFolderPath }: { distFolderPath?: string }) => {
  logInfo('Compressing MCP documentation corpus...');
  // MCP builds its in-memory search index from this corpus. The generated lexical index, rendered pages and
  // single-file exports are publication artifacts for other consumers and only duplicate the same content here.
  // Brotli shrinks the installed corpus from about 9.9 MB to 0.9 MB; MCP decodes it in memory.
  const corpus = await readFile(join(LLM_DOCS_FOLDER_PATH, 'chunks', 'chunks.jsonl'));
  const compressed = brotliCompressSync(corpus, {
    params: {
      [constants.BROTLI_PARAM_QUALITY]: MCP_DOCS_BROTLI_QUALITY,
      [constants.BROTLI_PARAM_SIZE_HINT]: corpus.length
    }
  });
  await outputFile(join(distFolderPath, 'llm-docs', 'chunks', 'chunks.jsonl.br'), compressed);
  logSuccess('MCP documentation corpus compressed successfully.');
};

/**
 * The `init` wizard's built interface, placed where the CLI looks for it.
 *
 * `findWizardBundle` checks beside the binary first, so this directory name is a contract with it.
 * Without this the wizard is missing from every installed CLI while working perfectly in a
 * development checkout — the kind of difference that only shows up after a release.
 */
export const copyInitWizardBundle = async ({ distFolderPath }: { distFolderPath?: string }) => {
  logInfo('Copying init wizard interface...');
  const sourcePath = INIT_WIZARD_BUNDLE_SOURCE_PATH;
  if (!(await pathExists(join(sourcePath, 'index.html')))) {
    throw createCliPackagingError({
      type: 'PACKAGING',
      message: 'The init wizard interface has not been built.',
      hint: 'Run `turbo run build --filter=@stacktape/init-ui` before building a release.'
    });
  }
  await copy(sourcePath, join(distFolderPath, 'init-ui'));
  logSuccess('Init wizard interface copied successfully.');
};

export const createReleaseDataFile = async ({
  distFolderPath,
  version
}: {
  distFolderPath?: string;
  version?: string;
}) => {
  logInfo('Creating release data file...');
  await writeJson(join(distFolderPath, 'release-data.json'), { version: version || 'dev' });
  logSuccess('Release data file created successfully.');
};

export const getPlatformsToBuildFor = ({
  presetPlatforms
}: {
  presetPlatforms?: (SupportedPlatform | 'current-arch' | 'all' | 'current')[];
}): SupportedPlatform[] => {
  const platforms = presetPlatforms;
  if (platforms[0] === 'current-arch') {
    const currentCpuArchitecture = arch();
    if (currentCpuArchitecture === 'x64') {
      return ALL_SUPPORTED_PLATFORMS.filter((platform) => !platform.includes('arm'));
    }
    return ALL_SUPPORTED_PLATFORMS.filter((platform) => platform.includes('arm'));
  }
  if (platforms[0] === 'all') {
    return ALL_SUPPORTED_PLATFORMS;
  }
  if (platforms[0] === 'current') {
    return [getPlatform()];
  }
  return Array.isArray(platforms) ? (platforms as SupportedPlatform[]) : [platforms as SupportedPlatform];
};

export const archiveCliBinaries = async ({
  distFolderPath,
  platforms
}: {
  distFolderPath: string;
  platforms: SupportedPlatform[];
}) => {
  logInfo(`Archiving binaries for ${platforms.length} platform(s)...`);

  for (const platform of platforms) {
    const binFolderName = BINARY_FOLDER_NAMES[platform];
    const platformDistFolderPath = join(distFolderPath, binFolderName);

    if (await pathExists(platformDistFolderPath)) {
      await archiveItem({
        absoluteSourcePath: platformDistFolderPath,
        format: isWindowsPlatform(platform) ? 'zip' : 'tgz',
        executablePatterns: EXECUTABLE_FILE_PATTERNS
      });
      logSuccess(`Archived binary for platform: ${platform}`);
    } else {
      logInfo(`Platform directory not found, skipping: ${platform}`);
    }
  }

  logSuccess('All binaries archived successfully');
};
