import type { RunRailpackPrepare } from '@stacktape/packaging/runtime-contracts';
import { randomBytes } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, posix } from 'node:path';
import { tuiManager } from '@application-services/tui-manager';
import { CliError } from '@utils/errors';
import { exec } from '@utils/exec';
import { execDocker } from '@utils/docker';
import { describeToolDownload } from '@utils/external-tools';
import { fsPaths } from 'src/config/runtime-paths';
import { RAILPACK_FRONTEND_IMAGE, RAILPACK_PLANNER_IMAGE, RAILPACK_VERSION } from 'src/config/railpack';

/** Railpack exits with 75 when planning failed for a reason worth retrying, such as a download that did not finish. */
const TRANSIENT_EXIT_CODE = 75;

/**
 * Where the planner runs. Railpack publishes a Windows binary but does not support it, and its Go path handling can
 * write Windows separators into a plan that BuildKit then executes on Linux; there the planner runs in a Linux
 * container instead. `STP_RAILPACK_PLANNER=container` forces that path anywhere, which is how it is tested.
 */
const plannerMode = (): 'host' | 'container' =>
  process.env.STP_RAILPACK_PLANNER === 'container' || process.platform === 'win32' ? 'container' : 'host';

const railpackFailure = ({ exitCode, message, cwd }: { exitCode: number | undefined; message: string; cwd: string }) =>
  new CliError({
    category: 'RAILPACK',
    code: exitCode === TRANSIENT_EXIT_CODE ? 'RAILPACK_TRANSIENT_FAILURE' : 'RAILPACK_COMMAND_FAILED',
    message: `Railpack ${RAILPACK_VERSION} could not plan the build in \`${cwd}\`:\n${message}`,
    hints:
      exitCode === TRANSIENT_EXIT_CODE
        ? 'Railpack reported a transient failure, usually a download of mise or a version list that did not finish. Check the network connection and run the command again.'
        : 'Railpack detects the language from the files in the source directory. Set startCommand, buildCommand or installCommand in the buildpack properties when detection is incomplete, or use dockerfile packaging for full control.'
  });

/**
 * Railpack resolves `--config-file` beneath the source directory, so an inline configuration is written there under a
 * unique name for the duration of the plan (in both planner modes; a read-only bind mount cannot receive it later).
 * The planner runs before the source is hashed or sent to Docker, and the file is removed first, so it never reaches
 * the digest or the image.
 */
const configFileName = () => `.stacktape-railpack-${randomBytes(6).toString('hex')}.json`;

const prepareArguments = ({
  sourceDirectory,
  outputDirectory,
  variableNames,
  configFile
}: {
  sourceDirectory: string;
  outputDirectory: string;
  variableNames: string[];
  configFile: string | undefined;
}) => [
  'prepare',
  sourceDirectory,
  '--plan-out',
  join(outputDirectory, 'plan.json'),
  '--info-out',
  join(outputDirectory, 'info.json'),
  ...(configFile ? ['--config-file', configFile] : []),
  // A bare `--env NAME` makes railpack read the value from its own environment: values stay off the command line.
  ...variableNames.flatMap((name) => ['--env', name])
];

const readPreparedFiles = async (outputDirectory: string) => {
  const [plan, info] = await Promise.all([
    readFile(join(outputDirectory, 'plan.json'), 'utf8').then((contents) => JSON.parse(contents) as unknown),
    readFile(join(outputDirectory, 'info.json'), 'utf8').then((contents) => JSON.parse(contents) as unknown)
  ]);
  return { plan, info };
};

let plannerImagePromise: Promise<void> | undefined;

/** Builds the planner image once per CLI process; Docker's own cache makes later processes fast. */
const ensurePlannerImage = () => {
  plannerImagePromise ??= (async () => {
    const { stdout } = await execDocker(['image', 'ls', '--quiet', RAILPACK_PLANNER_IMAGE], { skipHandleError: true });
    if (stdout.trim()) return;
    const dockerfile = [
      `FROM ${RAILPACK_FRONTEND_IMAGE} AS railpack`,
      'FROM public.ecr.aws/docker/library/debian:trixie-slim',
      'RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl git bash tar gzip xz-utils && rm -rf /var/lib/apt/lists/*',
      'COPY --from=railpack /railpack /usr/local/bin/railpack',
      'ENTRYPOINT ["railpack"]'
    ].join('\n');
    await execDocker(['build', '--tag', RAILPACK_PLANNER_IMAGE, '-'], { stdinInput: dockerfile });
  })();
  return plannerImagePromise;
};

const runInContainer = async ({
  sourceDirectoryPath,
  outputDirectory,
  variables,
  configFile
}: {
  sourceDirectoryPath: string;
  outputDirectory: string;
  variables: Record<string, string>;
  configFile: string | undefined;
}) => {
  await ensurePlannerImage();
  const variableNames = Object.keys(variables);
  // The directory keeps its own name inside the container: a provider may derive a name from it (C/C++ names the
  // built executable after the source directory).
  const containerSource = posix.join('/src', basename(sourceDirectoryPath) || 'app');
  return execDocker(
    [
      'run',
      '--rm',
      '--volume',
      `${sourceDirectoryPath}:${containerSource}:ro`,
      '--volume',
      `${outputDirectory}:/out`,
      // mise and the version lists it fetches, kept between plans; one volume per Railpack release.
      '--volume',
      `stacktape-railpack-cache-v${RAILPACK_VERSION}:/tmp/railpack`,
      // Bare `-e NAME` makes Docker read the value from this process's environment.
      ...variableNames.flatMap((name) => ['--env', name]),
      RAILPACK_PLANNER_IMAGE,
      ...prepareArguments({ sourceDirectory: containerSource, outputDirectory: '/out', variableNames, configFile })
    ],
    { env: variables, skipHandleError: true }
  );
};

const runOnHost = async ({
  sourceDirectoryPath,
  outputDirectory,
  variables,
  configFile
}: {
  sourceDirectoryPath: string;
  outputDirectory: string;
  variables: Record<string, string>;
  configFile: string | undefined;
}) => {
  // Resolved first: a failed first-use download explains itself instead of reading as a failed railpack command.
  const railpackPath = await fsPaths.railpackPath({
    onDownloadStart: (details) => tuiManager.info(describeToolDownload(details))
  });
  return exec(
    railpackPath,
    prepareArguments({
      sourceDirectory: sourceDirectoryPath,
      outputDirectory,
      variableNames: Object.keys(variables),
      configFile
    }),
    { cwd: sourceDirectoryPath, env: variables, disableStdout: true, disableStderr: true }
  );
};

/**
 * Plans a directory with the pinned Railpack release and returns its plan and info files. Build variables reach the
 * planner through its environment only. Railpack's own text output is not shown: the info file carries the same
 * diagnostics, and the packaging layer reports them.
 */
export const runRailpackPrepare: RunRailpackPrepare = async ({ sourceDirectoryPath, variables, config }) => {
  const outputDirectory = await mkdtemp(join(tmpdir(), 'stp-railpack-'));
  const mode = plannerMode();
  const configFile = config === undefined ? undefined : configFileName();
  const hostConfigPath = configFile === undefined ? undefined : join(sourceDirectoryPath, configFile);
  try {
    if (config !== undefined && hostConfigPath !== undefined) {
      await writeFile(hostConfigPath, JSON.stringify(config, null, 2));
    }
    const input = { sourceDirectoryPath, outputDirectory, variables, configFile };
    try {
      await (mode === 'container' ? runInContainer(input) : runOnHost(input));
    } catch (error) {
      // A failed detection still writes the info file with `success: false` and its logs; that is the useful error.
      const info = await readFile(join(outputDirectory, 'info.json'), 'utf8')
        .then((contents) => JSON.parse(contents) as { success?: boolean })
        .catch(() => undefined);
      if (info && info.success === false) return { plan: undefined, info };
      const failure = error as { exitCode?: number; message?: string };
      throw railpackFailure({
        exitCode: failure.exitCode,
        message: failure.message ?? String(error),
        cwd: sourceDirectoryPath
      });
    }
    return readPreparedFiles(outputDirectory);
  } finally {
    if (hostConfigPath !== undefined) await rm(hostConfigPath, { force: true }).catch(() => {});
    await rm(outputDirectory, { recursive: true, force: true }).catch(() => {});
  }
};

/** Nothing a plan suggests should be longer than a command line a person would review. */
const MAX_COMMAND_LENGTH = 300;

/** The start command Railpack would give a directory, or null when it has none or planning is impossible. */
export const planStartCommand = async (sourceDirectoryPath: string): Promise<string | null> => {
  try {
    const { plan } = await runRailpackPrepare({ sourceDirectoryPath, variables: {} });
    const command = (plan as { deploy?: { startCommand?: unknown } } | undefined)?.deploy?.startCommand;
    if (typeof command !== 'string') return null;
    const trimmed = command.trim();
    return trimmed.length > 0 && trimmed.length <= MAX_COMMAND_LENGTH ? trimmed : null;
  } catch {
    return null;
  }
};
