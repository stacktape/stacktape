/**
 * Attributes the released CLI's JavaScript to the modules and packages it comes from.
 *
 *   pnpm --filter @stacktape/cli run analyze:bundle [-- --platform linux] [--verify-compile] [--out <dir>]
 *     [--keep-output] [--top 25]
 *
 * The script bundles the release entrypoint with the release bundler settings (`getReleaseBundleOptions`), but emits
 * files instead of an executable. That makes two different quantities visible, and the report keeps them apart:
 *
 * - JavaScript bytes attributed to each input module by Bun's metafile. This is the graph the executable embeds.
 * - Files the bundle carries as assets: native libraries, grammars, a worker script, the CloudFormation spec database.
 *   Their sizes are the emitted files' sizes.
 *
 * Neither is a prediction of the compiled executable's size, which also contains the Bun runtime and, when enabled,
 * bytecode. `--verify-compile` builds the real executable for the host platform, reports its exact size and SHA-256,
 * and checks that it embeds the same module graph. The analysis never downloads: a platform whose OpenTUI native package
 * is not installed is refused rather than fetched. The compile for `--verify-compile` uses the running Bun when it is the
 * same build as the host's release target; for any other build of that target, such as a baseline CPU build, Bun
 * fetches or reuses a cached runtime.
 *
 * `--out` must be a new or empty directory: the script owns what it creates there (`bundle/`, `compiled/` and the
 * reports) and refuses any existing content. `--keep-output` keeps the emitted bundle and executable. The Stacktape
 * source is recorded before the first build and compared after the last; if it changed or could not be read, the report
 * says so and the command fails.
 */
import type { SupportedPlatform } from '@utils/platform';
import type { SourceCheck } from './perf/measurement-context';
import { createHash } from 'node:crypto';
import { existsSync, realpathSync } from 'node:fs';
import { readFile, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { getPlatform } from '@utils/bin-executable';
import yargsParser from 'yargs-parser';
import {
  claimOutputDirectory,
  createSourceTracker,
  describeSourceIdentity,
  getHostEnvironment
} from './perf/measurement-context';
import {
  ALL_SUPPORTED_PLATFORMS,
  BUN_COMPILE_TARGETS,
  getReleaseBundleOptions,
  OPENTUI_PLATFORM_IDENTIFIERS
} from './release/build-cli-sources';

type MetafileImport = { path: string; kind: string; external?: boolean };
type Metafile = {
  inputs: Record<string, { bytes: number; imports: MetafileImport[] }>;
  outputs: Record<string, { bytes: number; inputs: Record<string, { bytesInOutput: number }>; entryPoint?: string }>;
};

export type ModuleAttribution = {
  /** Repository-relative path of the input module. */
  path: string;
  group: string;
  /** Bytes this module contributes to the emitted JavaScript. */
  bytes: number;
  /** The load boundary that first brings this module in: the entrypoint or a dynamic `import()` target. */
  loadedBy: string;
};

/**
 * One way code gets loaded: the entrypoint itself, or the target of a dynamic `import()`. Boundaries nest: a command
 * module imported by the dispatcher, which the entrypoint imports dynamically, is at depth 2 and reports only what it
 * adds beyond the entrypoint and the dispatcher. `require()` counts as static, so a boundary's figure is an upper
 * bound for what loading it evaluates.
 */
export type LoadBoundary = {
  target: string;
  /** The module whose `import()` reaches this boundary first; null for the entrypoint. */
  importedBy: string | null;
  /** Dynamic imports between the entrypoint and this boundary. */
  depth: number;
  addedModules: number;
  addedBytes: number;
};

/** One step of an import chain: the module reached, and whether a dynamic `import()` reached it. */
export type ImportHop = { path: string; dynamic: boolean };

/** Everything the release bundle is built from: the CLI with its generated sources, the workspace packages, the lockfile. */
const SOURCE_SCOPES = ['apps/cli', 'packages', 'pnpm-lock.yaml'];

const SOURCE_CHECK_SENTENCES: Record<SourceCheck, string> = {
  unchanged: 'The source was identical after the builds.',
  changed: '**The source changed during the builds, so this attribution is not tied to one source tree.**',
  unavailable:
    '**The source could not be read before or after the builds, so this attribution is not tied to one source tree.**'
};

/** What the compile target decides at build time; `bun build --compile --target` defines the same values. */
const RUNTIME_TARGETS: { [platform in SupportedPlatform]: { platform: NodeJS.Platform; arch: string } } = {
  win: { platform: 'win32', arch: 'x64' },
  linux: { platform: 'linux', arch: 'x64' },
  alpine: { platform: 'linux', arch: 'x64' },
  'linux-arm': { platform: 'linux', arch: 'arm64' },
  macos: { platform: 'darwin', arch: 'x64' },
  'macos-arm': { platform: 'darwin', arch: 'arm64' }
};

const DYNAMIC_IMPORT = 'dynamic-import';

/** A readable owner for a module: the npm package, the workspace package, or the CLI source area. */
export const getModuleGroup = (repoRelativePath: string): string => {
  const segments = repoRelativePath.split('/');
  const lastNodeModules = segments.lastIndexOf('node_modules');
  if (lastNodeModules !== -1) {
    const name = segments[lastNodeModules + 1];
    return `npm:${name?.startsWith('@') ? `${name}/${segments[lastNodeModules + 2]}` : name}`;
  }
  const directories = segments.slice(0, -1);
  if (directories[0] === 'packages') return directories.slice(0, 2).join('/');
  if (directories[0] === 'apps' && directories[2] === 'src') return directories.slice(0, 5).join('/');
  return directories.slice(0, 3).join('/') || repoRelativePath;
};

/** Everything `root` loads without a dynamic import, each with the module that first imports it (breadth-first). */
const getStaticClosure = (metafile: Metafile, root: string): Map<string, string | null> => {
  const importerOf = new Map<string, string | null>([[root, null]]);
  const queue = [root];
  for (let index = 0; index < queue.length; index++) {
    for (const edge of metafile.inputs[queue[index]!]?.imports ?? []) {
      if (edge.kind === DYNAMIC_IMPORT || edge.external || !metafile.inputs[edge.path] || importerOf.has(edge.path)) {
        continue;
      }
      importerOf.set(edge.path, queue[index]!);
      queue.push(edge.path);
    }
  }
  return importerOf;
};

const pathWithin = (importerOf: Map<string, string | null>, module: string): string[] => {
  const path = [module];
  for (let importer = importerOf.get(module); importer; importer = importerOf.get(importer)) path.unshift(importer);
  return path;
};

export const attributeBundle = ({
  metafile,
  toRepoPath
}: {
  metafile: Metafile;
  /** Converts a metafile path, which Bun records relative to the working directory, to a repository path. */
  toRepoPath: (metafilePath: string) => string;
}) => {
  const entry = Object.values(metafile.outputs).find((output) => output.entryPoint)?.entryPoint;
  if (!entry || !metafile.inputs[entry]) {
    throw new Error('The metafile names no entrypoint input.');
  }
  const bytesByInput = new Map<string, number>();
  for (const output of Object.values(metafile.outputs)) {
    for (const [input, { bytesInOutput }] of Object.entries(output.inputs)) {
      bytesByInput.set(input, (bytesByInput.get(input) ?? 0) + bytesInOutput);
    }
  }

  // Breadth-first over boundaries, so each dynamic import target is attributed to its shallowest loading context.
  const boundaries: LoadBoundary[] = [];
  const loadedBy = new Map<string, string>();
  /** How each module is reached: the chain of its boundary, then the static imports inside that boundary. */
  const chains = new Map<string, ImportHop[]>();
  const discovered = new Set([entry]);
  const pending: {
    target: string;
    importedBy: string | null;
    depth: number;
    loadedBefore: Set<string>;
    chain: ImportHop[];
  }[] = [
    { target: entry, importedBy: null, depth: 0, loadedBefore: new Set(), chain: [{ path: entry, dynamic: false }] }
  ];
  for (let index = 0; index < pending.length; index++) {
    const { target, importedBy, depth, loadedBefore, chain } = pending[index]!;
    const importerOf = getStaticClosure(metafile, target);
    const chainTo = (module: string): ImportHop[] => [
      ...chain,
      ...pathWithin(importerOf, module)
        .slice(1)
        .map((path) => ({ path, dynamic: false }))
    ];
    const added = [...importerOf.keys()].filter((module) => !loadedBefore.has(module));
    for (const module of added) {
      if (loadedBy.has(module)) continue;
      loadedBy.set(module, toRepoPath(target));
      chains.set(module, chainTo(module));
    }
    boundaries.push({
      target: toRepoPath(target),
      importedBy: importedBy === null ? null : toRepoPath(importedBy),
      depth,
      addedModules: added.length,
      addedBytes: added.reduce((total, module) => total + (bytesByInput.get(module) ?? 0), 0)
    });
    const loadedAfter = new Set([...loadedBefore, ...importerOf.keys()]);
    for (const module of importerOf.keys()) {
      for (const edge of metafile.inputs[module]?.imports ?? []) {
        if (edge.kind !== DYNAMIC_IMPORT || edge.external || !metafile.inputs[edge.path]) continue;
        if (discovered.has(edge.path)) continue;
        discovered.add(edge.path);
        pending.push({
          target: edge.path,
          importedBy: module,
          depth: depth + 1,
          loadedBefore: loadedAfter,
          chain: [...chainTo(module), { path: edge.path, dynamic: true }]
        });
      }
    }
  }

  const modules: ModuleAttribution[] = [...bytesByInput.entries()]
    .map(([input, bytes]) => {
      const path = toRepoPath(input);
      return { path, group: getModuleGroup(path), bytes, loadedBy: loadedBy.get(input) ?? 'unreachable' };
    })
    .toSorted((left, right) => right.bytes - left.bytes || (left.path < right.path ? -1 : 1));

  const groups = new Map<string, { bytes: number; modules: number }>();
  for (const module of modules) {
    const group = groups.get(module.group) ?? { bytes: 0, modules: 0 };
    group.bytes += module.bytes;
    group.modules += 1;
    groups.set(module.group, group);
  }

  const importChainOf = (repoPath: string): ImportHop[] => {
    const input = [...bytesByInput.keys()].find((candidate) => toRepoPath(candidate) === repoPath);
    return (input && chains.get(input)?.map((hop) => ({ ...hop, path: toRepoPath(hop.path) }))) ?? [];
  };

  return {
    entry: toRepoPath(entry),
    outputBytes: Object.values(metafile.outputs).reduce((total, output) => total + output.bytes, 0),
    attributedBytes: modules.reduce((total, module) => total + module.bytes, 0),
    modules,
    groups: [...groups.entries()]
      .map(([name, value]) => ({ name, ...value }))
      .toSorted((left, right) => right.bytes - left.bytes || (left.name < right.name ? -1 : 1)),
    boundaries: boundaries.toSorted((left, right) => right.addedBytes - left.addedBytes || left.depth - right.depth),
    importChainOf
  };
};

const ASSET_KINDS: [RegExp, string][] = [
  [/\.(so|dylib|dll|node)$/, 'native library'],
  [/\.wasm$/, 'WebAssembly'],
  [/\.(js|mjs|cjs)$/, 'script'],
  [/\.gz$/, 'compressed data']
];

const describeAsset = (fileName: string) => ASSET_KINDS.find(([pattern]) => pattern.test(fileName))?.[1] ?? 'other';

const hasOpenTuiPackage = (cliRoot: string, platformId: string) => {
  const scopedName = `core-${platformId}`;
  if (existsSync(join(cliRoot, 'node_modules', '@opentui', scopedName, 'package.json'))) return true;
  const coreDirectory = join(cliRoot, 'node_modules', '@opentui', 'core');
  return existsSync(coreDirectory) && existsSync(join(realpathSync(coreDirectory), '..', scopedName, 'package.json'));
};

const formatMiB = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MiB`;

const main = async () => {
  const args = yargsParser(process.argv.slice(2), {
    string: ['platform', 'out'],
    number: ['top'],
    boolean: ['verify-compile', 'keep-output']
  });
  const cliRoot = process.cwd();
  if (!existsSync(join(cliRoot, 'src', 'entrypoints', 'compiled-cli.ts'))) {
    throw new Error('Run analyze:bundle from apps/cli: pnpm --filter @stacktape/cli run analyze:bundle');
  }
  const repoRoot = resolve(cliRoot, '..', '..');
  const platform = (args.platform ?? getPlatform()) as SupportedPlatform;
  if (!ALL_SUPPORTED_PLATFORMS.includes(platform)) {
    throw new Error(`Unknown platform ${platform}. Use one of: ${ALL_SUPPORTED_PLATFORMS.join(', ')}.`);
  }
  const missingNativePackages = OPENTUI_PLATFORM_IDENTIFIERS[platform].filter((id) => !hasOpenTuiPackage(cliRoot, id));
  if (missingNativePackages.length > 0) {
    throw new Error(
      `The OpenTUI native packages for ${platform} are not installed (${missingNativePackages.join(', ')}). ` +
        'This script never downloads them; analyze the host platform, or run a release build for that platform first.'
    );
  }
  const verifyCompile = Boolean(args['verify-compile']);
  if (verifyCompile && platform !== getPlatform()) {
    throw new Error('--verify-compile builds an executable for the host platform only.');
  }
  const top = args.top ?? 25;
  const outDirectory = resolve(
    args.out ??
      join(repoRoot, '.stacktape', 'bundle-analysis', `${platform}-${new Date().toISOString().replace(/[:.]/g, '-')}`)
  );
  // Refused before anything is written or removed, so an existing directory is never touched.
  await claimOutputDirectory(outDirectory);
  const bundleDirectory = join(outDirectory, 'bundle');
  const source = createSourceTracker({ repoRoot, scopes: SOURCE_SCOPES, excludePaths: [outDirectory] });

  const options = getReleaseBundleOptions({ platform, version: 'bundle-analysis' });
  const target = RUNTIME_TARGETS[platform];
  const build = await Bun.build({
    ...options,
    target: 'bun',
    outdir: bundleDirectory,
    metafile: true,
    define: {
      ...options.define,
      'process.platform': JSON.stringify(target.platform),
      'process.arch': JSON.stringify(target.arch)
    },
    throw: false
  });
  if (!build.success) {
    throw new Error(`The release bundle failed to build:\n${build.logs.map((log) => log.message).join('\n')}`);
  }
  const metafile = build.metafile as unknown as Metafile;
  const toRepoPath = (metafilePath: string) => relative(repoRoot, resolve(cliRoot, metafilePath)).split('\\').join('/');
  const attribution = attributeBundle({ metafile, toRepoPath });

  const assets = await Promise.all(
    build.outputs
      .filter((output) => output.kind === 'asset')
      .map(async (output) => {
        const fileName = basename(output.path);
        return { file: fileName, kind: describeAsset(fileName), bytes: (await stat(output.path)).size };
      })
  );
  assets.sort((left, right) => right.bytes - left.bytes);

  let compiled: {
    executableBytes: number;
    executableSha256: string;
    sameInputs: boolean;
    attributedBytesDifference: number;
  } | null = null;
  if (verifyCompile) {
    const executablePath = join(outDirectory, 'compiled', platform === 'win' ? 'stacktape.exe' : 'stacktape');
    const compileBuild = await Bun.build({
      ...options,
      compile: {
        target: BUN_COMPILE_TARGETS[platform],
        outfile: executablePath,
        autoloadTsconfig: true,
        autoloadPackageJson: true
      },
      metafile: true,
      throw: false
    });
    if (!compileBuild.success) {
      throw new Error(
        `The release executable failed to build:\n${compileBuild.logs.map((log) => log.message).join('\n')}`
      );
    }
    const compiledAttribution = attributeBundle({ metafile: compileBuild.metafile as unknown as Metafile, toRepoPath });
    const compiledPaths = new Set(compiledAttribution.modules.map((module) => module.path));
    compiled = {
      executableBytes: (await stat(executablePath)).size,
      executableSha256: createHash('sha256')
        .update(await readFile(executablePath))
        .digest('hex'),
      sameInputs:
        compiledPaths.size === attribution.modules.length &&
        attribution.modules.every((module) => compiledPaths.has(module.path)),
      attributedBytesDifference: compiledAttribution.attributedBytes - attribution.attributedBytes
    };
    if (!args['keep-output']) await rm(dirname(executablePath), { recursive: true, force: true });
  }
  const sourceCheck = source.check();

  const assetBytes = assets.reduce((total, asset) => total + asset.bytes, 0);
  const report = {
    kind: 'stacktape-release-bundle-attribution',
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    platform,
    runtimeDefines: target,
    source: {
      before: source.before,
      after: source.after,
      check: sourceCheck,
      comparedAfter: verifyCompile ? 'the analysis build and the compiled executable' : 'the analysis build'
    },
    environment: getHostEnvironment(),
    meaning: {
      javascript: 'Bytes each input module contributes to the emitted release JavaScript (Bun metafile).',
      assets: 'Emitted asset file sizes. The executable embeds them; this is not a native-library size budget.',
      executable:
        'Not predicted. A compiled executable adds the Bun runtime and, when enabled, bytecode. Use --verify-compile or measure a real build:dist output.',
      loadBoundaries:
        'The entrypoint and each dynamic import() target, nested breadth-first. A boundary reports only what it adds beyond the boundaries loaded before it. require() counts as static, so each figure is an upper bound for what loading the boundary evaluates.'
    },
    totals: {
      javascriptOutputBytes: attribution.outputBytes,
      attributedBytes: attribution.attributedBytes,
      modules: attribution.modules.length,
      assetBytes
    },
    compiled,
    groups: attribution.groups,
    loadBoundaries: attribution.boundaries,
    assets,
    modules: attribution.modules
  };

  const display = (path: string) =>
    path.replace(/^(?:[^/]+\/)*node_modules\/\.pnpm\/[^/]+\/node_modules\//, 'npm:').replace(/^apps\/cli\//, '');
  const lines = [
    `# Release bundle attribution (${platform})`,
    '',
    `Source: ${describeSourceIdentity(source.before)}. ${SOURCE_CHECK_SENTENCES[sourceCheck]} Bun ${report.environment.bun}.`,
    'Paths are relative to `apps/cli` unless they start with `packages/` or `npm:`.',
    '',
    `- Emitted JavaScript: ${formatMiB(attribution.outputBytes)} (${attribution.modules.length} input modules).`,
    `- Assets: ${formatMiB(assetBytes)} in ${assets.length} files.`,
    compiled
      ? `- Compiled ${platform} executable: ${compiled.executableBytes} bytes (${formatMiB(compiled.executableBytes)}), SHA-256 ${compiled.executableSha256}; same module graph: ${compiled.sameInputs ? 'yes' : 'NO'}; attributed-byte difference: ${compiled.attributedBytesDifference}.`
      : '- The compiled executable size is not predicted here. Run with `--verify-compile` to build and measure it.',
    '',
    `## Load boundaries (top ${top} by added JavaScript)`,
    '',
    'The entrypoint and each `import()` target, with what it adds beyond the boundaries loaded before it.',
    '',
    '| Boundary | Depth | Imported by | Added modules | Added JavaScript |',
    '| --- | ---: | --- | ---: | ---: |',
    ...attribution.boundaries
      .slice(0, top)
      .map(
        (boundary) =>
          `| ${display(boundary.target)} | ${boundary.depth} | ${boundary.importedBy ? display(boundary.importedBy) : '—'} | ${boundary.addedModules} | ${formatMiB(boundary.addedBytes)} |`
      ),
    '',
    `## Largest owners (top ${top})`,
    '',
    '| Owner | Modules | JavaScript |',
    '| --- | ---: | ---: |',
    ...attribution.groups
      .slice(0, top)
      .map((group) => `| ${group.name} | ${group.modules} | ${formatMiB(group.bytes)} |`),
    '',
    `## Largest modules (top ${top})`,
    '',
    '| Module | JavaScript | Loaded by | Import chain from the entrypoint |',
    '| --- | ---: | --- | --- |',
    ...attribution.modules.slice(0, top).map(
      (module) =>
        `| ${display(module.path)} | ${formatMiB(module.bytes)} | ${display(module.loadedBy)} | ${attribution
          .importChainOf(module.path)
          .slice(1)
          .map((hop) => `${hop.dynamic ? '(dynamic) ' : ''}${display(hop.path)}`)
          .join(' → ')} |`
    ),
    '',
    '## Assets',
    '',
    '| File | Kind | Bytes |',
    '| --- | --- | ---: |',
    ...assets.map((asset) => `| ${asset.file} | ${asset.kind} | ${asset.bytes} |`),
    ''
  ];
  await writeFile(join(outDirectory, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(join(outDirectory, 'report.md'), lines.join('\n'));
  if (!args['keep-output']) await rm(bundleDirectory, { recursive: true, force: true });
  console.info(lines.join('\n'));
  console.info(`Report: ${join(outDirectory, 'report.md')}`);
  if (sourceCheck !== 'unchanged') {
    console.error(`Source check: ${sourceCheck}. The attribution is not tied to one source tree.`);
    process.exitCode = 1;
  }
};

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
