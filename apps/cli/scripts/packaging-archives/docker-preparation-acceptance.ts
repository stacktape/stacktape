/**
 * Docker preparation acceptance. The CLI owns it because it drives the CLI's own packaging code.
 *
 * Each scenario packages a small project in a fresh process (see `docker-preparation-worker.ts`) whose `docker` is a
 * stand-in generated for that scenario. The stand-in records every command in order and answers only what the
 * scenario's Docker state allows. It always refuses privileged containers, binfmt installation and builder changes,
 * and fails like Docker does when a build targets a platform its builder does not report ("exec format error"), when
 * a registry-cache build runs before `docker login` (403), or when the daemon is unreachable or stuck.
 *
 * What must hold:
 *
 * - Pure JavaScript and custom artifacts are packaged without any Docker command, whatever Docker's state. A pure
 *   JavaScript split group is built together whether Docker is running, unreachable, stuck or not installed. Without
 *   Docker, its function ZIPs and its shared layer, zipped as a deployment zips it, hold the same entries as with Docker
 *   ready, and each function runs in the Lambda Node.js image with the layer at /opt (see `lambda-runtime.ts`). A single
 *   function, and a group with `--disableLayerOptimization`, is packaged per function.
 * - A split group whose shared analysis finds a native dependency asks only `docker info`, and without Docker fails
 *   before any artifact, naming the dependency and its function.
 * - A job that needs Docker prepares only the platform it builds for, once, however many jobs ask: a host-native build
 *   never installs emulation, and a missing platform leads to one refused binfmt request for that platform only, with
 *   the pinned helper. Other jobs are still packaged.
 * - The registry cache builder and ECR login are prepared only for a build that uses the cache, and before it runs.
 * - A job that needs Docker still fails with `DOCKER_NOT_RUNNING` or `DOCKER_NOT_INSTALLED`.
 * - Across a series of deployments against one image registry, each image job's registry cache tag survives while the
 *   job exists, so later builds import it. Old image versions and replaced cache images are still deleted, and a
 *   removed job's cache tag goes with the next deployment. The stand-in keeps the registry: pushes and `--cache-to`
 *   exports move a tag to a new image and leave the replaced one untagged, as ECR does.
 * - Lambda ZIPs over 50 MB (a function packaged on its own, a split function and a custom artifact, each with 52 MiB
 *   of incompressible data) package, and extracted with `unzip` they return that data's size and SHA-256 in the
 *   Lambda image. A split function whose package and Stacktape layers together exceed 250 MB fails before any
 *   upload, with a message naming each size.
 *
 * One scenario uses the real Docker daemon, host-native only: a guard forwards `info`, `buildx inspect`, an amd64
 * `build` tagged with this run's own prefix and `image inspect` of that tag, and refuses everything else. The image
 * is built `FROM scratch`, so nothing is pulled; the daemon's image events confirm it. The image is removed at the end
 * and its removal verified.
 *
 *   pnpm --filter @stacktape/cli run test:docker-preparation -- [--out <dir>] [--skip-real-docker]
 *
 * Needs the Lambda Node.js image and `unzip` for the runtime checks. Contacts no AWS service or registry. `--out` must
 * be new or empty; projects, logs and the report stay there, apart from the large scenarios' data and build output.
 */
import type { LambdaFunction } from '@stacktape/config/functions';
import type { WorkerService } from '@stacktape/config/worker-services';
import { createCipheriv, createHash, randomBytes } from 'node:crypto';
import { chmod, mkdir, readdir, readFile, rm, stat, truncate, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import yargsParser from 'yargs-parser';
import {
  claimOutputDirectory,
  createSourceTracker,
  describeSourceIdentity,
  getHostEnvironment,
  getLoadAverage
} from '../perf/measurement-context';
import type { DockerPreparationRequest, DockerPreparationResult } from './docker-preparation-worker';
import { writeInstallMarker } from './split-project-fixture';
import {
  ensureLambdaImage,
  extractZip,
  invokeInLambdaRuntime,
  listExtractedEntries,
  listLeftoverContainers
} from './lambda-runtime';

const CLI_ROOT = resolve(import.meta.dir, '..', '..');
const REPO_ROOT = resolve(CLI_ROOT, '..', '..');
const WORKER = join(import.meta.dir, 'docker-preparation-worker.ts');

/** The binfmt installer, pinned by the digest of its multi-platform image index (verified read-only, 2026-09-24). */
const PINNED_BINFMT_IMAGE = 'tonistiigi/binfmt@sha256:400a4873b838d1b89194d982c45e5fb3cda4593fbfd7e08a02e76b03b21166f0';

const HOST_PLATFORMS = 'linux/amd64, linux/amd64/v2, linux/amd64/v3';
const ALL_PLATFORMS = `${HOST_PLATFORMS}, linux/arm64`;

/** Long enough for any scenario; a stuck scenario must end well before its own, shorter deadline. */
const DEFAULT_DEADLINE_MS = 120_000;
const STUCK_DAEMON_DEADLINE_MS = 45_000;

type DockerState = {
  daemon: 'running' | 'unreachable' | 'stuck';
  /** What `docker buildx inspect` reports; null when buildx itself fails. */
  platforms: string | null;
  /** How long `docker buildx inspect --bootstrap` takes, as starting a docker-container builder does. */
  inspectSeconds?: number;
  /** Whether `docker buildx ls` lists `stacktape-builder`. */
  cacheBuilderExists?: boolean;
};

type Docker =
  | { kind: 'stand-in'; state: DockerState }
  | { kind: 'absent' }
  | { kind: 'real'; realDocker: string; imagePrefix: string };

type Scenario = {
  name: string;
  command: DockerPreparationRequest['command'];
  docker: Docker;
  resources: DockerPreparationRequest['resources'];
  /** The project's files beside the common ones; `native` adds an installed package with a native build. */
  files: Record<string, string>;
  native?: boolean;
  disableLayerOptimization?: boolean;
  /** Zip the shared layers as a deployment does, so they can be compared, measured and run. */
  zipSharedLayers?: boolean;
  /**
   * Deploys the project once per entry, in order, against one image registry (see `docker-preparation-worker.ts`); the
   * command is `deploy`. An entry's files are written before it runs; its resources default to the scenario's.
   */
  deployments?: { files?: Record<string, string>; resources?: DockerPreparationRequest['resources'] }[];
  /** `deploymentConfig.previousVersionsToKeep` for the deployments. */
  previousVersionsToKeep?: number;
  /** Writes what the scenario needs besides text files: large or sparse data. */
  setup?: (project: string) => Promise<void>;
  /** Project paths removed once the scenario's checks have run: bulky build output and data. */
  removeAfterChecks?: string[];
  deadlineMs?: number;
  check: (run: ScenarioRun) => string | void | Promise<string | void>;
};

type DockerRecord = {
  decision: 'answered' | 'refused' | 'forwarded';
  exitCode: number | null;
  reason: string;
  args: string[];
};

type Span = { name: string; start: number; end: number | null; detail?: Record<string, unknown> };

/** One run of the worker: the whole scenario, or one of its deployments. */
type WorkerRun = {
  exitCode: number | null;
  timedOut: boolean;
  wallMs: number;
  result: DockerPreparationResult | null;
  dockerOperations: (DockerRecord & { operation: string; platform: string | null })[];
  /** The CLI's own timing of its first Docker subprocess, in ms since the worker's time origin. */
  firstDockerOperationMs: number | null;
  packagingPaths: Record<string, unknown> | null;
  dockerSpans: Span[];
  /** Stand-in processes still alive when the worker had exited, and killed by the acceptance. */
  leftoverProcesses: string[];
  outputSha256: string;
};

/** A scenario's run; for a deployment series, its last deployment, with every deployment's run in `deployments`. */
type ScenarioRun = WorkerRun & {
  name: string;
  command: string;
  docker: string;
  deployments?: WorkerRun[];
  fixtureSha256: string;
  dockerExecutableSha256: string | null;
  directory: string;
};

const results: { check: string; ok: boolean; detail?: string }[] = [];

const check = async (name: string, body: () => string | void | Promise<string | void>) => {
  try {
    const detail = await body();
    results.push({ check: name, ok: true, ...(detail ? { detail } : {}) });
    console.info(`ok      ${name}${detail ? ` — ${detail}` : ''}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    results.push({ check: name, ok: false, detail });
    console.error(`FAILED  ${name}\n        ${detail.split('\n').join('\n        ')}`);
  }
};

const expect = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');

const file = async (path: string, contents: string, mode = 0o644) => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents);
  await chmod(path, mode);
};

/** SHA-256 over every file's relative path and bytes, in code-unit order. */
const hashTree = async (root: string) => {
  const entries = (await readdir(root, { recursive: true, withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name))
    .toSorted((left, right) => (left < right ? -1 : left > right ? 1 : 0));
  const hash = createHash('sha256');
  for (const path of entries) {
    hash.update(`${relative(root, path)}\0`);
    hash.update(await readFile(path));
    hash.update('\0');
  }
  return hash.digest('hex');
};

const quote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;

/** Shell functions both Docker executables use to append one JSON line per command to the log. */
const RECORD_FUNCTIONS = String.raw`json() {
  printf '"%s"' "$(printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g')"
}
record() {
  decision=$1; code=$2; reason=$3; shift 3
  line="{\"decision\":\"$decision\",\"exitCode\":$code,\"reason\":$(json "$reason"),\"args\":["
  separator=
  for argument in "$@"; do
    line="$line$separator$(json "$argument")"
    separator=,
  done
  printf '%s]}\n' "$line" >> "$log"
}
refuse() {
  code=$1; reason=$2; shift 2
  record refused "$code" "$reason" "$@"
  printf 'The Docker preparation acceptance refused docker %s: %s.\n' "$1" "$reason" >&2
  exit "$code"
}`;

/**
 * A `docker` that answers the way a daemon in `state` would, for the commands packaging sends, and refuses the rest.
 * A dependency build's local output is `installDirectory/node_modules`, as the real build would produce.
 */
const renderStandIn = ({
  logPath,
  stateDirectory,
  state,
  installDirectory
}: {
  logPath: string;
  stateDirectory: string;
  state: DockerState;
  installDirectory: string;
}) => `#!/bin/sh
# Generated by docker-preparation-acceptance.ts for one scenario. Never runs Docker.
PATH=/usr/bin:/bin
log=${quote(logPath)}
state=${quote(stateDirectory)}
daemon=${state.daemon}
platforms=${quote(state.platforms ?? '')}
inspect_seconds=${state.inspectSeconds ?? 0}
cache_builder=${state.cacheBuilderExists ? 'yes' : 'no'}
install=${quote(installDirectory)}
registry="$state/registry"
${RECORD_FUNCTIONS}
${String.raw`
if [ "$daemon" = unreachable ]; then
  record answered 1 'daemon unreachable' "$@"
  echo 'Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?' >&2
  exit 1
fi
if [ "$daemon" = stuck ]; then
  echo "$$" >> "$state/pids"
  record answered null 'daemon stuck' "$@"
  exec sleep 120
fi

platform=
previous=
for argument in "$@"; do
  [ "$previous" = --platform ] && platform=$argument
  previous=$argument
done
# A build for a platform the builder does not report fails when its first step runs.
require_platform() {
  [ -z "$platform" ] && return 0
  case ", $platforms," in *", $platform,"*) return 0 ;; esac
  record answered 1 "no emulation for $platform" "$@"
  echo "exec /bin/sh: exec format error ($platform is not supported by this builder)" >&2
  exit 1
}
# The <repository>:<tag> of a --cache-from or --cache-to registry argument.
registry_ref() {
  flag=$1
  shift
  ref_previous=
  for argument in "$@"; do
    [ "$ref_previous" = "$flag" ] && printf '%s' "$argument" | sed -e 's/^type=registry,ref=//' -e 's/,.*$//'
    ref_previous=$argument
  done
}
# Points a tag at a new image in the registry file, as a push does: the image it pointed at stays, untagged. Builds and
# pushes run concurrently, so each update holds a lock.
publish() {
  until mkdir "$registry.lock" 2>/dev/null; do sleep 0.05; done
  pushes=$(($(cat "$state/pushes" 2>/dev/null || echo 0) + 1))
  echo "$pushes" > "$state/pushes"
  touch "$registry"
  replaced=$(awk -v tag="$1" '$1 == tag { print $2 }' "$registry")
  awk -v tag="$1" '$1 != tag' "$registry" > "$registry.next"
  [ -z "$replaced" ] || printf -- '- %s\n' "$replaced" >> "$registry.next"
  printf '%s sha256:%064d\n' "$1" "$pushes" >> "$registry.next"
  mv "$registry.next" "$registry"
  rmdir "$registry.lock"
}

case "$1" in
  info)
    record answered 0 'daemon running' "$@"
    echo 'Server Version: acceptance stand-in'
    exit 0 ;;
  buildx)
    case "$2" in
      inspect)
        if [ -z "$platforms" ]; then
          record answered 1 'buildx broken' "$@"
          echo 'ERROR: buildx component is missing or broken' >&2
          exit 1
        fi
        record answered 0 'builder platforms' "$@"
        [ "$inspect_seconds" = 0 ] || sleep "$inspect_seconds"
        printf 'Name:   default\nDriver: docker\n\nNodes:\nName:      default\nPlatforms: %s\n' "$platforms"
        exit 0 ;;
      ls)
        record answered 0 'builder list' "$@"
        echo 'NAME/NODE DRIVER/ENDPOINT STATUS BUILDKIT PLATFORMS'
        [ "$cache_builder" = yes ] && echo 'stacktape-builder docker-container running v0.32.2'
        echo 'default* docker running v0.32.2'
        exit 0 ;;
      build)
        if [ "$cache_builder" != yes ]; then
          record answered 1 'no cache builder' "$@"
          echo 'ERROR: no builder "stacktape-builder" found' >&2
          exit 1
        fi
        if [ ! -f "$state/logged-in" ]; then
          record answered 1 'registry cache without login' "$@"
          echo 'ERROR: failed to solve: failed to fetch cache: unexpected status: 403 Forbidden' >&2
          exit 1
        fi
        require_platform "$@"
        cache=none
        cache_from=$(registry_ref --cache-from "$@")
        if [ -n "$cache_from" ]; then
          cache_tag=$(printf '%s' "$cache_from" | sed 's/.*://')
          if grep -q "^$cache_tag " "$registry" 2>/dev/null; then cache=found; else cache=missing; fi
        fi
        cache_to=$(registry_ref --cache-to "$@")
        [ -z "$cache_to" ] || publish "$(printf '%s' "$cache_to" | sed 's/.*://')"
        record answered 0 "image built with the registry cache ($cache)" "$@"
        exit 0 ;;
    esac
    refuse 1 'builder change' "$@" ;;
  build)
    require_platform "$@"
    record answered 0 'image built' "$@"
    exit 0 ;;
  image)
    case "$2" in
      build)
        require_platform "$@"
        destination=
        for argument in "$@"; do
          case "$argument" in type=local,dest=*) destination=$(printf '%s' "$argument" | sed 's/^type=local,dest=//') ;; esac
        done
        [ -n "$destination" ] || refuse 1 'an image build without local output' "$@"
        record answered 0 'dependency build' "$@"
        mkdir -p "$destination" && cp -a "$install/node_modules" "$destination/"
        exit $? ;;
      inspect)
        record answered 0 'image details' "$@"
        echo '[{"Id":"sha256:5eed000000000000000000000000000000000000000000000000000000000000","Size":1048576,"Created":"2026-09-24T00:00:00Z"}]'
        exit 0 ;;
    esac
    refuse 1 'image change' "$@" ;;
  tag)
    record answered 0 'image tagged' "$@"
    exit 0 ;;
  push)
    publish "$(printf '%s' "$2" | sed 's/.*://')"
    record answered 0 'image pushed' "$@"
    exit 0 ;;
  login)
    cat > /dev/null
    : > "$state/logged-in"
    record answered 0 'registry login' "$@"
    exit 0 ;;
  run)
    reason=container
    for argument in "$@"; do
      case "$argument" in --privileged* | *tonistiigi/binfmt*) reason='privileged binfmt installation' ;; esac
    done
    refuse 125 "$reason" "$@" ;;
esac
refuse 1 'not part of this scenario' "$@"
`}`;

/**
 * A `docker` that forwards to the real Docker CLI only what a host-native image build of this run's own tag needs, and
 * refuses everything else. `DOCKER_CONFIG` is an owned empty directory, so the user's credentials and builder
 * selection are not used.
 */
const renderRealDockerGuard = ({
  logPath,
  realDocker,
  dockerConfig,
  imagePrefix
}: {
  logPath: string;
  realDocker: string;
  dockerConfig: string;
  imagePrefix: string;
}) => `#!/bin/sh
# Generated by docker-preparation-acceptance.ts for one scenario.
PATH=/usr/bin:/bin
log=${quote(logPath)}
real=${quote(realDocker)}
prefix=${quote(imagePrefix)}
DOCKER_CONFIG=${quote(dockerConfig)}
export DOCKER_CONFIG
${RECORD_FUNCTIONS}
${String.raw`
forward() {
  "$real" "$@"
  code=$?
  record forwarded "$code" 'real Docker' "$@"
  exit "$code"
}

case "$1" in
  info) forward "$@" ;;
  buildx)
    if [ "$2" = inspect ] && { [ "$#" -eq 2 ] || { [ "$#" -eq 3 ] && [ "$3" = --bootstrap ]; }; }; then
      forward "$@"
    fi
    refuse 1 'builder change' "$@" ;;
  build)
    platform=
    tag=
    unsafe=
    previous=
    for argument in "$@"; do
      case "$previous" in --platform) platform=$argument ;; -t) tag=$argument ;; esac
      case "$argument" in --builder* | --push | --output* | -o | --cache-from* | --cache-to* | --load | --pull*) unsafe=$argument ;; esac
      previous=$argument
    done
    if [ "$platform" = linux/amd64 ] && [ -z "$unsafe" ]; then
      case "$tag" in "$prefix"*) forward "$@" ;; esac
    fi
    refuse 1 'a build this scenario does not own' "$@" ;;
  image)
    if [ "$2" = inspect ] && [ "$#" -eq 3 ]; then
      case "$3" in "$prefix"*) forward "$@" ;; esac
    fi
    refuse 1 'an image this scenario does not own' "$@" ;;
  run) refuse 125 'container' "$@" ;;
esac
refuse 1 'not part of this scenario' "$@"
`}`;

// ---------------------------------------------------------------------------------------------------------------------
// Fixture projects

const lambda = (entryfilePath: string): LambdaFunction => ({
  type: 'function',
  properties: { packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath } } }
});

const customArtifact = (packagePath: string): LambdaFunction => ({
  type: 'function',
  properties: { packaging: { type: 'custom-artifact', properties: { packagePath, handler: 'index.js:handler' } } }
});

const workerService = (architecture: 'x86_64' | 'arm64'): WorkerService => ({
  type: 'worker-service',
  properties: {
    packaging: { type: 'custom-dockerfile', properties: { buildContextPath: './image', dockerfilePath: 'Dockerfile' } },
    resources: { cpu: 0.25, memory: 512, architecture }
  }
});

const HANDLER = 'export const handler = async () => ({ ok: true });\n';
const SHARED_HANDLER = (name: string) =>
  `import { catalog } from './shared';\n\nexport const handler = async () => ({ function: '${name}', catalog: catalog.length });\n`;
const SHARED_MODULE = `export const catalog = ${JSON.stringify(Array.from({ length: 64 }, (_, index) => `shared entry ${index}`))};\n`;
const NATIVE_HANDLER =
  "import fixtureNative from 'fixture-native';\n\nexport const handler = async () => ({ native: fixtureNative.name });\n";
const IMAGE_FILES = {
  'image/Dockerfile': 'FROM scratch\nCOPY hello.txt /hello.txt\n',
  'image/hello.txt': 'Docker preparation acceptance\n'
};
const ARTIFACT_FILES = { 'artifact/index.js': 'exports.handler = async () => ({ ok: true });\n' };

/** The native package as npm installs it: a build marker makes the CLI install it in Docker for the target platform. */
const writeNativePackage = async (nodeModules: string) => {
  await file(
    join(nodeModules, 'fixture-native', 'package.json'),
    `${JSON.stringify({ name: 'fixture-native', version: '1.0.0', main: 'index.js', gypfile: true })}\n`
  );
  await file(join(nodeModules, 'fixture-native', 'index.js'), "module.exports = { name: 'fixture-native' };\n");
};

/**
 * A standalone project whose dependencies are already installed: the CLI's install marker matches its lockfile and
 * manifest, so no package manager runs. Returns the directory a Docker dependency build copies its output from.
 */
const writeProject = async ({
  root,
  files,
  native
}: {
  root: string;
  files: Record<string, string>;
  native: boolean;
}) => {
  const project = join(root, 'project');
  const dependencies = native ? { 'fixture-native': '1.0.0' } : {};
  // `workspaces` makes this directory its own project root, as a standalone project is.
  const manifest = `${JSON.stringify({ name: 'docker-preparation-fixture', version: '1.0.0', private: true, type: 'module', workspaces: [], dependencies }, null, 2)}\n`;
  await file(join(project, 'package.json'), manifest);
  const lockfile = `${JSON.stringify(
    {
      name: 'docker-preparation-fixture',
      version: '1.0.0',
      lockfileVersion: 3,
      requires: true,
      packages: {
        '': { name: 'docker-preparation-fixture', version: '1.0.0', dependencies },
        ...(native ? { 'node_modules/fixture-native': { version: '1.0.0', hasInstallScript: true } } : {})
      }
    },
    null,
    2
  )}\n`;
  await file(join(project, 'package-lock.json'), lockfile);
  await writeInstallMarker(project);
  if (native) await writeNativePackage(join(project, 'node_modules'));
  for (const [path, contents] of Object.entries(files)) {
    await file(join(project, path), contents);
  }
  const installDirectory = join(root, 'docker-install');
  await writeNativePackage(join(installDirectory, 'node_modules'));
  return { project, installDirectory };
};

// ---------------------------------------------------------------------------------------------------------------------
// Running one scenario

const operationOf = (args: string[]) =>
  ['buildx', 'image', 'container', 'builder'].includes(args[0] ?? '') ? `${args[0]} ${args[1] ?? ''}`.trim() : args[0];

const platformOf = (args: string[]) => {
  const index = args.indexOf('--platform');
  return index === -1 ? null : (args[index + 1] ?? null);
};

const readJson = async <Value>(path: string): Promise<Value | null> =>
  JSON.parse(await readFile(path, 'utf8').catch(() => 'null')) as Value | null;

const isAlive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

/**
 * Runs the worker once in `project` and reads what it and the Docker stand-in recorded. A deployment series runs it once
 * per deployment, in a fresh invocation, with `label` prefixing that run's files.
 */
const runWorker = async ({
  name,
  label,
  directory,
  project,
  dockerDirectory,
  stateDirectory,
  logPath,
  request,
  deadlineMs
}: {
  name: string;
  label: string;
  directory: string;
  project: string;
  dockerDirectory: string;
  stateDirectory: string;
  logPath: string;
  request: DockerPreparationRequest;
  deadlineMs: number;
}): Promise<WorkerRun> => {
  await writeFile(logPath, '');
  const requestPath = join(directory, `${label}request.json`);
  await writeFile(requestPath, `${JSON.stringify(request, null, 2)}\n`);
  const home = join(directory, 'home');
  await mkdir(home, { recursive: true });
  const timingsPath = join(directory, `${label}timings.json`);
  const command = [process.execPath, '--preload', join(CLI_ROOT, 'scripts', 'test-preload.ts'), WORKER, requestPath];
  const started = performance.now();
  const child = Bun.spawn(command, {
    cwd: project,
    env: {
      // An owned home keeps the user's Stacktape state out of reach; Bun's transpiler cache would fill it on every run.
      HOME: home,
      BUN_RUNTIME_TRANSPILER_CACHE_PATH: '0',
      PATH: dockerDirectory,
      STP_INVOCATION_ID: label ? `docker-preparation-${label.slice(0, -1)}` : 'docker-preparation',
      STP_TIMINGS_FILE: timingsPath
    },
    stdout: 'pipe',
    stderr: 'pipe'
  });
  let timedOut = false;
  const deadline = setTimeout(() => {
    timedOut = true;
    child.kill('SIGKILL');
  }, deadlineMs);
  const [stdout, stderr] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text()]);
  const exitCode = await child.exited;
  clearTimeout(deadline);
  const wallMs = Math.round((performance.now() - started) * 10) / 10;
  const output = `${stdout}${stderr}`;
  await writeFile(join(directory, `${label}output.log`), output);

  // A stuck stand-in records its process; any still alive now outlived the worker.
  const leftoverProcesses: string[] = [];
  const pids = (await readFile(join(stateDirectory, 'pids'), 'utf8').catch(() => ''))
    .split('\n')
    .filter(Boolean)
    .map(Number);
  for (const pid of pids) {
    if (!isAlive(pid)) continue;
    leftoverProcesses.push(String(pid));
    process.kill(pid, 'SIGKILL');
  }

  const dockerOperations = (await readFile(logPath, 'utf8'))
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as DockerRecord)
    .map((record) => ({ ...record, operation: operationOf(record.args), platform: platformOf(record.args) }));
  const timings = await readJson<{ spans: Span[] }>(timingsPath);
  const spans = timings?.spans ?? [];
  const dockerSubprocesses = spans.filter(
    ({ name: spanName, detail }) => spanName === 'subprocess' && detail?.executable === 'docker'
  );
  console.info(
    `\n${name}${label ? ` (${label.slice(0, -1)})` : ''}: exit ${exitCode}${timedOut ? ' (deadline)' : ''} in ${wallMs} ms; Docker: ${
      dockerOperations
        .map(({ operation, decision }) => `${operation}${decision === 'refused' ? ' (refused)' : ''}`)
        .join(', ') || 'none'
    }`
  );
  return {
    exitCode,
    timedOut,
    wallMs,
    result: await readJson<DockerPreparationResult>(request.resultPath),
    dockerOperations,
    firstDockerOperationMs: dockerSubprocesses.length
      ? Math.min(...dockerSubprocesses.map(({ start }) => start))
      : null,
    packagingPaths:
      (spans.find(({ name: spanName }) => spanName === 'packaging:paths')?.detail as Record<string, unknown>) ?? null,
    dockerSpans: spans.filter(({ name: spanName }) => spanName.startsWith('docker:')),
    leftoverProcesses,
    outputSha256: sha256(output)
  };
};

const runScenario = async (scenario: Scenario, outDirectory: string): Promise<ScenarioRun> => {
  const directory = join(outDirectory, 'scenarios', scenario.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase());
  const { project, installDirectory } = await writeProject({
    root: directory,
    files: scenario.files,
    native: scenario.native ?? false
  });
  await scenario.setup?.(project);
  const fixtureSha256 = await hashTree(project);
  const dockerDirectory = join(directory, 'docker-bin');
  const stateDirectory = join(directory, 'docker-state');
  const logPath = join(directory, 'docker.log');
  await mkdir(dockerDirectory, { recursive: true });
  await mkdir(stateDirectory, { recursive: true });
  let dockerScript: string | null = null;
  if (scenario.docker.kind === 'stand-in') {
    dockerScript = renderStandIn({ logPath, stateDirectory, state: scenario.docker.state, installDirectory });
  } else if (scenario.docker.kind === 'real') {
    const dockerConfig = join(directory, 'docker-config');
    await mkdir(dockerConfig, { recursive: true });
    dockerScript = renderRealDockerGuard({
      logPath,
      realDocker: scenario.docker.realDocker,
      dockerConfig,
      imagePrefix: scenario.docker.imagePrefix
    });
  }
  if (dockerScript) await file(join(dockerDirectory, 'docker'), dockerScript, 0o755);

  const runs: WorkerRun[] = [];
  for (const [index, deployment] of (scenario.deployments ?? [undefined]).entries()) {
    const label = deployment ? `deployment-${index + 1}.` : '';
    for (const [path, contents] of Object.entries(deployment?.files ?? {})) {
      await file(join(project, path), contents);
    }
    const request: DockerPreparationRequest = {
      command: scenario.command,
      resources: deployment?.resources ?? scenario.resources,
      resultPath: join(directory, `${label}result.json`),
      ...(scenario.disableLayerOptimization && { disableLayerOptimization: true }),
      ...(scenario.zipSharedLayers && { zipSharedLayers: true }),
      ...(deployment && {
        deployment: {
          registryPath: join(stateDirectory, 'registry'),
          lastVersion: `v${String(index + 1).padStart(6, '0')}`,
          previousVersionsToKeep: scenario.previousVersionsToKeep ?? 1
        }
      })
    };
    runs.push(
      await runWorker({
        name: scenario.name,
        label,
        directory,
        project,
        dockerDirectory,
        stateDirectory,
        logPath,
        request,
        deadlineMs: scenario.deadlineMs ?? DEFAULT_DEADLINE_MS
      })
    );
  }
  const run: ScenarioRun = {
    name: scenario.name,
    command: scenario.command,
    docker:
      scenario.docker.kind === 'stand-in'
        ? JSON.stringify(scenario.docker.state)
        : scenario.docker.kind === 'real'
          ? 'real Docker behind a guard'
          : 'none on PATH',
    ...runs.at(-1)!,
    leftoverProcesses: runs.flatMap(({ leftoverProcesses }) => leftoverProcesses),
    ...(scenario.deployments && { deployments: runs }),
    fixtureSha256,
    dockerExecutableSha256: dockerScript ? sha256(dockerScript) : null,
    directory
  };
  await writeFile(join(directory, 'run.json'), `${JSON.stringify(run, null, 2)}\n`);
  return run;
};

// ---------------------------------------------------------------------------------------------------------------------
// Expectations

const operations = (run: ScenarioRun) => run.dockerOperations.map(({ operation }) => operation);

const expectOperations = (run: ScenarioRun, expected: string[]) =>
  expect(
    JSON.stringify(operations(run)) === JSON.stringify(expected),
    `Docker was asked ${JSON.stringify(operations(run))}, expected ${JSON.stringify(expected)}.`
  );

const expectPackaged = (run: ScenarioRun, jobNames: string[]) => {
  expect(!run.timedOut, `The run did not finish before its deadline (${run.wallMs} ms).`);
  expect(
    run.exitCode === 0 && run.result?.outcome === 'packaged',
    `Packaging failed (exit ${run.exitCode}): ${run.result?.error?.code ?? ''} ${run.result?.error?.message ?? 'no result'}`
  );
  const packaged = run.result!.jobs.map(({ jobName }) => jobName);
  for (const jobName of jobNames) expect(packaged.includes(jobName), `${jobName} was not packaged: ${packaged}.`);
};

const expectFailure = (run: ScenarioRun, code: string) => {
  expect(!run.timedOut, `The run did not finish before its deadline (${run.wallMs} ms).`);
  expect(
    run.result?.outcome === 'failed' && run.result.error?.code === code,
    `Expected packaging to fail with ${code}, got ${run.result?.outcome ?? 'no result'} ${run.result?.error?.code ?? ''}: ${run.result?.error?.message ?? ''}`
  );
};

const expectPaths = (run: ScenarioRun, expected: Record<string, unknown>) => {
  for (const [key, value] of Object.entries(expected)) {
    expect(
      run.packagingPaths?.[key] === value,
      `packaging:paths ${JSON.stringify(run.packagingPaths)} does not have ${key} ${value}.`
    );
  }
};

const describePaths = (run: ScenarioRun) =>
  `split ${run.packagingPaths?.split}, per function ${run.packagingPaths?.perFunction}`;

const SINGLE_AND_ARTIFACT = {
  resources: { single: lambda('./src/single.ts'), artifact: customArtifact('./artifact') },
  files: { 'src/single.ts': HANDLER, ...ARTIFACT_FILES }
};

const SPLIT_PAIR = {
  resources: { alpha: lambda('./src/alpha.ts'), beta: lambda('./src/beta.ts') },
  files: {
    'src/shared.ts': SHARED_MODULE,
    'src/alpha.ts': SHARED_HANDLER('alpha'),
    'src/beta.ts': SHARED_HANDLER('beta')
  }
};

const NATIVE_SINGLE = {
  resources: { native: lambda('./src/native.ts') },
  files: { 'src/native.ts': NATIVE_HANDLER },
  native: true
};

const pureJsWithoutDocker = (state: DockerState, label: string): Scenario => ({
  name: `pure JS and custom artifact, ${label}`,
  command: 'package',
  docker: { kind: 'stand-in', state },
  ...SINGLE_AND_ARTIFACT,
  check: (run) => {
    expectPackaged(run, ['single', 'artifact']);
    expectOperations(run, []);
    expectPaths(run, { split: 0, perFunction: 1 });
    return `packaged in ${run.wallMs} ms without Docker; the single function per function`;
  }
});

const SPLIT_NATIVE = {
  resources: SPLIT_PAIR.resources,
  files: { ...SPLIT_PAIR.files, 'src/alpha.ts': `${NATIVE_HANDLER}\nexport { catalog } from './shared';\n` },
  native: true
};

/** A split group whose shared analysis finds a native dependency needs Docker, and must fail before any artifact. */
const splitNativeWithoutDocker = (docker: Docker, label: string): Scenario => ({
  name: `split with a native dependency, ${label}`,
  command: 'package',
  docker,
  ...SPLIT_NATIVE,
  check: (run) => {
    expectFailure(run, 'PACKAGING_FAILED');
    const { message } = run.result!.error!;
    expect(
      message.includes('Docker') && message.includes('fixture-native') && message.includes('alpha'),
      `The error does not name Docker, the dependency and its function: ${message}`
    );
    expect(
      run.result!.jobs.length === 0,
      `Artifacts were recorded: ${run.result!.jobs.map(({ jobName }) => jobName)}.`
    );
    expectOperations(run, docker.kind === 'absent' ? [] : ['info']);
    return `failed before any artifact: ${message}`;
  }
});

/** Split pure JavaScript with a shared layer, zipped as a deployment zips it, with Docker ready and not installed. */
const SPLIT_READY_WITH_LAYERS = 'split pure JS with its layer zipped, all platforms';
const SPLIT_ABSENT_WITH_LAYERS = 'split pure JS with its layer zipped, Docker not installed';

// ---------------------------------------------------------------------------------------------------------------------
// Split artifacts across Docker states

type ZipDescription = { zipPath: string; bytes: number; entries: string[] };

/** Each function ZIP and zipped shared layer of a run, extracted with `unzip`, and their total size: the upload. */
const describeSplitArtifacts = async (run: ScenarioRun) => {
  const zips: [string, string | null][] = [
    ...run.result!.jobs.map(({ jobName, artifactPath }): [string, string | null] => [
      `function ${jobName}`,
      artifactPath
    ]),
    ...run.result!.sharedLayers.map(({ layerNumber, zipPath }): [string, string | null] => [
      `layer ${layerNumber}`,
      zipPath
    ])
  ];
  const artifacts: Record<string, ZipDescription> = {};
  for (const [key, zipPath] of zips) {
    expect(zipPath, `${run.name}: ${key} has no ZIP.`);
    const directory = await extractZip(zipPath!);
    try {
      artifacts[key] = {
        zipPath: zipPath!,
        bytes: (await stat(zipPath!)).size,
        entries: await listExtractedEntries(directory)
      };
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
  return { uploadBytes: Object.values(artifacts).reduce((sum, { bytes }) => sum + bytes, 0), artifacts };
};

/**
 * Runs each function in `expected` from its extracted ZIP in the Lambda image, with the run's extracted shared layers at
 * /opt, and requires it to return its expected value.
 */
const invokeFunctions = async (run: ScenarioRun, expected: Record<string, unknown>) => {
  const layerZips = run.result!.sharedLayers.map(({ zipPath }) => zipPath);
  const layerDirectory = layerZips.length > 0 ? await extractZip(layerZips) : undefined;
  const invocations: Record<string, string> = {};
  try {
    for (const [jobName, expectedValue] of Object.entries(expected)) {
      const artifactPath = run.result!.jobs.find((job) => job.jobName === jobName)?.artifactPath;
      expect(artifactPath, `${jobName} has no ZIP.`);
      const functionDirectory = await extractZip(artifactPath!);
      try {
        const { status, body } = await invokeInLambdaRuntime({
          functionDirectory,
          layerDirectory,
          handler: 'index.handler'
        });
        expect(
          status === 200 && isDeepStrictEqual(JSON.parse(body), expectedValue),
          `${jobName} returned ${status} ${body.slice(0, 300)}.`
        );
        invocations[jobName] = body;
      } finally {
        await rm(functionDirectory, { recursive: true, force: true });
      }
    }
  } finally {
    if (layerDirectory) await rm(layerDirectory, { recursive: true, force: true });
  }
  return invocations;
};

const compareSplitArtifacts = async (ready: ScenarioRun, absent: ScenarioRun) => {
  const readyArtifacts = await describeSplitArtifacts(ready);
  const absentArtifacts = await describeSplitArtifacts(absent);
  const keys = (artifacts: typeof readyArtifacts) => Object.keys(artifacts.artifacts).toSorted();
  expect(
    JSON.stringify(keys(absentArtifacts)) === JSON.stringify(keys(readyArtifacts)),
    `Docker not installed produced ${keys(absentArtifacts)}; Docker ready produced ${keys(readyArtifacts)}.`
  );
  for (const key of keys(readyArtifacts)) {
    expect(
      JSON.stringify(absentArtifacts.artifacts[key]!.entries) ===
        JSON.stringify(readyArtifacts.artifacts[key]!.entries),
      `${key} differs between Docker ready and Docker not installed.`
    );
  }
  const invocations = await invokeFunctions(absent, {
    alpha: { function: 'alpha', catalog: 64 },
    beta: { function: 'beta', catalog: 64 }
  });
  const leftovers = listLeftoverContainers();
  expect(leftovers.length === 0, `Lambda containers were left: ${leftovers}.`);
  return { ready: readyArtifacts, absent: absentArtifacts, invocations };
};

// ---------------------------------------------------------------------------------------------------------------------
// Registry cache across deployments

const REGISTRY_CACHE_SERIES = 'registry cache across deployments';

const valueAfter = (args: string[], flag: string) => {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
};

/** The tag of a pushed image or of a `--cache-to` registry argument: `type=registry,ref=<repository>:<tag>,…`. */
const tagOf = (reference: string) =>
  reference
    .replace(/^type=registry,ref=/, '')
    .split(',')[0]!
    .split(':')
    .at(-1)!;

const imageBuilds = (deployment: WorkerRun) =>
  deployment.dockerOperations.filter(({ operation }) => operation === 'buildx build');

/** The registry once a deployment finished, one `<tag> <digest>` line per image. */
const registryAfter = (deployment: WorkerRun) => deployment.result?.deployment?.registry ?? [];

const registryTags = (deployment: WorkerRun) =>
  new Set(
    registryAfter(deployment)
      .map((line) => line.split(' ')[0]!)
      .filter((tag) => tag !== '-')
  );

// ---------------------------------------------------------------------------------------------------------------------
// Lambda size limits

/** Over the 50 MB Lambda limit for direct uploads, which does not apply to code deployed from S3. */
const LARGE_ZIP_BYTES = 52 * 1024 * 1024;
const LARGE_ZIPS = 'Lambda ZIPs over 50 MB, Docker not installed';
const LARGE_DATA_FILES = { big: 'data/big.bin', alpha: 'src/data/alpha.bin', bigartifact: 'big-artifact/payload.bin' };

/** Deterministic bytes no ZIP can compress: an AES-CTR keystream seeded by the function's name. */
const incompressibleData = (name: string) => {
  const cipher = createCipheriv('aes-256-ctr', createHash('sha256').update(name).digest(), Buffer.alloc(16));
  return Buffer.concat([cipher.update(Buffer.alloc(LARGE_ZIP_BYTES)), cipher.final()]);
};

const DESCRIBE_DATA = "createHash('sha256').update(data).digest('hex')";
const BIG_HANDLER = [
  "import { createHash } from 'node:crypto';",
  "import { readFileSync } from 'node:fs';",
  "import { join } from 'node:path';",
  '',
  'export const handler = async () => {',
  "  const data = readFileSync(join(process.env.LAMBDA_TASK_ROOT ?? '.', 'data', 'big.bin'));",
  `  return { function: 'big', bytes: data.length, sha256: ${DESCRIBE_DATA} };`,
  '};',
  ''
].join('\n');
const LARGE_ALPHA_HANDLER = [
  "import { createHash } from 'node:crypto';",
  "import { readFileSync } from 'node:fs';",
  "import dataPath from './data/alpha.bin';",
  "import { catalog } from './shared';",
  '',
  'export const handler = async () => {',
  '  const data = readFileSync(dataPath);',
  `  return { function: 'alpha', catalog: catalog.length, bytes: data.length, sha256: ${DESCRIBE_DATA} };`,
  '};',
  ''
].join('\n');
const BIG_ARTIFACT_HANDLER = [
  "const { createHash } = require('node:crypto');",
  "const { readFileSync } = require('node:fs');",
  "const { join } = require('node:path');",
  '',
  'exports.handler = async () => {',
  "  const data = readFileSync(join(__dirname, 'payload.bin'));",
  `  return { function: 'bigartifact', bytes: data.length, sha256: ${DESCRIBE_DATA} };`,
  '};',
  ''
].join('\n');

const lambdaWith = (
  entryfilePath: string,
  properties: { includeFiles?: string[]; languageSpecificConfig?: { disableSourceMaps: boolean } }
): LambdaFunction => ({
  type: 'function',
  properties: { packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath, ...properties } } }
});

/** The function's own package: a sparse file, so it takes no disk space until the build copies it. */
const HUGE_ASSET_BYTES = 215 * 1024 * 1024;
/** One shared module, which the split build puts into a layer (at most 50 MB each). */
const LARGE_SHARED_BYTES = 40 * 1024 * 1024;

const createScenarios = ({ realDocker }: { realDocker: string | null }): Scenario[] => {
  const scenarios: Scenario[] = [
    pureJsWithoutDocker({ daemon: 'running', platforms: null }, 'buildx broken'),
    pureJsWithoutDocker({ daemon: 'unreachable', platforms: null }, 'daemon unreachable'),
    {
      name: 'split pure JS, arm64 missing',
      command: 'package',
      docker: { kind: 'stand-in', state: { daemon: 'running', platforms: HOST_PLATFORMS } },
      ...SPLIT_PAIR,
      check: (run) => {
        expectPackaged(run, ['alpha', 'beta']);
        expectOperations(run, []);
        expectPaths(run, { split: 2, perFunction: 0 });
        return `${describePaths(run)}, without any Docker command`;
      }
    },
    {
      name: 'split pure JS, daemon unreachable',
      command: 'package',
      docker: { kind: 'stand-in', state: { daemon: 'unreachable', platforms: null } },
      ...SPLIT_PAIR,
      check: (run) => {
        expectPackaged(run, ['alpha', 'beta']);
        expectOperations(run, []);
        expectPaths(run, { split: 2, perFunction: 0 });
        return `${describePaths(run)}, without any Docker command`;
      }
    },
    {
      name: 'split pure JS, daemon stuck',
      command: 'package',
      docker: { kind: 'stand-in', state: { daemon: 'stuck', platforms: null } },
      ...SPLIT_PAIR,
      deadlineMs: STUCK_DAEMON_DEADLINE_MS,
      check: (run) => {
        expectPackaged(run, ['alpha', 'beta']);
        expectOperations(run, []);
        expectPaths(run, { split: 2, perFunction: 0 });
        expect(run.leftoverProcesses.length === 0, `A stand-in process outlived the CLI: ${run.leftoverProcesses}.`);
        return `${describePaths(run)} in ${run.wallMs} ms; the stuck daemon was never asked`;
      }
    },
    {
      name: SPLIT_READY_WITH_LAYERS,
      command: 'package',
      docker: { kind: 'stand-in', state: { daemon: 'running', platforms: ALL_PLATFORMS } },
      ...SPLIT_PAIR,
      zipSharedLayers: true,
      check: (run) => {
        expectPackaged(run, ['alpha', 'beta']);
        expectOperations(run, []);
        expectPaths(run, { split: 2, perFunction: 0 });
        expect(run.result!.sharedLayers.length > 0, 'The split build wrote no shared layer.');
        return `${describePaths(run)}, ${run.result!.sharedLayers.length} shared layer`;
      }
    },
    {
      name: SPLIT_ABSENT_WITH_LAYERS,
      command: 'package',
      docker: { kind: 'absent' },
      ...SPLIT_PAIR,
      zipSharedLayers: true,
      check: (run) => {
        expectPackaged(run, ['alpha', 'beta']);
        expectPaths(run, { split: 2, perFunction: 0 });
        expect(run.result!.sharedLayers.length > 0, 'The split build wrote no shared layer.');
        return `${describePaths(run)}, ${run.result!.sharedLayers.length} shared layer`;
      }
    },
    {
      name: 'split pure JS, layer optimization disabled, daemon unreachable',
      command: 'package',
      docker: { kind: 'stand-in', state: { daemon: 'unreachable', platforms: null } },
      ...SPLIT_PAIR,
      disableLayerOptimization: true,
      check: (run) => {
        expectPackaged(run, ['alpha', 'beta']);
        expectOperations(run, []);
        expectPaths(run, { split: 0, perFunction: 2 });
        return `${describePaths(run)}, without any Docker command`;
      }
    },
    {
      name: 'native dependency, host platform, arm64 missing',
      command: 'package',
      docker: { kind: 'stand-in', state: { daemon: 'running', platforms: HOST_PLATFORMS } },
      ...NATIVE_SINGLE,
      check: (run) => {
        expectPackaged(run, ['native']);
        expectOperations(run, ['buildx inspect', 'image build']);
        expect(run.dockerOperations[1]!.platform === 'linux/amd64', 'The dependency build was not for linux/amd64.');
        return 'one inspection, then the amd64 dependency build; no emulation installed';
      }
    },
    {
      name: 'native dependency, daemon unreachable',
      command: 'package',
      docker: { kind: 'stand-in', state: { daemon: 'unreachable', platforms: null } },
      ...NATIVE_SINGLE,
      check: (run) => {
        expectFailure(run, 'DOCKER_NOT_RUNNING');
        expect(!operations(run).includes('run'), 'Emulation was requested for an unreachable daemon.');
        return `failed with DOCKER_NOT_RUNNING after ${JSON.stringify(operations(run))}`;
      }
    },
    {
      name: 'native dependency, Docker not installed',
      command: 'package',
      docker: { kind: 'absent' },
      ...NATIVE_SINGLE,
      check: (run) => {
        expectFailure(run, 'DOCKER_NOT_INSTALLED');
        return 'failed with DOCKER_NOT_INSTALLED';
      }
    },
    {
      name: 'split with a native dependency, arm64 missing',
      command: 'package',
      docker: { kind: 'stand-in', state: { daemon: 'running', platforms: HOST_PLATFORMS } },
      ...SPLIT_NATIVE,
      check: (run) => {
        expectPackaged(run, ['alpha', 'beta']);
        expectPaths(run, { split: 2, perFunction: 0 });
        expectOperations(run, ['info', 'buildx inspect', 'image build']);
        expect(run.dockerOperations[2]!.platform === 'linux/amd64', 'The native layer was not built for linux/amd64.');
        return `${describePaths(run)}; the native layer's amd64 build was prepared by one inspection`;
      }
    },
    splitNativeWithoutDocker(
      { kind: 'stand-in', state: { daemon: 'unreachable', platforms: null } },
      'daemon unreachable'
    ),
    splitNativeWithoutDocker({ kind: 'absent' }, 'Docker not installed'),
    {
      name: 'two arm64 images, arm64 missing, slow builder start',
      command: 'package',
      docker: { kind: 'stand-in', state: { daemon: 'running', platforms: HOST_PLATFORMS, inspectSeconds: 1 } },
      resources: {
        imagesOne: workerService('arm64'),
        imagesTwo: workerService('arm64'),
        single: lambda('./src/single.ts')
      },
      files: { 'src/single.ts': HANDLER, ...IMAGE_FILES },
      check: (run) => {
        expectFailure(run, 'DOCKER_COMMAND_FAILED');
        expect(
          run.result!.error!.message.includes('acceptance refused docker run'),
          'The refusal did not reach the error.'
        );
        expectOperations(run, ['buildx inspect', 'run']);
        const install = run.dockerOperations[1]!;
        expect(install.decision === 'refused', 'The binfmt request was not refused.');
        expect(install.args.includes(PINNED_BINFMT_IMAGE), `The helper was not the pinned image: ${install.args}.`);
        const platformsArgument = install.args[install.args.indexOf('--install') + 1];
        expect(platformsArgument === 'linux/arm64', `The request installs ${platformsArgument}, not linux/arm64 only.`);
        expect(
          run.result!.jobs.some(({ jobName }) => jobName === 'single'),
          'The pure JS function was not packaged alongside.'
        );
        return 'one inspection and one refused request for linux/arm64 only, shared by both images; single packaged';
      }
    },
    {
      name: 'registry cache used by an image build',
      command: 'deploy',
      docker: {
        kind: 'stand-in',
        state: { daemon: 'running', platforms: ALL_PLATFORMS, cacheBuilderExists: true }
      },
      resources: { cached: workerService('x86_64'), single: lambda('./src/single.ts') },
      files: { 'src/single.ts': HANDLER, ...IMAGE_FILES },
      check: (run) => {
        expectPackaged(run, ['cached-service-container', 'single']);
        expectOperations(run, ['buildx inspect', 'buildx ls', 'login', 'buildx build', 'image inspect']);
        const build = run.dockerOperations[3]!;
        expect(
          build.args.includes('stacktape-builder') &&
            build.args.includes('--cache-from') &&
            build.platform === 'linux/amd64',
          `The image was not built with the registry cache: ${build.args}.`
        );
        expect(run.result!.ecrAuthorizations === 1, `ECR authorization ran ${run.result!.ecrAuthorizations} times.`);
        return 'builder check and ECR login once, just before the cached amd64 build';
      }
    },
    {
      name: 'registry cache unused',
      command: 'deploy',
      docker: {
        kind: 'stand-in',
        state: { daemon: 'running', platforms: ALL_PLATFORMS, cacheBuilderExists: true }
      },
      ...SINGLE_AND_ARTIFACT,
      check: (run) => {
        expectPackaged(run, ['single', 'artifact']);
        expectOperations(run, []);
        expect(run.result!.ecrAuthorizations === 0, `ECR authorization ran ${run.result!.ecrAuthorizations} times.`);
        return 'no Docker command and no ECR authorization';
      }
    },
    {
      name: REGISTRY_CACHE_SERIES,
      command: 'deploy',
      docker: { kind: 'stand-in', state: { daemon: 'running', platforms: HOST_PLATFORMS, cacheBuilderExists: true } },
      resources: { web: workerService('x86_64'), worker: workerService('x86_64') },
      files: IMAGE_FILES,
      previousVersionsToKeep: 1,
      deployments: [
        { files: { 'image/hello.txt': 'deployment 1\n' } },
        { files: { 'image/hello.txt': 'deployment 2\n' } },
        { files: { 'image/hello.txt': 'deployment 3\n' } },
        { resources: { web: workerService('x86_64') } }
      ],
      check: (run) => {
        const deployments = run.deployments ?? [];
        expect(deployments.length === 4, `${deployments.length} deployments ran.`);
        deployments.forEach((deployment, index) => {
          expect(
            deployment.exitCode === 0 && deployment.result?.outcome === 'packaged',
            `Deployment ${index + 1} failed: ${deployment.result?.error?.message ?? 'no result'}`
          );
          const pushes = deployment.dockerOperations.filter(({ operation }) => operation === 'push').length;
          expect(pushes === (index < 3 ? 2 : 0), `Deployment ${index + 1} pushed ${pushes} images.`);
        });
        return 'four deployments; the first three rebuilt and pushed both images, the fourth reused web';
      }
    },
    {
      name: LARGE_ZIPS,
      command: 'package',
      docker: { kind: 'absent' },
      resources: {
        big: lambdaWith('./src/big.ts', { includeFiles: [LARGE_DATA_FILES.big] }),
        alpha: lambda('./src/alpha.ts'),
        beta: lambda('./src/beta.ts'),
        bigartifact: customArtifact('./big-artifact')
      },
      files: {
        'src/shared.ts': SHARED_MODULE,
        'src/big.ts': BIG_HANDLER,
        'src/alpha.ts': LARGE_ALPHA_HANDLER,
        'src/beta.ts': SHARED_HANDLER('beta'),
        'big-artifact/index.js': BIG_ARTIFACT_HANDLER
      },
      setup: async (project) => {
        for (const [name, path] of Object.entries(LARGE_DATA_FILES)) {
          await mkdir(dirname(join(project, path)), { recursive: true });
          await writeFile(join(project, path), incompressibleData(name));
        }
      },
      zipSharedLayers: true,
      removeAfterChecks: ['.stacktape', 'data', 'src/data', 'big-artifact'],
      check: async (run) => {
        expectPackaged(run, ['big', 'alpha', 'beta', 'bigartifact']);
        const zipBytes: Record<string, number> = {};
        for (const name of Object.keys(LARGE_DATA_FILES)) {
          const artifactPath = run.result!.jobs.find(({ jobName }) => jobName === name)?.artifactPath;
          zipBytes[name] = artifactPath ? (await stat(artifactPath)).size : 0;
          expect(zipBytes[name]! > 50 * 1024 * 1024, `${name}'s ZIP is ${zipBytes[name]} bytes, not over 50 MB.`);
        }
        ensureLambdaImage();
        await invokeFunctions(
          run,
          Object.fromEntries(
            Object.keys(LARGE_DATA_FILES).map((name) => [
              name,
              {
                function: name,
                ...(name === 'alpha' && { catalog: 64 }),
                bytes: LARGE_ZIP_BYTES,
                sha256: sha256(incompressibleData(name))
              }
            ])
          )
        );
        return `ZIP bytes ${JSON.stringify(zipBytes)}; each function returned its data's size and SHA-256 in Lambda`;
      }
    },
    {
      name: 'Stacktape layers over 250 MB with their function, before any upload',
      command: 'deploy',
      docker: { kind: 'absent' },
      resources: {
        alpha: lambdaWith('./src/alpha.ts', { languageSpecificConfig: { disableSourceMaps: true } }),
        beta: lambdaWith('./src/beta.ts', { languageSpecificConfig: { disableSourceMaps: true } })
      },
      files: {
        'src/alpha.ts':
          "import hugePath from './data/huge.bin';\nimport { large } from './large-shared';\n\nexport const handler = async () => ({ hugePath, large: large.length });\n",
        'src/beta.ts':
          "import { large } from './large-shared';\n\nexport const handler = async () => ({ large: large.length });\n"
      },
      setup: async (project) => {
        await mkdir(join(project, 'src', 'data'), { recursive: true });
        await writeFile(join(project, 'src', 'data', 'huge.bin'), '');
        await truncate(join(project, 'src', 'data', 'huge.bin'), HUGE_ASSET_BYTES);
        await writeFile(
          join(project, 'src', 'large-shared.ts'),
          `export const large = '${'a'.repeat(LARGE_SHARED_BYTES)}';\n`
        );
      },
      deployments: [{}],
      removeAfterChecks: ['.stacktape', 'src/data', 'src/large-shared.ts'],
      check: (run) => {
        expectFailure(run, 'PACKAGING_FAILED');
        const { message } = run.result!.error!;
        expect(
          message.includes('alpha') &&
            message.includes('shared layer 1') &&
            message.includes('not counted') &&
            (message.match(/\d+\.\d\dMB/g) ?? []).length >= 3,
          `The message does not name the function, its size, each Stacktape layer's size and the total: ${message}`
        );
        const uploaded = run.result!.deployment?.uploadedKeys ?? [];
        expect(uploaded.length === 0, `Uploaded before failing: ${uploaded}.`);
        return message;
      }
    }
  ];
  if (realDocker) {
    const suffix = randomBytes(4).toString('hex');
    const workload = `realdockerprobe${suffix}`;
    scenarios.push({
      name: 'real Docker, host-native image',
      command: 'package',
      docker: { kind: 'real', realDocker, imagePrefix: workload },
      resources: { [workload]: workerService('x86_64'), single: lambda('./src/single.ts') },
      files: { 'src/single.ts': HANDLER, ...IMAGE_FILES },
      check: (run) => {
        expectPackaged(run, [`${workload}-service-container`, 'single']);
        expectOperations(run, ['buildx inspect', 'build', 'image inspect']);
        for (const operation of run.dockerOperations) {
          expect(
            operation.decision === 'forwarded' && operation.exitCode === 0,
            `${operation.operation} was ${operation.decision} (${operation.exitCode}).`
          );
        }
        expect(run.dockerOperations[1]!.platform === 'linux/amd64', 'The image was not built for linux/amd64.');
        return 'real inspection and amd64 build of the owned image';
      }
    });
  }
  return scenarios;
};

// ---------------------------------------------------------------------------------------------------------------------
// Real Docker: read-only preflight and verified cleanup

const runDocker = (realDocker: string, dockerConfig: string, args: string[]) => {
  const result = Bun.spawnSync([realDocker, ...args], {
    env: { PATH: '/usr/bin:/bin', DOCKER_CONFIG: dockerConfig },
    stdout: 'pipe',
    stderr: 'pipe'
  });
  return { exitCode: result.exitCode, stdout: result.stdout.toString(), stderr: result.stderr.toString() };
};

/** The real default builder, read without starting anything. Only a docker-driver builder with native amd64 qualifies. */
const inspectRealBuilder = (realDocker: string, dockerConfig: string) => {
  const { exitCode, stdout, stderr } = runDocker(realDocker, dockerConfig, ['buildx', 'inspect']);
  const driver = /^Driver:\s*(\S+)/m.exec(stdout)?.[1] ?? null;
  const platforms =
    /^Platforms:\s*(.+)$/m
      .exec(stdout)?.[1]
      ?.split(',')
      .map((platform) => platform.trim()) ?? [];
  const serverVersion = runDocker(realDocker, dockerConfig, ['version', '--format', '{{.Server.Version}}']);
  return {
    exitCode,
    driver,
    platforms,
    serverVersion: serverVersion.stdout.trim() || null,
    error: exitCode === 0 ? null : stderr.trim()
  };
};

const cleanUpRealImage = async ({
  realDocker,
  run,
  imagePrefix,
  since
}: {
  realDocker: string;
  run: ScenarioRun;
  imagePrefix: string;
  since: string;
}) => {
  const dockerConfig = join(run.directory, 'docker-config');
  const images = runDocker(realDocker, dockerConfig, [
    'image',
    'ls',
    '--filter',
    `reference=${imagePrefix}*`,
    '--format',
    '{{.Repository}}:{{.Tag}} {{.ID}} {{.Size}}'
  ]).stdout.trim();
  const removed = images
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [reference] = line.split(' ');
      const removal = runDocker(realDocker, dockerConfig, ['image', 'rm', reference!]);
      return { image: line, exitCode: removal.exitCode };
    });
  const remaining = runDocker(realDocker, dockerConfig, [
    'image',
    'ls',
    '-q',
    '--filter',
    `reference=${imagePrefix}*`
  ]).stdout.trim();
  // The daemon's own record of image events since the scenario started: a pull would appear here.
  const events = runDocker(realDocker, dockerConfig, [
    'events',
    '--since',
    since,
    '--until',
    new Date().toISOString(),
    '--filter',
    'type=image',
    '--format',
    '{{.Action}} {{.Actor.ID}}'
  ]);
  return {
    imagesBeforeRemoval: images.split('\n').filter(Boolean),
    removed,
    remaining: remaining.split('\n').filter(Boolean),
    imageEvents: events.stdout.split('\n').filter(Boolean),
    eventsExitCode: events.exitCode
  };
};

// ---------------------------------------------------------------------------------------------------------------------

const main = async () => {
  const args = yargsParser(process.argv.slice(2), { string: ['out'], boolean: ['skip-real-docker'] });
  const outDirectory = resolve(
    args.out ??
      join(CLI_ROOT, '.stacktape', 'docker-preparation-acceptance', new Date().toISOString().replace(/[:.]/g, '-'))
  );
  await claimOutputDirectory(outDirectory);
  const source = createSourceTracker({
    repoRoot: REPO_ROOT,
    scopes: ['apps/cli', 'packages/packaging'],
    excludePaths: [relative(REPO_ROOT, outDirectory)]
  });
  console.info(`Source ${describeSourceIdentity(source.before)}; output in ${outDirectory}`);

  // Real Docker only where it builds natively for linux/amd64 with the docker driver, so nothing is emulated or started.
  const realDockerPath = args['skip-real-docker'] ? null : (Bun.which('docker') ?? null);
  let realDocker: {
    path: string;
    preflight: ReturnType<typeof inspectRealBuilder>;
    qualified: boolean;
  } | null = null;
  if (realDockerPath) {
    const preflightConfig = join(outDirectory, 'real-docker-preflight-config');
    await mkdir(preflightConfig, { recursive: true });
    const preflight = inspectRealBuilder(realDockerPath, preflightConfig);
    realDocker = {
      path: realDockerPath,
      preflight,
      qualified:
        process.arch === 'x64' &&
        preflight.exitCode === 0 &&
        preflight.driver === 'docker' &&
        preflight.platforms.includes('linux/amd64')
    };
  }

  const scenarios = createScenarios({ realDocker: realDocker?.qualified ? realDocker.path : null });
  const runs: ScenarioRun[] = [];
  let realCleanup: Awaited<ReturnType<typeof cleanUpRealImage>> | null = null;
  for (const scenario of scenarios) {
    const since = new Date(Date.now() - 1000).toISOString();
    const run = await runScenario(scenario, outDirectory);
    runs.push(run);
    await check(scenario.name, () => scenario.check(run));
    if (scenario.docker.kind === 'real') {
      const { realDocker: realDockerExecutable, imagePrefix } = scenario.docker;
      realCleanup = await cleanUpRealImage({ realDocker: realDockerExecutable, run, imagePrefix, since });
      const cleanup = realCleanup;
      await check('real Docker: the owned image is removed and nothing was pulled', () => {
        expect(cleanup.imagesBeforeRemoval.length === 1, `Owned images: ${cleanup.imagesBeforeRemoval}.`);
        expect(
          cleanup.removed.every(({ exitCode }) => exitCode === 0) && cleanup.remaining.length === 0,
          `Removal failed or left ${cleanup.remaining}.`
        );
        expect(cleanup.eventsExitCode === 0, 'The daemon events could not be read.');
        expect(!cleanup.imageEvents.some((event) => event.startsWith('pull')), `Image events: ${cleanup.imageEvents}.`);
        return `${cleanup.imagesBeforeRemoval[0]}; events ${JSON.stringify(cleanup.imageEvents)}`;
      });
    }
    await check(`${scenario.name}: no stand-in process outlived the run`, () => {
      expect(run.leftoverProcesses.length === 0, `Killed leftovers: ${run.leftoverProcesses}.`);
    });
    for (const path of scenario.removeAfterChecks ?? []) {
      await rm(join(run.directory, 'project', path), { recursive: true, force: true });
    }
  }

  const deployments = runs.find(({ name }) => name === REGISTRY_CACHE_SERIES)?.deployments ?? [];
  // Each job's cache tag, as the CLI's own first build named it in `--cache-to`.
  const cacheTags = new Map(
    (deployments[0] ? imageBuilds(deployments[0]) : []).map(({ args }) => [
      valueAfter(args, '-t')!,
      tagOf(valueAfter(args, '--cache-to') ?? '')
    ])
  );
  await check('registry cache: each job keeps its cache tag through every deployment while the job exists', () => {
    expect(deployments.length === 4 && cacheTags.size === 2, `Cache tags ${[...cacheTags.values()]}.`);
    deployments.forEach((deployment, index) => {
      for (const { jobName } of deployment.result?.jobs ?? []) {
        expect(
          registryTags(deployment).has(cacheTags.get(jobName)!),
          `Deployment ${index + 1} left no ${cacheTags.get(jobName)}; the registry holds ${registryAfter(deployment)}.`
        );
      }
    });
    return [...cacheTags.values()].join(', ');
  });
  await check('registry cache: deployments 2 and 3 build from the cache', () => {
    for (const index of [1, 2]) {
      for (const { reason } of imageBuilds(deployments[index]!)) {
        expect(reason.endsWith('(found)'), `Deployment ${index + 1}: ${reason}.`);
      }
    }
  });
  await check('registry cache: older image versions and replaced caches are still deleted', () => {
    const third = deployments[2]!;
    for (const job of cacheTags.keys()) {
      const versions = [...registryTags(third)]
        .filter((tag) => tag.startsWith(`${job}--`))
        .map((tag) => tag.split('--')[2])
        .toSorted();
      expect(JSON.stringify(versions) === '["v000003","v000004"]', `After deployment 3, ${job} keeps ${versions}.`);
    }
    const replacedBefore = registryAfter(deployments[1]!).filter((line) => line.startsWith('- '));
    expect(replacedBefore.length > 0, 'Deployment 2 replaced no cache image.');
    const remaining = replacedBefore.filter((line) => registryAfter(third).includes(line));
    expect(remaining.length === 0, `Replaced cache images outlived deployment 3: ${remaining}.`);
    return 'two versions per job after deployment 3; images replaced in deployment 2 deleted by deployment 3';
  });
  await check("registry cache: a removed job's cache tag is deleted by the next deployment", () => {
    const last = deployments[3]!;
    const remainingJobs = (last.result?.jobs ?? []).map(({ jobName }) => jobName);
    for (const [job, tag] of cacheTags) {
      expect(
        registryTags(last).has(tag) === remainingJobs.includes(job),
        `After deployment 4, ${tag} is ${registryTags(last).has(tag) ? 'present' : 'missing'}; jobs ${remainingJobs}.`
      );
    }
    return `jobs after deployment 4: ${remainingJobs}`;
  });

  const readySplit = runs.find(({ name }) => name === SPLIT_READY_WITH_LAYERS);
  const absentSplit = runs.find(({ name }) => name === SPLIT_ABSENT_WITH_LAYERS);
  let splitComparison: Awaited<ReturnType<typeof compareSplitArtifacts>> | null = null;
  await check(
    'Docker not installed: the same split function and layer ZIPs, and each function runs in Lambda',
    async () => {
      expect(
        readySplit?.result?.outcome === 'packaged' && absentSplit?.result?.outcome === 'packaged',
        'A split scenario did not package.'
      );
      ensureLambdaImage();
      splitComparison = await compareSplitArtifacts(readySplit!, absentSplit!);
      const { ready, absent, invocations } = splitComparison;
      return `upload ${absent.uploadBytes} bytes (Docker ready ${ready.uploadBytes}); ${Object.values(invocations).join(' ')}`;
    }
  );

  const sourceCheck = source.check();
  await check('the source did not change during the run', () => {
    expect(sourceCheck === 'unchanged', `Source check: ${sourceCheck}.`);
  });

  const failed = results.filter(({ ok }) => !ok);
  const report = {
    kind: 'stacktape-docker-preparation-acceptance',
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    source: { before: source.before, after: source.after, check: sourceCheck },
    host: getHostEnvironment(),
    loadAverage: getLoadAverage(),
    worker: { command: [process.execPath, '--preload', 'scripts/test-preload.ts', relative(CLI_ROOT, WORKER)] },
    pinnedBinfmtImage: PINNED_BINFMT_IMAGE,
    realDocker: realDocker
      ? { ...realDocker, cleanup: realCleanup }
      : { qualified: false, reason: args['skip-real-docker'] ? 'skipped by --skip-real-docker' : 'no docker on PATH' },
    scenarios: runs,
    splitComparison,
    results
  };
  await writeFile(join(outDirectory, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.info(
    `\n${results.length - failed.length} of ${results.length} checks passed. Report: ${join(outDirectory, 'report.json')}`
  );
  if (!realDocker?.qualified) console.info('Not qualified here: the real Docker scenario (see the report).');
  if (failed.length > 0) process.exitCode = 1;
};

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
