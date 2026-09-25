/**
 * The JavaScript image's npm, pnpm or Bun install is reused across source edits and repeated when a dependency changes,
 * and the image carries and runs exactly what the conservative layout would.
 *
 * The production ES image buildpack generates its own Dockerfile, and real Docker builds it with the default builder,
 * an owned Docker configuration and an owned local BuildKit cache. Each packaging runs in a fresh process, as each CLI
 * invocation does:
 * 1. `v1`, npm, ESM, cold (`--no-cache`), exporting that cache;
 * 2. `v2`, after an edit to the handler only: the npm install step must be CACHED, the artifact digest and the image
 *    must change, and the image must print the edited handler's output;
 * 3. `v3`, after a change to the dependency's version only: the npm install step must run again, installing it;
 * 4. `cjs1` and `cjs2`, CommonJS output, which has no generated manifest, before and after a handler-only edit;
 * 5. `pnpm1` to `pnpm-cjs2`, the same sequence for a pnpm project, where every step of the dependency stage (pnpm
 *    itself, the lifecycle policy, `pnpm add` and the explicit lifecycle scripts) must be reused by handler-only edits;
 * 6. `pnpm-nested`, whose bundle brings in a nested manifest with `includeFiles`: pnpm reads it, so the image must keep
 *    the conservative layout;
 * 7. `bun1` to `bun-cjs2`, the same sequence as npm's for a Bun project, where every step of the dependency stage (Bun
 *    itself, the lifecycle policy that replaces the manifest, and `bun add`) must be reused by handler-only edits.
 * 8. `py1` to `py-nested`, a Python artifact (container target) with a pinned root `requirements.txt`, built by the
 *    production `buildPythonArtifact`: a handler-only edit must reuse uv, the system packages, the minifier and the
 *    requirements install; a requirements edit must install again; nested requirements keep the conservative layout.
 *    Each exported artifact tree (kind, mode, symlink target, bytes) and its handler's output must equal the
 *    conservative layout's.
 * 9. `dc1` to `dc3`, an image built from a custom Dockerfile by the production `buildUsingCustomDockerfile`. The
 *    Dockerfile lies outside the build context, and its own ignore file must win over the context's `.dockerignore`,
 *    with a negation. The context holds a link and an 8 MiB file. The image must hold exactly the selected context,
 *    an edit to ignored files only must keep the digest and hit the cache, and a content edit must change the digest,
 *    rebuild, and print the edit.
 * 10. `pc-a` to `pc-b-edit`, the same Python project under two checkout roots (`--only python-checkouts` runs just
 *    this section): the second checkout must get the first's digest, artifact tree and output, and hit the cache when
 *    offered the first's digest; a handler edit must change the digest, rebuild and print the edit.
 * 11. `m1` to `m4`, an ES image whose handler runs an included `scripts/run.sh` (`--only es-image-mode`): at 0644 the
 *    script cannot run; an unchanged repeat hits the cache; `chmod 755` must change the digest and rebuild, so the
 *    deployed image runs it; a handler edit must still change the digest and the output.
 *
 * Each bundle is also built in the generator's conservative layout, which installs beside the whole bundle: every
 * optimized image must hold exactly its entries under `/app` (kind, mode, owner, link target, contents), the runtime
 * `package.json` the package manager wrote included, and print exactly what the conservative image prints, on stdout
 * and stderr. pnpm stamps its install time into two state files, which differ between any two installs; they are
 * compared with only those two values replaced.
 *
 * Each image runs without network. The Dockerfile's glibc base images are served, through named build contexts, by
 * images of this run: the local official node images plus one file naming the run. Nothing is pulled, and the
 * daemon's image events are checked for pulls. BuildKit matches cached steps by the content of their inputs, so the
 * run's own file makes every cache key this run's: no earlier build on the shared daemon can satisfy a step. The build
 * itself downloads the pinned `ms` package from npm and the runtime stage's Debian packages. Owned images, containers
 * and the owned cache are removed and their removal verified; the report keeps the cache's size.
 *
 *   bun run scripts/synthetic-es-image-deps-e2e.ts [--out <new or empty directory>]
 */
import { createHash, randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { chmod, mkdir, mkdtemp, readdir, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { lstat, readlink } from 'node:fs/promises';
import { runDockerArtifactBuild } from '../src/artifact/docker-artifact-build';
import { buildUsingStacktapeEsImageBuildpack } from '../src/buildpacks/stacktape-es-image-buildpack';
import { buildPythonArtifact } from '../src/bundlers/py/index';
import { buildEsDockerfile, buildPythonArtifactDockerfile } from '../src/docker/dockerfiles';
import { buildUsingCustomDockerfile } from '../src/image/custom-dockerfile';
import type { BuildDockerImage, RunDocker } from '../src/runtime-contracts';
import { createPackagingError, progressLogger, run, runDocker, write } from './e2e-helpers';

const PACKAGE_ROOT = resolve(import.meta.dir, '..');
const NODE_VERSION = 24;
const PYTHON_VERSION = 3.12;
/**
 * The images the generated Dockerfiles name, and the local official images this run derives its bases from. The
 * Python artifact's full image is served by the local slim one, which installs `build-essential` through apt instead.
 */
const OFFICIAL_BASE_IMAGES = {
  [`public.ecr.aws/docker/library/node:${NODE_VERSION}-bookworm`]: `node:${NODE_VERSION}-bookworm`,
  [`public.ecr.aws/docker/library/node:${NODE_VERSION}-bookworm-slim`]: `node:${NODE_VERSION}-bookworm-slim`,
  [`public.ecr.aws/docker/library/python:${PYTHON_VERSION}`]: `python:${PYTHON_VERSION}-slim`
};

const argument = (name: string) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
};
const packageLabel = argument('--package');
/** `--only <section>` runs one section (`python-checkouts` or `es-image-mode`), with the same owned setup and cleanup. */
const only = argument('--only');
if (only !== undefined && only !== 'python-checkouts' && only !== 'es-image-mode') {
  throw new Error(`Unknown --only ${only}.`);
}
const out = resolve(argument('--out') ?? (await mkdtemp(join(tmpdir(), 'stacktape-es-image-deps-'))));
const runId = argument('--run-id') ?? randomBytes(4).toString('hex');
const imagePrefix = `stacktape-es-image-deps-${runId}`;
const containerLabel = `stacktape.test=es-image-deps-${runId}`;
/** The run's own base image for each name the Dockerfile uses. */
const baseImageOf = (official: string) => `${imagePrefix}-base:${official.split(':')[1]}`;
const dockerConfig = join(out, 'docker-config');
const cache = join(out, 'buildkit-cache');
type PackageManager = 'npm' | 'pnpm' | 'bun';
/** Each package manager's fixture has its own directory: detection prefers npm's lockfile, then pnpm's, over Bun's. */
const projectOf = (packageManager: PackageManager) =>
  join(out, packageManager === 'npm' ? 'project' : `project-${packageManager}`);
/** What a packaging label names: its package manager, output format and the files it brings into the bundle. */
const fixtureOf = (label: string) => ({
  packageManager: (label.startsWith('pnpm') ? 'pnpm' : label.startsWith('bun') ? 'bun' : 'npm') as PackageManager,
  outputModuleFormat: (label.includes('cjs') ? 'cjs' : 'esm') as 'cjs' | 'esm',
  includeFiles: label === 'pnpm-nested' ? ['assets/**'] : []
});
const dockerEnv = { ...Bun.env, DOCKER_CONFIG: dockerConfig };
const docker = (args: string[]) => run('docker', args, undefined, dockerEnv);

const sha256 = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');

/** SHA-256 over the fixture's inputs: every file's relative path and bytes, in code-unit order. */
const hashTree = async (root: string) => {
  const files = (await readdir(root, { recursive: true, withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => relative(root, join(entry.parentPath, entry.name)))
    .toSorted((left, right) => (left < right ? -1 : left > right ? 1 : 0));
  const contents = await Promise.all(files.map((file) => readFile(join(root, file))));
  const hash = createHash('sha256');
  files.forEach((file, index) => hash.update(`${file}\0`).update(contents[index]!).update('\0'));
  return hash.digest('hex');
};

/**
 * A project whose handler imports `ms`, kept out of the bundle so the image installs it with the project's package
 * manager. `nestedManifest` adds a manifest below the project for `includeFiles` to bring into the bundle.
 */
const writeProject = async ({
  marker,
  msVersion,
  packageManager = 'npm',
  nestedManifest = false,
  project = projectOf(packageManager)
}: {
  marker: string;
  msVersion: string;
  packageManager?: PackageManager;
  nestedManifest?: boolean;
  project?: string;
}) => {
  await write(
    join(project, 'package.json'),
    // `workspaces` makes this directory its own project root, so the lockfile below decides the package manager.
    `${JSON.stringify({ name: 'es-image-deps-fixture', version: '1.0.0', private: true, workspaces: [], dependencies: { ms: msVersion } }, null, 2)}\n`
  );
  if (packageManager === 'npm') {
    await write(
      join(project, 'package-lock.json'),
      `${JSON.stringify(
        {
          name: 'es-image-deps-fixture',
          version: '1.0.0',
          lockfileVersion: 3,
          requires: true,
          packages: {
            '': { name: 'es-image-deps-fixture', version: '1.0.0', dependencies: { ms: msVersion } },
            'node_modules/ms': { version: msVersion, resolved: `https://registry.npmjs.org/ms/-/ms-${msVersion}.tgz` }
          }
        },
        null,
        2
      )}\n`
    );
  } else if (packageManager === 'bun') {
    await write(
      join(project, 'bun.lock'),
      `${JSON.stringify(
        {
          lockfileVersion: 1,
          workspaces: { '': { name: 'es-image-deps-fixture', dependencies: { ms: msVersion } } },
          packages: { ms: [`ms@${msVersion}`, '', {}, ''] }
        },
        null,
        2
      )}\n`
    );
  } else {
    await write(
      join(project, 'pnpm-lock.yaml'),
      [
        "lockfileVersion: '9.0'",
        '',
        'importers:',
        '',
        '  .:',
        '    dependencies:',
        '      ms:',
        `        specifier: ${msVersion}`,
        `        version: ${msVersion}`,
        '',
        'packages:',
        '',
        `  ms@${msVersion}:`,
        `    resolution: {tarball: https://registry.npmjs.org/ms/-/ms-${msVersion}.tgz}`,
        '',
        'snapshots:',
        '',
        `  ms@${msVersion}: {}`,
        ''
      ].join('\n')
    );
  }
  if (nestedManifest) {
    await write(
      join(project, 'assets', 'package.json'),
      `${JSON.stringify({ name: 'es-image-deps-assets', version: '1.0.0', private: true }, null, 2)}\n`
    );
  }
  // What the bundler reads to learn the version; the image installs the real package.
  await write(
    join(project, 'node_modules', 'ms', 'package.json'),
    `${JSON.stringify({ name: 'ms', version: msVersion, main: 'index.js' })}\n`
  );
  await write(join(project, 'node_modules', 'ms', 'index.js'), 'module.exports = () => 0;\n');
  await write(
    join(project, 'src', 'index.ts'),
    `import ms from 'ms';\n\nconsole.log(\`es-image-deps ${marker} ms=\${ms('2 days')}\`);\n`
  );
};

type Step = { instruction: string; decision: 'CACHED' | 'DONE' | 'ERROR' | 'unknown'; seconds: number | null };
/** The Python requirements install, in the conservative script or the dependency stage. */
const PYTHON_INSTALL_STEP = /uv pip install --system --target/;
const PYTHON_DEPENDENCY_STEP = /pip install uv|apt-get|python-minifier|uv pip install --system --target/;
/** What the fixture's handler prints for a marker and an installed `idna` version. */
const pythonOutput = (marker: string, idna: string) => `python-requirements ${marker} idna=${idna} xn--mnich-kva`;
/** The step that installs the external dependencies: `npm install --save …`, `pnpm add …` or `bun add …`. */
const INSTALL_STEP = / RUN (?:npm install --save|pnpm add|bun add) /;

/** Each Dockerfile step of a plain BuildKit log with its cache decision. */
const parseSteps = (log: string): Step[] => {
  const steps = new Map<string, Step>();
  for (const line of log.split('\n')) {
    const started = /^#(\d+) \[([^\]]+)\] (.+)$/.exec(line);
    if (started && !started[2]!.startsWith('internal')) {
      steps.set(started[1]!, { instruction: `[${started[2]}] ${started[3]}`, decision: 'unknown', seconds: null });
      continue;
    }
    // BuildKit prints a negative duration when the step's clock ran behind, as it can under WSL.
    const finished = /^#(\d+) (CACHED|DONE (-?[\d.]+)s|ERROR)/.exec(line);
    const step = finished ? steps.get(finished[1]!) : undefined;
    if (step && finished) {
      step.decision = finished[2] === 'CACHED' ? 'CACHED' : finished[2] === 'ERROR' ? 'ERROR' : 'DONE';
      step.seconds = finished[3] ? Number(finished[3]) : null;
    }
  }
  return [...steps.values()];
};

type Build = {
  dockerfile: string;
  dockerfileSha256: string;
  command: string[];
  steps: Step[];
  wallMs: number;
  imageId: string;
};
/**
 * What an image holds under `/app`: its runtime manifest, every entry's kind, mode, owner, link target and SHA-256, and
 * the raw contents of pnpm's two install-state files (`null` when absent).
 */
type AppPayload = { manifest: string; tree: string; installState: Record<string, string | null> };
/** What an image prints when it runs its handler without network. */
type RunOutput = { stdout: string; stderr: string };
type Packaged = {
  label: string;
  imageTag: string;
  digest: string;
  runOutput: string;
  runStderr: string;
  installedMs: string;
  fixture: string;
  build: Build;
  app: AppPayload;
  conservative: { dockerfileSha256: string; installStep: Step | null; app: AppPayload; run: RunOutput };
};

const getDockerImageDetails = async (imageTag: string) => {
  const inspection = JSON.parse((await docker(['image', 'inspect', imageTag, '--format', '{{json .}}'])).stdout);
  return {
    size: Math.round((inspection.Size / 1024 / 1024) * 100) / 100,
    id: inspection.Id as string,
    created: Date.parse(inspection.Created)
  };
};

/** `docker buildx build` on the default builder, with plain progress and the run's own base images. */
const buildCommand = ({
  tag,
  dockerfile,
  context,
  cacheFlags
}: {
  tag: string;
  dockerfile: string;
  context: string;
  cacheFlags: string[];
}) => [
  'buildx',
  'build',
  '--builder',
  'default',
  '--progress=plain',
  '--platform',
  'linux/amd64',
  ...Object.entries(OFFICIAL_BASE_IMAGES).flatMap(([name, official]) => [
    '--build-context',
    `${name}=docker-image://${baseImageOf(official)}`
  ]),
  ...cacheFlags,
  '-t',
  tag,
  '--file',
  dockerfile,
  context
];

const runInImage = async (args: string[]) =>
  (await docker(['run', '--rm', '--network', 'none', '--label', containerLabel, ...args])).stdout.trim();
const runHandler = async (imageTag: string): Promise<RunOutput> => {
  const { stdout, stderr } = await docker(['run', '--rm', '--network', 'none', '--label', containerLabel, imageTag]);
  return { stdout: stdout.trim(), stderr: stderr.trim() };
};

/** pnpm writes its install time into these files, as `"prunedAt"` and `"lastValidatedTimestamp"` respectively. */
const PNPM_STAMPED_FILES = ['node_modules/.modules.yaml', 'node_modules/.pnpm-workspace-state-v1.json'];
const PNPM_INSTALL_TIME = /("prunedAt": )"[^"]*"|("lastValidatedTimestamp": )\d+/g;

const appPayloadOf = async (imageTag: string): Promise<AppPayload> => ({
  manifest: await runInImage(['--entrypoint', 'cat', imageTag, '/app/package.json']),
  tree: await runInImage([
    '--entrypoint',
    'sh',
    imageTag,
    '-c',
    "cd /app && find . \\( -type l -printf '%y %m %U:%G %p -> %l\\n' \\) -o -printf '%y %m %U:%G %p\\n' | sort && find . -type f -exec sha256sum {} + | sort -k 2"
  ]),
  installState: JSON.parse(
    await runInImage([
      '--entrypoint',
      'node',
      imageTag,
      '-e',
      `const fs = require('fs'); console.log(JSON.stringify(Object.fromEntries(${JSON.stringify(PNPM_STAMPED_FILES)}.map((file) => [file, fs.existsSync('/app/' + file) ? fs.readFileSync('/app/' + file, 'utf8') : null]))));`
    ])
  )
});

const withoutStampedHashes = (tree: string) =>
  tree
    .split('\n')
    .filter((line) => !PNPM_STAMPED_FILES.some((file) => line.endsWith(`  ./${file}`)))
    .join('\n');
const withoutInstallTime = (state: string | null | undefined) =>
  state?.replace(PNPM_INSTALL_TIME, (_, prunedAt, validatedAt) => `${prunedAt ?? validatedAt}<install time>`) ?? null;
/**
 * Whether two images hold the same `/app`. Every entry and byte must be equal, except pnpm's two install-time values,
 * which differ between any two installs; the stamped files are compared with only those values replaced.
 */
const sameApp = (left: AppPayload, right: AppPayload) =>
  left.manifest === right.manifest &&
  withoutStampedHashes(left.tree) === withoutStampedHashes(right.tree) &&
  PNPM_STAMPED_FILES.every(
    (file) => withoutInstallTime(left.installState[file]) === withoutInstallTime(right.installState[file])
  );
/** Node prefixes a warning with its process ID, which differs between any two container runs. */
const withoutPid = (stderr: string) => stderr.replaceAll(/^\(node:\d+\)/gm, '(node:<pid>)');
/** Whether a pnpm image holds the lifecycle policy and the lockfile pnpm wrote. */
const hasPolicyAndLockfile = ({ tree }: AppPayload) =>
  /^f \d+ \S+ \.\/pnpm-workspace\.yaml$/m.test(tree) && /^f \d+ \S+ \.\/pnpm-lock\.yaml$/m.test(tree);
/** Whether a Bun image's manifest is the lifecycle policy (`trustedDependencies`) and it holds the lockfile Bun wrote. */
const hasBunPolicyAndLockfile = ({ manifest, tree }: AppPayload) =>
  (JSON.parse(manifest).trustedDependencies ?? []).includes('ms') && /^f \d+ \S+ \.\/bun\.lockb?$/m.test(tree);
/** The install-time values of an image's pnpm state files, for the report. */
const installTimesOf = ({ installState }: AppPayload) =>
  Object.values(installState).flatMap((state) => state?.match(PNPM_INSTALL_TIME) ?? []);

/** The production ES image buildpack on `project`, built by this harness's `docker buildx build` with the owned cache. */
const buildEsImage = async ({
  label,
  imageTag,
  project,
  outputModuleFormat,
  includeFiles,
  distFolderPath,
  existingDigests
}: {
  label: string;
  imageTag: string;
  project: string;
  outputModuleFormat: 'cjs' | 'esm';
  includeFiles: string[];
  distFolderPath: string;
  existingDigests: string[];
}) => {
  let build: Build | undefined;
  // The Dockerfile is the buildpack's own; the flags add the owned cache, plain progress and the local base images.
  const buildDockerImage: BuildDockerImage = async ({ buildContextPath, dockerfilePath }) => {
    const dockerfilePathOnDisk = resolve(buildContextPath, dockerfilePath!);
    const cold = !existsSync(join(cache, 'index.json'));
    const command = buildCommand({
      tag: imageTag,
      dockerfile: dockerfilePathOnDisk,
      context: buildContextPath,
      cacheFlags: [
        ...(cold ? ['--no-cache'] : ['--cache-from', `type=local,src=${cache}`]),
        '--cache-to',
        `type=local,dest=${cache},mode=max`
      ]
    });
    const dockerfile = await readFile(dockerfilePathOnDisk, 'utf8');
    const started = performance.now();
    const result = await docker(command);
    const wallMs = Math.round(performance.now() - started);
    await writeFile(join(out, `${label}.build.log`), result.stderr);
    const details = await getDockerImageDetails(imageTag);
    build = {
      dockerfile,
      dockerfileSha256: sha256(dockerfile),
      command: ['docker', ...command],
      steps: parseSteps(result.stderr),
      wallMs,
      imageId: details.id
    };
    return { ...details, dockerOutput: result.stderr, duration: wallMs };
  };
  const output = await buildUsingStacktapeEsImageBuildpack({
    existingDigests,
    invocationId: runId,
    progressLogger,
    createPackagingError,
    runDocker,
    cwd: project,
    name: imageTag,
    entryfilePath: join(project, 'src', 'index.ts'),
    includeFiles,
    distFolderPath,
    languageSpecificConfig: {
      nodeVersion: NODE_VERSION,
      outputModuleFormat,
      dependenciesToExcludeFromBundle: ['ms']
    },
    buildDockerImage,
    checkDockerImageExists: async () => false,
    getDockerImageDetails,
    installDependencies: async () => undefined,
    nativeDependencyInstallationRootPath: join(out, 'native-install'),
    minify: true,
    nodeTarget: String(NODE_VERSION),
    requiresGlibcBinaries: true,
    dockerBuildOutputArchitecture: 'linux/amd64'
  });
  return { output, build };
};

/** One packaging, as one CLI invocation runs it: the production buildpack, with this harness's `docker buildx build`. */
const packageImage = async (label: string): Promise<Packaged> => {
  const imageTag = `${imagePrefix}:${label}`;
  const { packageManager, outputModuleFormat, includeFiles } = fixtureOf(label);
  const project = projectOf(packageManager);
  const { output, build } = await buildEsImage({
    label,
    imageTag,
    project,
    outputModuleFormat,
    includeFiles,
    distFolderPath: join(out, 'dist', label),
    existingDigests: []
  });
  // The same bundle in the generator's conservative layout, which installs beside the whole bundle.
  const dependencies = [...build!.dockerfile.matchAll(/^RUN (?:npm install --save|pnpm add|bun add) (.+)$/gm)]
    .flatMap((match) => match[1]!.split(' '))
    .map((spec) => ({ name: spec.slice(0, spec.lastIndexOf('@')), version: spec.slice(spec.lastIndexOf('@') + 1) }));
  const conservativeDockerfile = buildEsDockerfile({
    dependencies,
    packageManager,
    requiresGlibcBinaries: true,
    nodeVersion: NODE_VERSION
  });
  const conservativeDockerfilePath = join(out, `${label}.conservative.Dockerfile`);
  await writeFile(conservativeDockerfilePath, conservativeDockerfile);
  const conservativeTag = `${imagePrefix}:${label}-conservative`;
  const conservativeBuild = await docker(
    buildCommand({
      tag: conservativeTag,
      dockerfile: conservativeDockerfilePath,
      context: join(out, 'dist', label),
      cacheFlags: []
    })
  );
  await writeFile(join(out, `${label}.conservative.build.log`), conservativeBuild.stderr);
  const handlerRun = await runHandler(imageTag);
  return {
    label,
    imageTag,
    digest: output.digest,
    runOutput: handlerRun.stdout,
    runStderr: handlerRun.stderr,
    installedMs: await runInImage([
      '--entrypoint',
      'node',
      imageTag,
      '-p',
      "require('/app/node_modules/ms/package.json').version"
    ]),
    fixture: await hashTree(project),
    build: build!,
    app: await appPayloadOf(imageTag),
    conservative: {
      dockerfileSha256: sha256(conservativeDockerfile),
      installStep:
        parseSteps(conservativeBuild.stderr).find(({ instruction }) => INSTALL_STEP.test(instruction)) ?? null,
      app: await appPayloadOf(conservativeTag),
      run: await runHandler(conservativeTag)
    }
  };
};

/** Every entry of an exported artifact: kind, mode, symlink target and SHA-256, in code-unit order. */
const artifactTreeOf = async (root: string) => {
  const entries = (await readdir(root, { recursive: true, withFileTypes: true }))
    .map((entry) => relative(root, join(entry.parentPath, entry.name)))
    .toSorted((left, right) => (left < right ? -1 : left > right ? 1 : 0));
  const lines = await Promise.all(
    entries.map(async (path) => {
      const info = await lstat(join(root, path));
      const mode = (info.mode & 0o7777).toString(8);
      if (info.isSymbolicLink()) return `l ${mode} ${path} -> ${await readlink(join(root, path))}`;
      if (info.isDirectory()) return `d ${mode} ${path}`;
      return `f ${mode} ${path} ${sha256(await readFile(join(root, path)))}`;
    })
  );
  return lines.join('\n');
};

type PythonBuild = { dockerfileSha256: string; dockerfile: string; steps: Step[]; wallMs: number };
type PythonPackaged = {
  label: string;
  digest: string;
  fixture: string;
  build: PythonBuild;
  tree: string;
  run: RunOutput;
  conservative: { build: PythonBuild; tree: string; run: RunOutput };
};
const pythonProject = join(out, 'project-python');

/** A Python project whose handler imports `idna`, pinned in a root `requirements.txt` (or a nested one). */
const writePythonProject = async ({
  marker,
  idnaVersion,
  nested = false,
  project = pythonProject
}: {
  marker: string;
  idnaVersion: string;
  nested?: boolean;
  project?: string;
}) => {
  await write(join(project, 'requirements.txt'), nested ? '-r base.txt\n' : `idna==${idnaVersion}\n`);
  if (nested) await write(join(project, 'base.txt'), `idna==${idnaVersion}\n`);
  await write(
    join(project, 'src', 'handler.py'),
    `import idna\n\n\ndef handler(event, context):\n    return "python-requirements ${marker} idna=" + idna.__version__ + " " + idna.encode("m\u00fcnich").decode()\n`
  );
};

/**
 * The production artifact build, through this harness's `docker buildx build`: the default builder, plain progress, the
 * run's own base images and (for the product build) the owned cache. Records the Dockerfile and each step's decision.
 */
const pythonRunDocker =
  ({ owned, onBuild }: { owned: boolean; onBuild: (build: PythonBuild) => void }): RunDocker =>
  async (commands, options) => {
    if (commands[0] !== 'image' || commands[1] !== 'build') return runDocker(commands, options);
    const rest = commands.slice(2);
    const dockerfile = await readFile(rest[rest.indexOf('--file') + 1]!, 'utf8');
    const cold = !existsSync(join(cache, 'index.json'));
    const cacheFlags = owned
      ? [
          ...(cold ? ['--no-cache'] : ['--cache-from', `type=local,src=${cache}`]),
          '--cache-to',
          `type=local,dest=${cache},mode=max`
        ]
      : [];
    const started = performance.now();
    const result = await docker([
      'buildx',
      'build',
      '--builder',
      'default',
      '--progress=plain',
      ...Object.entries(OFFICIAL_BASE_IMAGES).flatMap(([name, official]) => [
        '--build-context',
        `${name}=docker-image://${baseImageOf(official)}`
      ]),
      ...cacheFlags,
      ...rest
    ]);
    onBuild({
      dockerfile,
      dockerfileSha256: sha256(dockerfile),
      steps: parseSteps(result.stderr),
      wallMs: Math.round(performance.now() - started)
    });
    return result;
  };

const runPythonArtifact = async (dist: string): Promise<RunOutput> => {
  const { stdout, stderr } = await docker([
    'run',
    '--rm',
    '--network',
    'none',
    '--label',
    containerLabel,
    '--mount',
    `type=bind,source=${dist},target=/artifact,readonly`,
    baseImageOf(`python:${PYTHON_VERSION}-slim`),
    'python',
    '-c',
    "import sys; sys.path.insert(0, '/artifact'); from src.handler import handler; print(handler({}, None))"
  ]);
  return { stdout: stdout.trim(), stderr: stderr.trim() };
};

/** The production Python bundler on `project`, a container artifact with the owned cache, into `dist/<label>`. */
const buildPythonProject = ({
  label,
  project,
  existingDigests,
  onBuild
}: {
  label: string;
  project: string;
  existingDigests: string[];
  onBuild: (build: PythonBuild) => void;
}) =>
  buildPythonArtifact({
    existingDigests,
    invocationId: runId,
    progressLogger,
    createPackagingError,
    runDocker: pythonRunDocker({ owned: true, onBuild }),
    cwd: project,
    name: `${imagePrefix}-${label}`,
    entryfilePath: join(project, 'src', 'handler.py'),
    rawEntryfilePath: join(project, 'src', 'handler.py'),
    sourcePath: project,
    distFolderPath: join(out, 'dist', label),
    pythonVersion: PYTHON_VERSION,
    languageSpecificConfig: { pythonVersion: PYTHON_VERSION, packageManagerFile: 'requirements.txt' },
    requiresGlibcBinaries: true,
    dockerBuildOutputArchitecture: 'linux/amd64',
    target: 'container'
  });

/** One Python artifact packaging through the production bundler, then the same source in the conservative layout. */
const packagePythonArtifact = async (label: string): Promise<PythonPackaged> => {
  const project = pythonProject;
  const dist = join(out, 'dist', label);
  let build: PythonBuild | undefined;
  const output = await buildPythonProject({
    label,
    project,
    existingDigests: [],
    onBuild: (recorded) => (build = recorded)
  });
  await writeFile(join(out, `${label}.build.log`), JSON.stringify(build!.steps, null, 2));
  // The same source in the generator's conservative layout, which installs beside the whole minified source.
  const conservativeDist = join(out, 'dist', `${label}-conservative`);
  let conservativeBuild: PythonBuild | undefined;
  await runDockerArtifactBuild({
    dockerfileContents: buildPythonArtifactDockerfile({
      pythonVersion: PYTHON_VERSION,
      minify: true,
      alpine: false,
      target: 'container'
    }),
    sourcePath: project,
    distFolderPath: conservativeDist,
    dockerBuildOutputArchitecture: 'linux/amd64',
    buildArgs: [
      '--build-arg',
      'STP_PY_DEP_FILE=requirements.txt',
      '--build-arg',
      'STP_PY_DEP_TYPE=requirements',
      ...['OPTIONAL_DEPENDENCIES', 'WITH_GROUPS', 'WITHOUT_GROUPS', 'ONLY_GROUPS'].flatMap((name) => [
        '--build-arg',
        `STP_PY_UV_${name}=`
      ])
    ],
    runDocker: pythonRunDocker({ owned: false, onBuild: (recorded) => (conservativeBuild = recorded) })
  });
  return {
    label,
    digest: output.digest,
    fixture: await hashTree(project),
    build: build!,
    tree: await artifactTreeOf(dist),
    run: await runPythonArtifact(dist),
    conservative: {
      build: conservativeBuild!,
      tree: await artifactTreeOf(conservativeDist),
      run: await runPythonArtifact(conservativeDist)
    }
  };
};

type ContextPackaged = {
  label: string;
  digest: string;
  outcome: string;
  sourceFiles: string[];
  run: RunOutput | null;
};
const contextProject = join(out, 'project-dockerfile');
const buildContext = join(contextProject, 'context');
/** Relative to the build context, as a user writes it: the Dockerfile lies outside the context. */
const CONTEXT_DOCKERFILE = '../docker/app.Dockerfile';
/** 8 MiB of deterministic bytes, so the context has one large file whose hash the image reports. */
const contextBlob = (() => {
  const blocks: Buffer[] = [];
  let block = createHash('sha256').update('stacktape-docker-context').digest();
  for (let index = 0; index < (8 * 1024 * 1024) / block.length; index++) {
    blocks.push(block);
    block = createHash('sha256').update(block).digest();
  }
  return Buffer.concat(blocks);
})();

/**
 * A custom Dockerfile project. The context's `.dockerignore` excludes `lib`, which the server needs, so the image only
 * works when the Dockerfile's own ignore file wins; that one excludes logs and notes but re-includes `notes/keep.md`.
 */
const writeContextProject = async ({ data, ignored }: { data: string; ignored: string }) => {
  await write(
    join(buildContext, 'server.js'),
    [
      "const { createHash } = require('node:crypto');",
      "const { existsSync, readFileSync } = require('node:fs');",
      'console.log(JSON.stringify({',
      "  data: readFileSync('/app/lib/current', 'utf8').trim(),",
      "  blob: createHash('sha256').update(readFileSync('/app/assets/blob.bin')).digest('hex'),",
      "  present: ['debug.log', 'notes/drop.md', 'notes/keep.md', 'lib/data.txt'].filter((path) => existsSync('/app/' + path))",
      '}));',
      ''
    ].join('\n')
  );
  await write(join(buildContext, '.dockerignore'), 'lib\n');
  await write(join(buildContext, 'lib', 'data.txt'), `${data}\n`);
  if (!existsSync(join(buildContext, 'lib', 'current')))
    await symlink('data.txt', join(buildContext, 'lib', 'current'));
  await write(join(buildContext, 'assets', 'blob.bin'), contextBlob);
  await write(join(buildContext, 'debug.log'), `${ignored}\n`);
  await write(join(buildContext, 'notes', 'drop.md'), `${ignored}\n`);
  await write(join(buildContext, 'notes', 'keep.md'), 'keep\n');
  const dockerfile = join(buildContext, CONTEXT_DOCKERFILE);
  await write(
    dockerfile,
    `FROM public.ecr.aws/docker/library/node:${NODE_VERSION}-bookworm-slim\nWORKDIR /app\nCOPY . .\nCMD ["node", "server.js"]\n`
  );
  await write(`${dockerfile}.dockerignore`, '*.log\nnotes/*.md\n!notes/keep.md\n');
};

/** One custom-Dockerfile packaging through the production path, with this harness's `docker buildx build`. */
const packageContextImage = async (label: string, existingDigests: string[]): Promise<ContextPackaged> => {
  const imageTag = `${imagePrefix}:${label}`;
  const output = await buildUsingCustomDockerfile({
    name: imageTag,
    cwd: contextProject,
    buildContextPath: 'context',
    dockerfilePath: CONTEXT_DOCKERFILE,
    dockerBuildOutputArchitecture: 'linux/amd64',
    progressLogger,
    existingDigests,
    buildDockerImage: async ({ buildContextPath, dockerfilePath }) => {
      const started = performance.now();
      const result = await docker(
        buildCommand({
          tag: imageTag,
          dockerfile: resolve(buildContextPath, dockerfilePath!),
          context: buildContextPath,
          cacheFlags: []
        })
      );
      await writeFile(join(out, `${label}.build.log`), result.stderr);
      return {
        ...(await getDockerImageDetails(imageTag)),
        dockerOutput: result.stderr,
        duration: Math.round(performance.now() - started)
      };
    }
  });
  return {
    label,
    digest: output.digest,
    outcome: output.outcome,
    sourceFiles: (output.sourceFiles ?? []).map(({ path }) => relative(buildContext, path).replaceAll('\\', '/')),
    run: output.outcome === 'bundled' ? await runHandler(imageTag) : null
  };
};

type CheckoutPackaged = {
  label: string;
  project: string;
  digest: string;
  outcome: string;
  tree: string | null;
  run: RunOutput | null;
};

/** The Python project at `project`, built by the production bundler as a checkout there would build it. */
const packagePythonCheckout = async (
  label: string,
  project: string,
  existingDigests: string[]
): Promise<CheckoutPackaged> => {
  const dist = join(out, 'dist', label);
  const output = await buildPythonProject({ label, project, existingDigests, onBuild: () => undefined });
  const bundled = output.outcome === 'bundled';
  return {
    label,
    project: relative(out, project),
    digest: output.digest,
    outcome: output.outcome,
    tree: bundled ? await artifactTreeOf(dist) : null,
    run: bundled ? await runPythonArtifact(dist) : null
  };
};

type ModePackaged = {
  label: string;
  digest: string;
  outcome: string;
  /** The image a deploy would use: this step's own when it built, the cached one its digest matched when skipped. */
  deployedImage: string;
  scriptMode: string;
  run: RunOutput;
};
const modeProject = join(out, 'project-mode');
/** What the mode project's handler prints. */
const modeOutput = (marker: string, script: string) => `es-image-mode ${marker} ms=172800000 script=${script}`;

/** An npm project whose handler runs its included `scripts/run.sh`, which has the given mode on the host. */
const writeModeProject = async ({ marker, scriptMode }: { marker: string; scriptMode: number }) => {
  await writeProject({ marker, msVersion: '2.1.3', project: modeProject });
  await write(
    join(modeProject, 'src', 'index.ts'),
    [
      "import { execFileSync } from 'node:child_process';",
      "import ms from 'ms';",
      '',
      'let script: string;',
      'try {',
      "  script = execFileSync('/app/scripts/run.sh', { encoding: 'utf8' }).trim();",
      '} catch (error) {',
      '  script = `error ${(error as NodeJS.ErrnoException).code}`;',
      '}',
      `console.log(\`es-image-mode ${marker} ms=\${ms('2 days')} script=\${script}\`);`,
      ''
    ].join('\n')
  );
  await write(join(modeProject, 'scripts', 'run.sh'), '#!/bin/sh\necho run-ok\n');
  await chmod(join(modeProject, 'scripts', 'run.sh'), scriptMode);
};

/**
 * One ES image packaging of the mode project. Each build folder ends in the same job name, as the CLI's
 * `<invocation>/build/containers/<job>` does, so only the project decides the digest.
 */
const packageModeImage = async (
  label: string,
  existingDigests: string[],
  imageByDigest: Map<string, string>
): Promise<ModePackaged> => {
  const imageTag = `${imagePrefix}:${label}`;
  const { output } = await buildEsImage({
    label,
    imageTag,
    project: modeProject,
    outputModuleFormat: 'esm',
    includeFiles: ['scripts/run.sh'],
    distFolderPath: join(out, 'mode-builds', label, 'api'),
    existingDigests
  });
  if (output.outcome === 'bundled') imageByDigest.set(output.digest, imageTag);
  const deployedImage = imageByDigest.get(output.digest);
  if (!deployedImage) throw new Error(`${label}: skipped with a digest no earlier step built.`);
  return {
    label,
    digest: output.digest,
    outcome: output.outcome,
    deployedImage,
    scriptMode: await runInImage(['--entrypoint', 'stat', deployedImage, '-c', '%a', '/app/scripts/run.sh']),
    run: await runHandler(deployedImage)
  };
};

/** Packages in a fresh process: the bundler caches dependency manifests for the life of one. */
const packageInFreshProcess = async <Result = Packaged>(label: string): Promise<Result> => {
  await run(process.execPath, [import.meta.path, '--out', out, '--run-id', runId, '--package', label], PACKAGE_ROOT);
  return JSON.parse(await readFile(join(out, `${label}.json`), 'utf8'));
};

const installStepOf = ({ label, build }: Packaged) => {
  const step = build.steps.find(({ instruction }) => INSTALL_STEP.test(instruction));
  if (!step) throw new Error(`${label}: no install step in the build log.`);
  return step;
};
/** Every step of the dependency stage: the package manager, the lifecycle policy, the install and its scripts. */
const dependencyStepsOf = ({ build }: Packaged) =>
  build.steps.filter(({ instruction }) => instruction.startsWith('[deps '));
const summarize = (steps: Step[]) => steps.map(({ instruction, decision }) => `${decision} ${instruction}`).join('; ');

if (packageLabel) {
  const result = packageLabel.startsWith('py')
    ? await packagePythonArtifact(packageLabel)
    : await packageImage(packageLabel);
  await writeFile(join(out, `${packageLabel}.json`), `${JSON.stringify(result, null, 2)}\n`);
} else {
  await mkdir(out, { recursive: true });
  if ((await readdir(out)).length > 0) throw new Error(`Refusing to write into ${out}: it is not empty.`);
  await mkdir(dockerConfig, { recursive: true });
  const results: { check: string; ok: boolean; detail: string }[] = [];
  const check = (name: string, ok: boolean, detail: string) => {
    results.push({ check: name, ok, detail });
    console.log(`${ok ? 'ok    ' : 'FAILED'}  ${name} — ${detail}`);
  };
  const startedAt = new Date(Date.now() - 1000).toISOString();
  const packaged: Packaged[] = [];
  const pythonPackaged: PythonPackaged[] = [];
  const contextPackaged: ContextPackaged[] = [];
  const checkoutPackaged: CheckoutPackaged[] = [];
  const modePackaged: ModePackaged[] = [];
  let cleanup: Record<string, unknown> = {};
  const baseImages: Record<string, string> = {};
  try {
    for (const official of Object.values(OFFICIAL_BASE_IMAGES)) {
      const directory = join(out, 'base', official.replace(/[^a-z0-9.-]/gi, '-'));
      // oxlint-disable-next-line no-await-in-loop -- Two small builds, one after the other.
      await write(join(directory, 'run-id'), `${runId}\n`);
      // oxlint-disable-next-line no-await-in-loop -- Two small builds, one after the other.
      await write(join(directory, 'Dockerfile'), `FROM ${official}\nCOPY run-id /stacktape-test-run-id\n`);
      // oxlint-disable-next-line no-await-in-loop -- Two small builds, one after the other.
      await docker([
        'buildx',
        'build',
        '--builder',
        'default',
        '--platform',
        'linux/amd64',
        '-t',
        baseImageOf(official),
        directory
      ]);
      // oxlint-disable-next-line no-await-in-loop -- Two small builds, one after the other.
      baseImages[baseImageOf(official)] = (await getDockerImageDetails(baseImageOf(official))).id;
    }
    if (!only) {
      await writeProject({ marker: 'handler-v1', msVersion: '2.1.3' });
      packaged.push(await packageInFreshProcess('v1'));
      await writeProject({ marker: 'handler-v2', msVersion: '2.1.3' });
      packaged.push(await packageInFreshProcess('v2'));
      await writeProject({ marker: 'handler-v2', msVersion: '2.1.2' });
      packaged.push(await packageInFreshProcess('v3'));
      await writeProject({ marker: 'handler-cjs1', msVersion: '2.1.2' });
      packaged.push(await packageInFreshProcess('cjs1'));
      await writeProject({ marker: 'handler-cjs2', msVersion: '2.1.2' });
      packaged.push(await packageInFreshProcess('cjs2'));
      await writeProject({ marker: 'handler-pnpm1', msVersion: '2.1.3', packageManager: 'pnpm' });
      packaged.push(await packageInFreshProcess('pnpm1'));
      await writeProject({ marker: 'handler-pnpm2', msVersion: '2.1.3', packageManager: 'pnpm' });
      packaged.push(await packageInFreshProcess('pnpm2'));
      await writeProject({ marker: 'handler-pnpm2', msVersion: '2.1.2', packageManager: 'pnpm' });
      packaged.push(await packageInFreshProcess('pnpm3'));
      await writeProject({ marker: 'handler-pnpm-cjs1', msVersion: '2.1.2', packageManager: 'pnpm' });
      packaged.push(await packageInFreshProcess('pnpm-cjs1'));
      await writeProject({ marker: 'handler-pnpm-cjs2', msVersion: '2.1.2', packageManager: 'pnpm' });
      packaged.push(await packageInFreshProcess('pnpm-cjs2'));
      await writeProject({
        marker: 'handler-pnpm-nested',
        msVersion: '2.1.2',
        packageManager: 'pnpm',
        nestedManifest: true
      });
      packaged.push(await packageInFreshProcess('pnpm-nested'));
      await writeProject({ marker: 'handler-bun1', msVersion: '2.1.3', packageManager: 'bun' });
      packaged.push(await packageInFreshProcess('bun1'));
      await writeProject({ marker: 'handler-bun2', msVersion: '2.1.3', packageManager: 'bun' });
      packaged.push(await packageInFreshProcess('bun2'));
      await writeProject({ marker: 'handler-bun2', msVersion: '2.1.2', packageManager: 'bun' });
      packaged.push(await packageInFreshProcess('bun3'));
      await writeProject({ marker: 'handler-bun-cjs1', msVersion: '2.1.2', packageManager: 'bun' });
      packaged.push(await packageInFreshProcess('bun-cjs1'));
      await writeProject({ marker: 'handler-bun-cjs2', msVersion: '2.1.2', packageManager: 'bun' });
      packaged.push(await packageInFreshProcess('bun-cjs2'));
      await writePythonProject({ marker: 'handler-py1', idnaVersion: '3.10' });
      pythonPackaged.push(await packageInFreshProcess<PythonPackaged>('py1'));
      await writePythonProject({ marker: 'handler-py2', idnaVersion: '3.10' });
      pythonPackaged.push(await packageInFreshProcess<PythonPackaged>('py2'));
      await writePythonProject({ marker: 'handler-py2', idnaVersion: '3.9' });
      pythonPackaged.push(await packageInFreshProcess<PythonPackaged>('py3'));
      await writePythonProject({ marker: 'handler-py-nested', idnaVersion: '3.9', nested: true });
      pythonPackaged.push(await packageInFreshProcess<PythonPackaged>('py-nested'));
      await writeContextProject({ data: 'context-data-1', ignored: 'ignored-1' });
      contextPackaged.push(await packageContextImage('dc1', []));
      await writeContextProject({ data: 'context-data-1', ignored: 'ignored-2' });
      contextPackaged.push(await packageContextImage('dc2', [contextPackaged[0]!.digest]));
      await writeContextProject({ data: 'context-data-2', ignored: 'ignored-2' });
      contextPackaged.push(await packageContextImage('dc3', [contextPackaged[0]!.digest]));
    }
    if (!only || only === 'python-checkouts') {
      const checkoutOne = join(out, 'checkouts', 'one', 'project');
      const checkoutTwo = join(out, 'elsewhere', 'checkout-two', 'project');
      await writePythonProject({ marker: 'handler-checkout', idnaVersion: '3.10', project: checkoutOne });
      await writePythonProject({ marker: 'handler-checkout', idnaVersion: '3.10', project: checkoutTwo });
      checkoutPackaged.push(await packagePythonCheckout('pc-a', checkoutOne, []));
      checkoutPackaged.push(await packagePythonCheckout('pc-b', checkoutTwo, []));
      checkoutPackaged.push(await packagePythonCheckout('pc-b-hit', checkoutTwo, [checkoutPackaged[0]!.digest]));
      await writePythonProject({ marker: 'handler-checkout-edit', idnaVersion: '3.10', project: checkoutTwo });
      checkoutPackaged.push(await packagePythonCheckout('pc-b-edit', checkoutTwo, [checkoutPackaged[0]!.digest]));
    }
    if (!only || only === 'es-image-mode') {
      const imageByDigest = new Map<string, string>();
      await writeModeProject({ marker: 'mode-v1', scriptMode: 0o644 });
      modePackaged.push(await packageModeImage('m1', [], imageByDigest));
      modePackaged.push(await packageModeImage('m2', [modePackaged[0]!.digest], imageByDigest));
      await writeModeProject({ marker: 'mode-v1', scriptMode: 0o755 });
      modePackaged.push(await packageModeImage('m3', [modePackaged[0]!.digest], imageByDigest));
      await writeModeProject({ marker: 'mode-v2', scriptMode: 0o755 });
      modePackaged.push(
        await packageModeImage('m4', [modePackaged[0]!.digest, modePackaged[2]!.digest], imageByDigest)
      );
    }

    if (!only) {
      const packagedWith = (packageManager: PackageManager) =>
        packaged.filter(({ label }) => fixtureOf(label).packageManager === packageManager);
      const npmPackaged = packagedWith('npm');
      const pnpmPackaged = packagedWith('pnpm');
      const bunPackaged = packagedWith('bun');
      const [v1, v2, v3, cjs1, cjs2] = npmPackaged as [Packaged, Packaged, Packaged, Packaged, Packaged];
      const [pnpm1, pnpm2, pnpm3, pnpmCjs1, pnpmCjs2, pnpmNested] = pnpmPackaged as [
        Packaged,
        Packaged,
        Packaged,
        Packaged,
        Packaged,
        Packaged
      ];
      const [bun1, bun2, bun3, bunCjs1, bunCjs2] = bunPackaged as [Packaged, Packaged, Packaged, Packaged, Packaged];
      check(
        'v1: the cold build ran the npm install',
        installStepOf(v1).decision === 'DONE',
        JSON.stringify(installStepOf(v1))
      );
      check(
        'v1: the image runs its handler with the installed dependency',
        v1.runOutput === 'es-image-deps handler-v1 ms=172800000' && v1.installedMs === '2.1.3',
        `${v1.runOutput}; ms ${v1.installedMs}`
      );
      check(
        'v2: a handler-only edit reused the npm install',
        installStepOf(v2).decision === 'CACHED',
        JSON.stringify(installStepOf(v2))
      );
      check(
        'v2: the artifact digest and the image changed',
        v2.digest !== v1.digest && v2.build.imageId !== v1.build.imageId,
        `digest ${v1.digest} → ${v2.digest}; image ${v1.build.imageId} → ${v2.build.imageId}`
      );
      check(
        'v2: the new image runs the edited handler',
        v2.runOutput === 'es-image-deps handler-v2 ms=172800000' && v2.installedMs === '2.1.3',
        `${v2.runOutput}; ms ${v2.installedMs}`
      );
      check(
        'v3: a dependency change ran the npm install again',
        installStepOf(v3).decision === 'DONE' && v3.installedMs === '2.1.2',
        `${JSON.stringify(installStepOf(v3))}; ms ${v3.installedMs}`
      );
      check(
        'cjs1: CommonJS output installs without the bundle and runs its handler',
        !cjs1.build.dockerfile.includes('COPY . /install-dir') &&
          cjs1.runOutput === 'es-image-deps handler-cjs1 ms=172800000' &&
          cjs1.installedMs === '2.1.2',
        `${cjs1.runOutput}; ms ${cjs1.installedMs}`
      );
      check(
        'cjs2: a handler-only edit of CommonJS output reused the npm install',
        installStepOf(cjs2).decision === 'CACHED' && cjs2.runOutput === 'es-image-deps handler-cjs2 ms=172800000',
        `${JSON.stringify(installStepOf(cjs2))}; ${cjs2.runOutput}`
      );
      const differing = npmPackaged.filter(({ app, conservative }) => !sameApp(app, conservative.app));
      check(
        "every npm image holds exactly the conservative layout's /app, runtime package.json included",
        differing.length === 0,
        differing.length === 0
          ? npmPackaged.map(({ label, app }) => `${label} ${app.manifest}`).join('; ')
          : differing
              .map(({ label, app, conservative }) => `${label}: ${app.manifest} vs ${conservative.app.manifest}`)
              .join('; ')
      );
      check(
        'pnpm1: the cold build ran the pnpm install',
        installStepOf(pnpm1).decision === 'DONE',
        JSON.stringify(installStepOf(pnpm1))
      );
      check(
        'pnpm1: the image runs its handler with the installed dependency',
        pnpm1.runOutput === 'es-image-deps handler-pnpm1 ms=172800000' && pnpm1.installedMs === '2.1.3',
        `${pnpm1.runOutput}; ms ${pnpm1.installedMs}`
      );
      check(
        'pnpm2: a handler-only edit reused every step of the pnpm dependency stage',
        dependencyStepsOf(pnpm2).length > 0 && dependencyStepsOf(pnpm2).every(({ decision }) => decision === 'CACHED'),
        summarize(dependencyStepsOf(pnpm2))
      );
      check(
        'pnpm2: the artifact digest and the image changed',
        pnpm2.digest !== pnpm1.digest && pnpm2.build.imageId !== pnpm1.build.imageId,
        `digest ${pnpm1.digest} → ${pnpm2.digest}; image ${pnpm1.build.imageId} → ${pnpm2.build.imageId}`
      );
      check(
        'pnpm2: the new image runs the edited handler',
        pnpm2.runOutput === 'es-image-deps handler-pnpm2 ms=172800000' && pnpm2.installedMs === '2.1.3',
        `${pnpm2.runOutput}; ms ${pnpm2.installedMs}`
      );
      check(
        'pnpm3: a dependency change ran the pnpm install again',
        installStepOf(pnpm3).decision === 'DONE' && pnpm3.installedMs === '2.1.2',
        `${JSON.stringify(installStepOf(pnpm3))}; ms ${pnpm3.installedMs}`
      );
      check(
        'pnpm-cjs1: CommonJS output installs without the bundle and runs its handler',
        !pnpmCjs1.build.dockerfile.includes('COPY . /install-dir') &&
          pnpmCjs1.runOutput === 'es-image-deps handler-pnpm-cjs1 ms=172800000' &&
          pnpmCjs1.installedMs === '2.1.2',
        `${pnpmCjs1.runOutput}; ms ${pnpmCjs1.installedMs}`
      );
      check(
        'pnpm-cjs2: a handler-only edit of CommonJS output reused every step of the pnpm dependency stage',
        dependencyStepsOf(pnpmCjs2).length > 0 &&
          dependencyStepsOf(pnpmCjs2).every(({ decision }) => decision === 'CACHED') &&
          pnpmCjs2.runOutput === 'es-image-deps handler-pnpm-cjs2 ms=172800000',
        `${summarize(dependencyStepsOf(pnpmCjs2))}; ${pnpmCjs2.runOutput}`
      );
      check(
        'pnpm-nested: a bundle with a nested manifest keeps the conservative layout and runs its handler',
        pnpmNested.build.dockerfileSha256 === pnpmNested.conservative.dockerfileSha256 &&
          pnpmNested.runOutput === 'es-image-deps handler-pnpm-nested ms=172800000',
        `Dockerfile ${pnpmNested.build.dockerfileSha256} vs conservative ${pnpmNested.conservative.dockerfileSha256}; ${pnpmNested.runOutput}`
      );
      const differingPnpm = pnpmPackaged.filter(
        ({ app, conservative }) => !sameApp(app, conservative.app) || !hasPolicyAndLockfile(app)
      );
      check(
        "every pnpm image holds the conservative layout's /app, lifecycle policy and lockfile included, except pnpm's install times",
        differingPnpm.length === 0,
        (differingPnpm.length === 0 ? pnpmPackaged : differingPnpm)
          .map(
            ({ label, app, conservative }) =>
              `${label} ${app.manifest}: ${installTimesOf(app).join(', ')} vs ${installTimesOf(conservative.app).join(', ')}`
          )
          .join('; ')
      );
      check(
        'bun1: the cold build ran the Bun install',
        installStepOf(bun1).decision === 'DONE',
        JSON.stringify(installStepOf(bun1))
      );
      check(
        'bun1: the image runs its handler with the installed dependency',
        bun1.runOutput === 'es-image-deps handler-bun1 ms=172800000' && bun1.installedMs === '2.1.3',
        `${bun1.runOutput}; ms ${bun1.installedMs}`
      );
      check(
        'bun2: a handler-only edit reused every step of the Bun dependency stage',
        dependencyStepsOf(bun2).length > 0 && dependencyStepsOf(bun2).every(({ decision }) => decision === 'CACHED'),
        summarize(dependencyStepsOf(bun2))
      );
      check(
        'bun2: the artifact digest and the image changed',
        bun2.digest !== bun1.digest && bun2.build.imageId !== bun1.build.imageId,
        `digest ${bun1.digest} → ${bun2.digest}; image ${bun1.build.imageId} → ${bun2.build.imageId}`
      );
      check(
        'bun2: the new image runs the edited handler',
        bun2.runOutput === 'es-image-deps handler-bun2 ms=172800000' && bun2.installedMs === '2.1.3',
        `${bun2.runOutput}; ms ${bun2.installedMs}`
      );
      check(
        'bun3: a dependency change ran the Bun install again',
        installStepOf(bun3).decision === 'DONE' && bun3.installedMs === '2.1.2',
        `${JSON.stringify(installStepOf(bun3))}; ms ${bun3.installedMs}`
      );
      check(
        'bun-cjs1: CommonJS output installs without the bundle and runs its handler',
        !bunCjs1.build.dockerfile.includes('COPY . /install-dir') &&
          bunCjs1.runOutput === 'es-image-deps handler-bun-cjs1 ms=172800000' &&
          bunCjs1.installedMs === '2.1.2',
        `${bunCjs1.runOutput}; ms ${bunCjs1.installedMs}`
      );
      check(
        'bun-cjs2: a handler-only edit of CommonJS output reused every step of the Bun dependency stage',
        dependencyStepsOf(bunCjs2).length > 0 &&
          dependencyStepsOf(bunCjs2).every(({ decision }) => decision === 'CACHED') &&
          bunCjs2.runOutput === 'es-image-deps handler-bun-cjs2 ms=172800000',
        `${summarize(dependencyStepsOf(bunCjs2))}; ${bunCjs2.runOutput}`
      );
      const differingBun = bunPackaged.filter(
        ({ app, conservative }) => !sameApp(app, conservative.app) || !hasBunPolicyAndLockfile(app)
      );
      check(
        "every Bun image holds exactly the conservative layout's /app, the policy manifest and lockfile included",
        differingBun.length === 0,
        (differingBun.length === 0 ? bunPackaged : differingBun)
          .map(({ label, app, conservative }) => `${label} ${app.manifest} vs ${conservative.app.manifest}`)
          .join('; ')
      );
      const runningDifferently = packaged.filter(
        ({ runOutput, runStderr, conservative }) =>
          runOutput !== conservative.run.stdout || withoutPid(runStderr) !== withoutPid(conservative.run.stderr)
      );
      check(
        'every image prints exactly what its conservative image prints, on stdout and stderr',
        runningDifferently.length === 0,
        (runningDifferently.length === 0 ? packaged.filter(({ runStderr }) => runStderr) : runningDifferently)
          .map(({ label, runStderr, conservative }) => `${label}: ${runStderr} | ${conservative.run.stderr}`)
          .join('; ') || 'no image printed to stderr'
      );
      const [py1, py2, py3, pyNested] = pythonPackaged as [
        PythonPackaged,
        PythonPackaged,
        PythonPackaged,
        PythonPackaged
      ];
      const pythonInstallStep = ({ build }: PythonPackaged) =>
        build.steps.find(({ instruction }) => PYTHON_INSTALL_STEP.test(instruction)) ?? null;
      /** uv, the system packages, the minifier and the requirements install: everything but the source and its minifying. */
      const pythonDependencySteps = ({ build }: PythonPackaged) =>
        build.steps.filter(({ instruction }) => PYTHON_DEPENDENCY_STEP.test(instruction));
      check(
        'py1: the first Python build ran the requirements install',
        pythonInstallStep(py1)?.decision === 'DONE',
        JSON.stringify(pythonInstallStep(py1))
      );
      check(
        'py1: the artifact runs its handler with the installed dependency',
        py1.run.stdout === pythonOutput('handler-py1', '3.10'),
        py1.run.stdout
      );
      check(
        'py2: a handler-only edit reused uv, the system packages, the minifier and the requirements install',
        pythonDependencySteps(py2).length >= 3 &&
          pythonDependencySteps(py2).every(({ decision }) => decision === 'CACHED'),
        summarize(pythonDependencySteps(py2))
      );
      check(
        'py2: the artifact digest and contents changed, and it runs the edited handler',
        py2.digest !== py1.digest && py2.tree !== py1.tree && py2.run.stdout === pythonOutput('handler-py2', '3.10'),
        `digest ${py1.digest} → ${py2.digest}; ${py2.run.stdout}`
      );
      check(
        'py3: a requirements edit ran the install again',
        pythonInstallStep(py3)?.decision === 'DONE' && py3.run.stdout === pythonOutput('handler-py2', '3.9'),
        `${JSON.stringify(pythonInstallStep(py3))}; ${py3.run.stdout}`
      );
      check(
        'py-nested: nested requirements keep the conservative layout',
        pyNested.build.dockerfileSha256 === pyNested.conservative.build.dockerfileSha256 &&
          pyNested.run.stdout === pythonOutput('handler-py-nested', '3.9'),
        `Dockerfile ${pyNested.build.dockerfileSha256} vs ${pyNested.conservative.build.dockerfileSha256}; ${pyNested.run.stdout}`
      );
      const differingPython = pythonPackaged.filter(
        ({ tree, run: output, conservative }) =>
          tree !== conservative.tree ||
          output.stdout !== conservative.run.stdout ||
          output.stderr !== conservative.run.stderr
      );
      check(
        "every Python artifact holds exactly the conservative layout's tree and prints the same",
        differingPython.length === 0,
        (differingPython.length === 0 ? pythonPackaged : differingPython)
          .map(({ label, tree, run: output }) => `${label}: ${tree.split('\n').length} entries, ${output.stdout}`)
          .join('; ')
      );
      const [dc1, dc2, dc3] = contextPackaged as [ContextPackaged, ContextPackaged, ContextPackaged];
      const contextOutput = (data: string) =>
        JSON.stringify({ data, blob: sha256(contextBlob), present: ['notes/keep.md', 'lib/data.txt'] });
      check(
        "dc1: the Dockerfile's own ignore file wins, and the image holds and runs exactly the selected context",
        dc1.outcome === 'bundled' &&
          dc1.run?.stdout === contextOutput('context-data-1') &&
          dc1.sourceFiles.join(',') ===
            '.dockerignore,assets/blob.bin,lib/current,lib/data.txt,notes/keep.md,server.js',
        `${dc1.digest}; ${dc1.run?.stdout}; ${dc1.sourceFiles.join(',')}`
      );
      check(
        'dc2: an edit to ignored files only keeps the digest and hits the cache',
        dc2.digest === dc1.digest && dc2.outcome === 'skipped',
        `${dc2.digest}; ${dc2.outcome}`
      );
      check(
        'dc3: a content edit changes the digest, rebuilds, and the image prints the edit',
        dc3.digest !== dc1.digest && dc3.outcome === 'bundled' && dc3.run?.stdout === contextOutput('context-data-2'),
        `${dc1.digest} → ${dc3.digest}; ${dc3.outcome}; ${dc3.run?.stdout}`
      );
    }
    if (!only || only === 'python-checkouts') {
      const [pcA, pcB, pcBHit, pcBEdit] = checkoutPackaged as [
        CheckoutPackaged,
        CheckoutPackaged,
        CheckoutPackaged,
        CheckoutPackaged
      ];
      check(
        'pc-a: the Python artifact builds and runs in the first checkout',
        pcA.outcome === 'bundled' && pcA.run?.stdout === pythonOutput('handler-checkout', '3.10'),
        `${pcA.project}: ${pcA.digest}; ${pcA.run?.stdout}`
      );
      check(
        'pc-b: the same project in another checkout root gets the same digest, artifact tree and output',
        pcB.digest === pcA.digest &&
          pcB.outcome === 'bundled' &&
          pcB.tree !== null &&
          pcB.tree === pcA.tree &&
          pcB.run?.stdout === pcA.run?.stdout &&
          pcB.run?.stderr === pcA.run?.stderr,
        `${pcB.project}: digest ${pcA.digest} → ${pcB.digest}; tree ${pcB.tree === pcA.tree ? 'equal' : 'different'}; ${pcB.run?.stdout}`
      );
      check(
        "pc-b-hit: offered the first checkout's digest, the second checkout hits the cache",
        pcBHit.digest === pcA.digest && pcBHit.outcome === 'skipped',
        `${pcBHit.digest}; ${pcBHit.outcome}`
      );
      check(
        'pc-b-edit: a handler edit changes the digest, rebuilds and prints the edit',
        pcBEdit.digest !== pcA.digest &&
          pcBEdit.outcome === 'bundled' &&
          pcBEdit.run?.stdout === pythonOutput('handler-checkout-edit', '3.10'),
        `${pcA.digest} → ${pcBEdit.digest}; ${pcBEdit.outcome}; ${pcBEdit.run?.stdout}`
      );
    }
    if (!only || only === 'es-image-mode') {
      const [m1, m2, m3, m4] = modePackaged as [ModePackaged, ModePackaged, ModePackaged, ModePackaged];
      check(
        'm1: the image builds, and its 0644 included script cannot run',
        m1.outcome === 'bundled' && m1.scriptMode === '644' && m1.run.stdout === modeOutput('mode-v1', 'error EACCES'),
        `${m1.digest}; mode ${m1.scriptMode}; ${m1.run.stdout}`
      );
      check(
        'm2: an unchanged repeat hits the cache',
        m2.digest === m1.digest && m2.outcome === 'skipped',
        `${m2.digest}; ${m2.outcome}`
      );
      check(
        'm3: chmod 755 changes the digest and rebuilds, and the deployed image runs the script',
        m3.digest !== m1.digest &&
          m3.outcome === 'bundled' &&
          m3.scriptMode === '755' &&
          m3.run.stdout === modeOutput('mode-v1', 'run-ok'),
        `${m1.digest} → ${m3.digest}; ${m3.outcome}; deployed ${m3.deployedImage}; mode ${m3.scriptMode}; ${m3.run.stdout}`
      );
      check(
        'm4: a handler edit changes the digest, rebuilds and prints the edit',
        m4.digest !== m3.digest &&
          m4.digest !== m1.digest &&
          m4.outcome === 'bundled' &&
          m4.run.stdout === modeOutput('mode-v2', 'run-ok'),
        `${m3.digest} → ${m4.digest}; ${m4.outcome}; ${m4.run.stdout}`
      );
    }
  } finally {
    const images = (
      await docker(['image', 'ls', '--filter', `reference=${imagePrefix}*`, '--format', '{{.Repository}}:{{.Tag}}'])
    ).stdout
      .split('\n')
      .filter(Boolean);
    if (images.length > 0) await docker(['image', 'rm', ...images]);
    const remainingImages = (
      await docker(['image', 'ls', '-q', '--filter', `reference=${imagePrefix}*`])
    ).stdout.trim();
    const remainingContainers = (await docker(['ps', '-aq', '--filter', `label=${containerLabel}`])).stdout.trim();
    const events = (
      await docker([
        'events',
        '--since',
        startedAt,
        '--until',
        new Date().toISOString(),
        '--filter',
        'type=image',
        '--format',
        '{{.Action}} {{.Actor.Attributes.name}}'
      ])
    ).stdout
      .split('\n')
      .filter(Boolean);
    const cacheFiles = existsSync(cache)
      ? (await readdir(cache, { recursive: true, withFileTypes: true })).filter((entry) => entry.isFile())
      : [];
    const cacheSizes = await Promise.all(cacheFiles.map((entry) => stat(join(entry.parentPath, entry.name))));
    const ownedCache = {
      bytes: cacheSizes.reduce((sum, { size }) => sum + size, 0),
      indexSha256: existsSync(join(cache, 'index.json')) ? sha256(await readFile(join(cache, 'index.json'))) : null
    };
    await rm(cache, { recursive: true, force: true });
    cleanup = {
      removedImages: images,
      remainingImages,
      remainingContainers,
      imageEvents: events,
      ownedCache: { ...ownedCache, removed: !existsSync(cache) }
    };
    check(
      'owned images, containers and cache are removed and no image was pulled',
      !remainingImages &&
        !remainingContainers &&
        !existsSync(cache) &&
        !events.some((event) => event.startsWith('pull')),
      JSON.stringify({ removed: images.length, pulls: events.filter((event) => event.startsWith('pull')) })
    );
    const sourceFiles = [
      'src/docker/dockerfiles.ts',
      'src/buildpacks/stacktape-es-image-buildpack.ts',
      'src/es/package-manager-install.ts',
      'src/bundlers/py/index.ts',
      'src/artifact/docker-context.ts',
      'src/bundlers/digest.ts',
      'src/bundlers/es/index.ts',
      'src/image/custom-dockerfile.ts',
      'scripts/synthetic-es-image-deps-e2e.ts'
    ];
    const report = {
      kind: 'stacktape-es-image-deps-e2e',
      only: only ?? null,
      createdAt: new Date().toISOString(),
      runId,
      source: {
        revision: (await run('git', ['rev-parse', 'HEAD'], PACKAGE_ROOT)).stdout.trim(),
        files: Object.fromEntries(
          await Promise.all(
            sourceFiles.map(async (file) => [file, sha256(await readFile(join(PACKAGE_ROOT, file)))] as const)
          )
        )
      },
      docker: {
        version: (await docker(['version', '--format', '{{.Server.Version}}'])).stdout.trim(),
        officialBaseImages: OFFICIAL_BASE_IMAGES,
        runBaseImages: baseImages
      },
      packaged,
      pythonPackaged,
      contextPackaged,
      checkoutPackaged,
      modePackaged,
      cleanup,
      results
    };
    await writeFile(join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
    console.log(`Report: ${join(out, 'report.json')}`);
  }
  if (results.some(({ ok }) => !ok) || results.length < (only ? 5 : 48)) process.exitCode = 1;
}
