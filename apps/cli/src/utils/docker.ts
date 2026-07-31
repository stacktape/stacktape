import type { StdTransformer } from '@utils/streams';
import type { StacktapeArgs } from 'src/config/cli/types';
import type { ContainerInfo, ContainerInspectInfo, Port } from 'dockerode';
import type { DockerBuildOutputArchitecture } from '@stacktape/packaging/runtime-contracts';
import { isAbsolute, join } from 'node:path';
import { exec } from '@utils/exec';
import { transformToUnixPath } from '@utils/fs-utils';
import { getByteSize } from '@utils/misc';
import { CliError } from '@utils/errors';
import { validateEnvVariableValue } from '@utils/validation';
import { checkExecutableInPath, getPlatform } from './bin-executable';

const STACKTAPE_BUILDER_NAME = 'stacktape-builder';

/**
 * Converts a Windows path to Docker-compatible mount path format.
 * On Windows, Docker Desktop accepts paths in the format:
 * - C:\Users\foo or C:/Users/foo (native Windows path - Docker translates it)
 * We just ensure forward slashes for consistency.
 * Unix paths are returned as-is with backslashes converted to forward slashes.
 */
const toDockerMountPath = (hostPath: string): string => {
  return transformToUnixPath(hostPath);
};

type ExecDockerOptions = {
  cwd?: string;
  skipHandleError?: boolean;
  /** Handed to Docker on standard input. The only safe way to pass a secret, see `dockerLogin`. */
  stdinInput?: string;
  /** Extra variables for the Docker CLI process itself. See `toDockerEnvPassthrough`. */
  env?: Record<string, string>;
  /** Redacted from the rejection this call throws. See the `exec` option of the same name. */
  redactedValues?: string[];
};

type DockerImageReference = {
  id: string;
  repository: string;
  tag: string;
};

const splitLines = (value: string) =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const parseJsonArray = <T>(value: string): T[] => {
  try {
    return JSON.parse(value || '[]');
  } catch {
    return [];
  }
};

const includesErrorMessage = (err: any, patterns: string[]) => {
  return patterns.some((pattern) => {
    return (
      (typeof err?.stderr === 'string' && err.stderr.includes(pattern)) ||
      (typeof err?.message === 'string' && err.message.includes(pattern)) ||
      (typeof err?.shortMessage === 'string' && err.shortMessage.includes(pattern))
    );
  });
};

const isNoSuchImageError = (err: any) =>
  includesErrorMessage(err, ['No such image', 'no such image', 'No such object']);

const isNoSuchContainerError = (err: any) =>
  includesErrorMessage(err, ['No such container', 'no such container', 'No such container: containers']);

const toUnixSeconds = (value?: string | number) => {
  if (!value) {
    return 0;
  }
  if (typeof value === 'number') {
    return value;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : Math.floor(parsed / 1000);
};

const formatDuration = (ms: number) => {
  if (!Number.isFinite(ms) || ms <= 0) {
    return '0s';
  }
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }
  const days = Math.round(hours / 24);
  return `${days}d`;
};

const dockerNotInstalledError = (cause?: Error) =>
  new CliError({
    category: 'DOCKER',
    code: 'DOCKER_NOT_INSTALLED',
    message: 'Docker is not installed or not found in PATH.',
    hints: 'Install Docker Desktop from https://www.docker.com/products/docker-desktop/',
    cause
  });

/**
 * Asked before spawning rather than recognised afterwards, because no rejection is a stable signal: Node words it
 * `spawn docker ENOENT`, Bun `Executable not found in $PATH: "docker"`, and on Windows cross-spawn falls back to
 * cmd.exe, which exits 1 with "is not recognized as an internal or external command" — a sentence cmd prints in the
 * console's own language, so matching it only ever worked on English installations. A PATH lookup asks the same
 * question structurally and gives the same answer everywhere.
 */
const assertDockerIsInstalled = () => {
  if (!checkExecutableInPath('docker')) {
    throw dockerNotInstalledError();
  }
};

/**
 * The race the preflight cannot close: Docker present when `assertDockerIsInstalled` looked and gone by the time the
 * child was spawned. Both runtimes report that as an `ENOENT` spawn error; Bun's wording is kept as well because it
 * is Bun's own constant string rather than anything the operating system localizes.
 */
const isDockerNotInstalledError = (err: any) =>
  err?.code === 'ENOENT' || includesErrorMessage(err, ['Executable not found in $PATH: "docker"']);

const isDockerNotRunningError = (err: Error) => {
  const message = err.message?.toLowerCase() || '';
  const patterns = [
    // Unix/Linux patterns
    'connect enoent',
    'cannot connect to the docker daemon',
    'is the docker daemon running',
    'failed to dial grpc',
    // Windows Docker Desktop patterns
    'dockerdesktoplinuxengine',
    'the system cannot find the file specified',
    'error during connect',
    // Generic patterns
    'docker daemon is not running',
    'docker is not running',
    'unable to connect to docker',
    'connection refused'
  ];
  return patterns.some((pattern) => message.includes(pattern));
};

const handleDockerError = (err: Error, message?: string) => {
  if (isDockerNotInstalledError(err)) {
    throw dockerNotInstalledError(err);
  }
  if (isDockerNotRunningError(err)) {
    throw new CliError({
      category: 'DOCKER',
      code: 'DOCKER_NOT_RUNNING',
      message: 'Docker is not running.',
      hints: [
        'Make sure Docker Desktop is running.',
        getPlatform() === 'win'
          ? 'If Docker is installed, start Docker Desktop.'
          : getPlatform() === 'macos'
            ? 'If Docker is installed, start Docker Desktop from Applications.'
            : 'If Docker is installed, run `sudo systemctl start docker`.',
        'To install Docker, visit https://www.docker.com/products/docker-desktop/.'
      ],
      cause: err
    });
  }
  if (err.message.includes('unauthenticated pull rate limit')) {
    throw new CliError({
      category: 'DOCKER',
      code: 'DOCKER_PULL_RATE_LIMITED',
      message: err.message,
      hints: [
        'To avoid rate limits, use the AWS ECR Public mirror instead of Docker Hub for base images.',
        'For example, replace `node:21` with `public.ecr.aws/docker/library/node:21`.',
        'Browse available images at https://gallery.ecr.aws/.'
      ],
      cause: err
    });
  }
  throw new CliError({
    category: 'DOCKER',
    code: 'DOCKER_COMMAND_FAILED',
    message: message || err.message,
    cause: err
  });
};

const getDockerArgsFromCli = (args: StacktapeArgs) => {
  return (args?.dockerArgs || [])
    .map((arg) => {
      const [argName, ...value] = arg.split(' ');
      return [argName, value.join(' ')];
    })
    .flat();
};

/**
 * Names Stacktape or the operating system needs for the Docker CLI process itself. A configured build argument or
 * container environment variable with one of these names cannot be handed to Docker through its environment without
 * changing how Docker itself runs — `DOCKER_BUILDKIT` selects the builder, `PATH` decides what the CLI can launch —
 * so the name is rejected rather than silently honored in one place and lost in the other.
 */
const reservedDockerCliEnvNames = () =>
  process.platform === 'win32'
    ? ['DOCKER_BUILDKIT', 'FORCE_COLOR', 'PATH', 'PATHEXT', 'SYSTEMROOT', 'WINDIR', 'COMSPEC']
    : ['DOCKER_BUILDKIT', 'FORCE_COLOR', 'PATH'];

/** Windows resolves environment variable names case-insensitively; every other platform does not. */
const isReservedDockerCliEnvName = (name: string) =>
  reservedDockerCliEnvNames().includes(process.platform === 'win32' ? name.toUpperCase() : name);

/**
 * Docker reads a `--build-arg NAME` or `-e NAME` written without a value out of its own environment, and supplies
 * exactly the value it finds there to the Dockerfile `ARG` or to the container. Passing configured values that way
 * keeps them out of the Docker command line, which `/proc/<pid>/cmdline` on Linux and Process Explorer on Windows
 * show to every account on the machine, whereas the environment of the Docker CLI process is readable only by this
 * user and by root/Administrator.
 *
 * That is the whole of the guarantee: Stacktape does not put a configured build argument or container environment
 * value into an argument list, nor into any command, error, log or debug string it produces itself. A Dockerfile that
 * echoes its `ARG`s and an application that prints its own environment remain free to do so, and Stacktape passes
 * that output through unchanged.
 *
 * A value set here wins over a variable of the same name inherited from the Stacktape process, so what Docker reads
 * is always the configured value.
 */
const toDockerEnvPassthrough = (
  values: Record<string, any>,
  { flag, description }: { flag: '--build-arg' | '-e'; description: string }
) => {
  const env: Record<string, string> = {};
  const flags: string[] = [];
  for (const [name, value] of Object.entries(values || {})) {
    if (!name || name.includes('=')) {
      throw new CliError({
        category: 'CONFIG',
        code: 'CONFIG_DOCKER_ENV_NAME_INVALID',
        message: `${description} name "${name}" cannot be used: it is empty or contains "=".`
      });
    }
    if (isReservedDockerCliEnvName(name)) {
      throw new CliError({
        category: 'CONFIG',
        code: 'CONFIG_DOCKER_ENV_NAME_RESERVED',
        message: `${description} "${name}" uses a name reserved for the Docker CLI process itself.`,
        hints:
          "Stacktape passes these values through Docker's environment so they never appear on the command line. Rename this variable because it would change how Docker itself runs."
      });
    }
    env[name] = `${value}`;
    flags.push(flag, name);
  }
  return { env, flags };
};

const toBuildArgsPassthrough = (buildArgs: Record<string, string>) =>
  toDockerEnvPassthrough(buildArgs || {}, { flag: '--build-arg', description: 'Build argument' });

const toContainerEnvironmentPassthrough = (environment: Record<string, any>) => {
  Object.entries(environment || {}).forEach(([name, value]) => validateEnvVariableValue(name, value));
  return toDockerEnvPassthrough(environment || {}, { flag: '-e', description: 'Environment variable' });
};

/**
 * Names the Docker command without repeating its arguments, so that neither Stacktape's own logs nor the errors Execa
 * builds out of the argument list echo an image reference, a path, a `--cache-to` target or a `--docker-args` value
 * back to the user. Configured secrets no longer reach the argument list at all; this keeps the rest of it quiet too.
 */
const describeDockerCommand = (commands: string[]) => {
  const subcommand: string[] = [];
  for (const token of commands) {
    if (token.startsWith('-') || subcommand.length === 2) {
      break;
    }
    subcommand.push(token);
  }
  const omitted = commands.length > subcommand.length ? '[arguments omitted]' : '';
  return ['docker', ...subcommand, omitted].filter(Boolean).join(' ');
};

export const execDocker = (commands: string[], args?: ExecDockerOptions) => {
  const { cwd, skipHandleError, stdinInput, env, redactedValues } = args || {};
  assertDockerIsInstalled();
  const promise = exec('docker', commands, {
    disableStdout: true,
    disableStderr: true,
    // Stacktape's own variable is applied last: a configured name that would shadow it is rejected by
    // `toDockerEnvPassthrough`, and this makes sure no other caller can turn BuildKit off by accident either.
    env: { ...env, DOCKER_BUILDKIT: 1 },
    cwd: cwd || process.cwd(),
    stdinInput,
    redactedValues,
    safeCommandDescription: describeDockerCommand(commands)
  });
  return skipHandleError ? promise : promise.catch(handleDockerError);
};

const listDockerImageReferences = async (): Promise<DockerImageReference[]> => {
  const { stdout } = await execDocker(['image', 'ls', '--format', '{{json .}}']);
  return splitLines(stdout).map((line) => {
    const parsed = JSON.parse(line);
    return { id: parsed.ID, repository: parsed.Repository, tag: parsed.Tag };
  });
};

const inspectDockerImage = async (reference: string): Promise<any | null> => {
  try {
    const { stdout } = await execDocker(['image', 'inspect', reference], { skipHandleError: true });
    const [image] = parseJsonArray<any>(stdout);
    return image || null;
  } catch (err) {
    if (isNoSuchImageError(err)) {
      return null;
    }
    handleDockerError(err as Error);
    return null;
  }
};

const resolveImageReference = async (tag: string) => {
  const references = await listDockerImageReferences();
  const match = references.find((ref) => ref.repository === tag || (ref.tag && `${ref.repository}:${ref.tag}` === tag));
  if (!match) {
    return null;
  }
  if (match.tag && match.tag !== '<none>' && match.repository && match.repository !== '<none>') {
    return `${match.repository}:${match.tag}`;
  }
  return match.id;
};

export const getDockerImageDetails = async (tag: string) => {
  const normalizedTag = tag.trim();
  let image = await inspectDockerImage(normalizedTag);
  if (!image) {
    const fallbackReference = await resolveImageReference(normalizedTag);
    if (!fallbackReference) {
      throw new CliError({
        category: 'DOCKER',
        code: 'DOCKER_IMAGE_NOT_FOUND',
        message: `Docker image \`${tag}\` was not found.`
      });
    }
    image = await inspectDockerImage(fallbackReference);
  }
  if (!image) {
    throw new CliError({
      category: 'DOCKER',
      code: 'DOCKER_IMAGE_NOT_FOUND',
      message: `Docker image \`${tag}\` was not found.`
    });
  }
  return {
    size: getByteSize(image.Size, 'MB', 2),
    id: image.Id,
    created: toUnixSeconds(image.Created)
  };
};

export const checkDockerImageExists = async (imageTag: string): Promise<boolean> => {
  const image = await inspectDockerImage(imageTag);
  return image !== null;
};

const inspectContainers = async (containerIds: string[]): Promise<ContainerInspectInfo[]> => {
  if (!containerIds.length) {
    return [];
  }
  const { stdout } = await execDocker(['container', 'inspect', ...containerIds]);
  return parseJsonArray<ContainerInspectInfo>(stdout);
};

const inspectContainer = async (containerName: string): Promise<ContainerInspectInfo | null> => {
  try {
    const { stdout } = await execDocker(['container', 'inspect', containerName], { skipHandleError: true });
    const [container] = parseJsonArray<ContainerInspectInfo>(stdout);
    return container || null;
  } catch (err) {
    if (isNoSuchContainerError(err)) {
      return null;
    }
    handleDockerError(err as Error);
    return null;
  }
};

const buildContainerCommand = (inspectInfo: ContainerInspectInfo) => {
  if (inspectInfo.Config?.Cmd?.length) {
    return inspectInfo.Config.Cmd.join(' ');
  }
  const args = inspectInfo.Args?.join(' ') || '';
  return [inspectInfo.Path, args].filter(Boolean).join(' ').trim();
};

const buildContainerStatus = (inspectInfo: ContainerInspectInfo) => {
  const state = inspectInfo.State;
  if (!state) {
    return '';
  }
  if (state.Status === 'running' && state.StartedAt) {
    const startedAt = Date.parse(state.StartedAt);
    if (!Number.isNaN(startedAt)) {
      return `Up ${formatDuration(Date.now() - startedAt)}`;
    }
  }
  if (state.Status === 'exited' && state.FinishedAt && typeof state.ExitCode === 'number') {
    const finishedAt = Date.parse(state.FinishedAt);
    if (!Number.isNaN(finishedAt)) {
      return `Exited (${state.ExitCode}) ${new Date(finishedAt).toISOString()}`;
    }
  }
  return state.Status || '';
};

const buildContainerNames = (inspectInfo: ContainerInspectInfo) => {
  const names: string[] = [];
  if (inspectInfo.Name) {
    names.push(inspectInfo.Name.replace(/^\//, ''));
  }
  if (Array.isArray((inspectInfo as any).Names)) {
    names.push(...(inspectInfo as any).Names.map((name: string) => name.replace(/^\//, '')));
  }
  return [...new Set(names)].filter(Boolean);
};

const buildContainerPortsFromInspect = (inspectInfo: ContainerInspectInfo): Port[] => {
  const ports: Port[] = [];
  const portMap = inspectInfo.NetworkSettings?.Ports || {};
  Object.entries(portMap).forEach(([key, bindings]) => {
    const [privatePortRaw, type] = key.split('/');
    const privatePort = Number(privatePortRaw);
    if (!bindings || !bindings.length) {
      ports.push({
        IP: '',
        PrivatePort: privatePort,
        PublicPort: privatePort,
        Type: type
      });
      return;
    }
    bindings.forEach((binding) => {
      ports.push({
        IP: binding.HostIp || '',
        PrivatePort: privatePort,
        PublicPort: binding.HostPort ? Number(binding.HostPort) : privatePort,
        Type: type
      });
    });
  });
  return ports;
};

const toContainerInfo = (inspectInfo: ContainerInspectInfo): ContainerInfo => {
  return {
    Id: inspectInfo.Id,
    Names: buildContainerNames(inspectInfo),
    Image: inspectInfo.Config?.Image || inspectInfo.Image || '',
    ImageID: inspectInfo.Image || '',
    Command: buildContainerCommand(inspectInfo),
    Created: toUnixSeconds(inspectInfo.Created),
    Ports: buildContainerPortsFromInspect(inspectInfo),
    Labels: inspectInfo.Config?.Labels || {},
    State: inspectInfo.State?.Status || '',
    Status: buildContainerStatus(inspectInfo),
    HostConfig: {
      NetworkMode: inspectInfo.HostConfig?.NetworkMode || ''
    },
    NetworkSettings: {
      Networks: inspectInfo.NetworkSettings?.Networks || {}
    },
    Mounts: (inspectInfo.Mounts || []).map((mount) => ({
      Name: mount.Name,
      Type: mount.Type,
      Source: mount.Source,
      Destination: mount.Destination,
      Driver: mount.Driver,
      Mode: mount.Mode,
      RW: mount.RW,
      Propagation: mount.Propagation
    }))
  };
};

export const inspectDockerContainer = async (containerName: string): Promise<ContainerInspectInfo> => {
  const container = await inspectContainer(containerName);
  return (container || {}) as ContainerInspectInfo;
};

export const listDockerContainers = async (): Promise<ContainerInfo[]> => {
  const { stdout } = await execDocker(['container', 'ls', '-q']);
  const containerIds = splitLines(stdout);
  if (!containerIds.length) {
    return [];
  }
  const inspectInfos = await inspectContainers(containerIds);
  return inspectInfos.map(toContainerInfo);
};

export const stopDockerContainer = async (containerName: string, waitTime: number) => {
  await execDocker(['container', 'stop', '--time', `${waitTime}`, containerName]);
};

export const dockerLogin = async ({
  user,
  password,
  proxyEndpoint
}: {
  user: string;
  password: string;
  proxyEndpoint: string;
}) => {
  // Security boundary. `password` is a live ECR authorization token, and `-p/--password` would make it a command-line
  // argument: visible in `ps`, and — because Execa builds its error message, `command` and stack from the argument
  // list — repeated in every error the CLI throws, prints and writes to its JSONL result when Docker is missing or
  // the login fails. `--password-stdin` is therefore mandatory: the token goes to Docker on the child's standard
  // input and never becomes part of any string that describes the command. `redactedValues` is the second line of
  // defence, for a `docker` on PATH that echoes back what it was given on standard input: `execDocker` never pipes
  // the child's output to the console or the JSONL log, but Execa still folds it into the rejection it builds.
  //
  // Success is decided by Docker's exit status alone. A successful `--password-stdin` login routinely writes to
  // stderr — "WARNING! Your password will be stored unencrypted in ..." on a machine with no credential helper — and
  // treating that as a failure would break login on exactly those machines.
  await execDocker(['login', '--username', user, '--password-stdin', proxyEndpoint], {
    stdinInput: password,
    redactedValues: [password],
    skipHandleError: true
  }).catch((err) =>
    // Classifies a missing or stopped Docker first; anything else fails with the registry context and Docker's own
    // stderr, never with the arguments the command was given.
    handleDockerError(err, `Failed to login to AWS container registry. Error message:\n${err.stderr || err.message}`)
  );
};

export const tagDockerImage = async (sourceImage: string, newTag: string) => {
  const { stderr } = await execDocker(['tag', sourceImage, newTag]);
  if (stderr) {
    throw new CliError({
      category: 'DOCKER',
      code: 'DOCKER_IMAGE_TAG_FAILED',
      message: `Failed to tag Docker image.\n${stderr}`
    });
  }
};

export const pushDockerImage = async (tagWithRepositoryUrl: string) => {
  const { stderr } = await execDocker(['push', `${tagWithRepositoryUrl}`]);
  if (stderr) {
    throw new CliError({
      category: 'DOCKER',
      code: 'DOCKER_IMAGE_PUSH_FAILED',
      message: `Failed to push Docker image \`${tagWithRepositoryUrl}\` to the remote repository.\n${stderr}`
    });
  }
};

type PortMapping = { containerPort: number; hostPort: number; protocol?: string };

const getPortsArgs = (ports: PortMapping[]): string[] => {
  return (ports || [])
    .map(({ protocol, containerPort, hostPort }) => ['-p', `${hostPort}:${containerPort}/${protocol || 'tcp'}`])
    .flat();
};

export const dockerRun = async ({
  name,
  image,
  entryPoint,
  volumeMapping,
  volumeMounts,
  environment,
  portMappings,
  command,
  transformStderrLine,
  transformStdoutLine,
  transformStderrPut,
  transformStdoutPut,
  args,
  onStart
}: {
  args: StacktapeArgs;
  name: string;
  image: string;
  entryPoint?: string[];
  command?: string[];
  volumeMapping?: string;
  volumeMounts?: { hostPath: string; containerPath: string }[];
  portMappings?: PortMapping[];
  environment: Record<string, any>;
  transformStderrLine?: StdTransformer | StdTransformer[];
  transformStdoutLine?: StdTransformer | StdTransformer[];
  transformStderrPut?: StdTransformer | StdTransformer[];
  transformStdoutPut?: StdTransformer | StdTransformer[];
  onStart?: (msg: string) => any;
}) => {
  if (command && entryPoint) {
    throw new Error('Only one of command and entryPoint can be specified when running Docker container.');
  }
  assertDockerIsInstalled();
  const containerEnvironment = toContainerEnvironmentPassthrough(environment);
  const dockerArgs = ['--rm', '--name', name];
  let commandToExecute = command;
  if (volumeMapping) {
    dockerArgs.push('-v', volumeMapping);
  }
  if (volumeMounts?.length) {
    for (const { hostPath, containerPath } of volumeMounts) {
      dockerArgs.push('-v', `${toDockerMountPath(hostPath)}:${containerPath}`);
    }
  }
  // we are using host network to allow the container to use bastion tunnels
  // after they implement capability for tunnel to bind to other than 127.0.0.1, we can remove this switch back
  // see here https://github.com/aws/session-manager-plugin/pull/54
  // NOTE: --network host only works properly on Linux. On macOS/Windows, Docker runs in a VM,
  // so host networking only shares the VM's network, not the actual host. Use port mappings instead.
  const isLinux = process.platform === 'linux';
  if (isLinux) {
    dockerArgs.push('--network', 'host');
  }
  dockerArgs.push(...containerEnvironment.flags);
  if (portMappings && !isLinux) {
    dockerArgs.push(...getPortsArgs(portMappings));
  }
  dockerArgs.push(...getDockerArgsFromCli(args));
  if (entryPoint) {
    const entryPointArr = entryPoint.map((cmd) => cmd.trim());
    const [initialCmd, ...restCommands] = entryPointArr;
    commandToExecute = restCommands;
    dockerArgs.push('--entrypoint', initialCmd);
  }
  dockerArgs.push(image);
  if (commandToExecute) {
    dockerArgs.push(...commandToExecute);
  }
  if (onStart) {
    onStart(`Running container ${name}...`);
  }

  return exec('docker', ['run', ...dockerArgs], {
    transformStderrLine,
    transformStdoutLine,
    transformStderrPut,
    transformStdoutPut,
    // The container's environment — connection strings, resolved secrets — travels here rather than as `-e VAR=value`
    // arguments; `dockerArgs` only names the variables. See `toDockerEnvPassthrough`.
    env: { ...containerEnvironment.env, DOCKER_BUILDKIT: 1 },
    safeCommandDescription: describeDockerCommand(['run', ...dockerArgs])
  });
};

export const buildDockerImage = async ({
  buildContextPath,
  buildArgs,
  imageTag,
  dockerfilePath,
  dockerBuildOutputArchitecture,
  cacheFromRef,
  cacheToRef
}: {
  buildContextPath: string;
  dockerfilePath?: string;
  imageTag: string;
  buildArgs?: Record<string, string>;
  dockerBuildOutputArchitecture?: DockerBuildOutputArchitecture;
  /** ECR image ref for pulling cache layers, e.g. "123456.dkr.ecr.us-east-1.amazonaws.com/repo:workload-cache" */
  cacheFromRef?: string;
  /** ECR image ref for pushing cache layers */
  cacheToRef?: string;
}) => {
  const start = Date.now();
  const contextPath = buildContextPath
    ? isAbsolute(buildContextPath)
      ? buildContextPath
      : join(process.cwd(), buildContextPath)
    : process.cwd();

  const useRemoteCache = cacheFromRef || cacheToRef;

  // Only the names go on the command line; Docker reads the values out of its own environment. See
  // `toDockerEnvPassthrough`.
  const buildArgsPassthrough = toBuildArgsPassthrough(buildArgs);

  const command = [
    // Use buildx with docker-container builder when remote cache is enabled (required for cache export)
    ...(useRemoteCache ? ['buildx', 'build', '--builder', STACKTAPE_BUILDER_NAME, '--load'] : ['build']),
    ...(dockerBuildOutputArchitecture ? ['--platform', dockerBuildOutputArchitecture] : []),
    '-t',
    imageTag,
    ...(cacheFromRef ? ['--cache-from', `type=registry,ref=${cacheFromRef}`] : []),
    ...(cacheToRef ? ['--cache-to', `type=registry,ref=${cacheToRef},image-manifest=true,mode=max`] : []),
    ...(dockerfilePath ? ['-f', join(buildContextPath, dockerfilePath)] : []),
    ...buildArgsPassthrough.flags,
    contextPath
  ];

  let stderr;
  try {
    ({ stderr } = await execDocker(command, { env: buildArgsPassthrough.env }));
  } catch (err) {
    handleDockerError(err, `Error building docker image ${imageTag}:\n${err.message}`);
  }
  const imageDetails = await getDockerImageDetails(imageTag);
  return { ...imageDetails, dockerOutput: stderr, duration: Date.now() - start };
};

export const getDockerBuildxSupportedPlatforms = async (): Promise<string[]> => {
  const { stdout } = await execDocker(['buildx', 'inspect', '--bootstrap']);

  // Parse the output to find the Platforms line
  const lines = stdout.split('\n');
  const platformsLine = lines.find((line) => line.trim().startsWith('Platforms:'));

  if (!platformsLine) {
    throw new CliError({
      category: 'DOCKER',
      code: 'DOCKER_BUILDX_PLATFORMS_MISSING',
      message: 'Unable to find supported platforms in docker buildx inspect output'
    });
  }

  // Extract platforms from the line (format: "Platforms: linux/amd64, linux/arm64, ...")
  const platformsText = platformsLine.split('Platforms:')[1]?.trim();
  if (!platformsText) {
    throw new CliError({
      category: 'DOCKER',
      code: 'DOCKER_BUILDX_PLATFORMS_INVALID',
      message: 'Unable to parse supported platforms from docker buildx inspect output'
    });
  }

  // Split by comma and clean up whitespace
  const platforms = platformsText
    .split(',')
    .map((platform) => platform.trim())
    .filter(Boolean);

  return platforms;
};

export const isDockerRunning = async (): Promise<boolean> => {
  try {
    await execDocker(['info']);
    return true;
  } catch {
    return false;
  }
};

/** Ensures a buildx builder with docker-container driver exists (required for cache export) */
export const ensureBuildxBuilderForCache = async (): Promise<void> => {
  try {
    // Check if our builder already exists
    const { stdout } = await execDocker(['buildx', 'ls']);
    if (stdout.includes(STACKTAPE_BUILDER_NAME)) {
      return;
    }
  } catch {
    // buildx ls failed, try to create builder anyway
  }

  try {
    // Create a new builder with docker-container driver (supports cache export)
    await execDocker(['buildx', 'create', '--name', STACKTAPE_BUILDER_NAME, '--driver', 'docker-container']);
  } catch {
    // Builder might already exist, ignore error
  }
};

export const installDockerPlatforms = async (platforms: string[]): Promise<void> => {
  if (!platforms.length) {
    return;
  }

  const platformsArg = platforms.join(',');
  const { stderr, exitCode } = await execDocker([
    'run',
    '--rm',
    '--privileged',
    'tonistiigi/binfmt',
    '--install',
    platformsArg
  ]);

  if (exitCode !== 0) {
    throw new CliError({
      category: 'DOCKER',
      code: 'DOCKER_PLATFORM_INSTALL_FAILED',
      message: `Failed to install Docker platforms \`${platformsArg}\`.\n${stderr}`
    });
  }
};
