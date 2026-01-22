import type { ContainerInfo, ContainerInspectInfo, Port } from 'dockerode';
import { isAbsolute, join } from 'node:path';
import { exec } from '@shared/utils/exec';
import { transformToUnixPath } from '@shared/utils/fs-utils';
import { getByteSize, getError } from '@shared/utils/misc';
import { validateEnvVariableValue } from '@shared/utils/validation';

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
  if (isDockerNotRunningError(err)) {
    throw getError({
      type: 'DOCKER',
      message: 'Docker is not running.',
      hint: [
        'Make sure Docker Desktop is running.',
        'On Windows: Start Docker Desktop from the Start menu.',
        'On Mac: Start Docker Desktop from Applications.',
        'On Linux: Run "sudo systemctl start docker" or "sudo service docker start".'
      ].join('\n'),
      stack: err.stack
    });
  }
  if (err.message.includes('docker ENOENT')) {
    throw getError({
      type: 'DOCKER',
      message: 'Docker is not installed or not found in PATH.',
      hint: 'Install Docker Desktop from https://www.docker.com/products/docker-desktop/',
      stack: err.stack
    });
  }
  if (err.message.includes('unauthenticated pull rate limit')) {
    throw getError({
      type: 'DOCKER',
      message: typeof err === 'string' ? err : err.message,
      hint: [
        'To avoid rate limit problems, try using AWS ECR public repository mirror instead of Docker Hub for you base images.',
        'Example: Instead of "node:21" use "public.ecr.aws/docker/library/node:21"',
        'See all available images in AWS Public ECR registry: https://gallery.ecr.aws/'
      ].join('\n'),
      stack: err.stack
    });
  }
  throw getError({
    type: 'DOCKER',
    message: message || (typeof err === 'string' ? err : err.message),
    stack: err.stack
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

const buildDockerBuildArgs = (buildArgs: Record<string, string>) => {
  return Object.entries(buildArgs || {})
    .map(([argName, value]) => {
      return ['--build-arg', `${argName}=${value}`];
    })
    .flat();
};

export const execDocker = (commands: string[], args?: ExecDockerOptions) => {
  const { cwd, skipHandleError } = args || {};
  const promise = exec('docker', commands, {
    disableStdout: true,
    disableStderr: true,
    env: { DOCKER_BUILDKIT: 1 },
    cwd: cwd || process.cwd()
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
      throw getError({
        type: 'DOCKER',
        message: `Docker image "${tag}" not found.`
      });
    }
    image = await inspectDockerImage(fallbackReference);
  }
  if (!image) {
    throw getError({
      type: 'DOCKER',
      message: `Docker image "${tag}" not found.`
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
  const result = await execDocker(['login', '-u', user, '-p', password, proxyEndpoint]);
  if (result.stderr && !result.stderr.includes('Using --password via the CLI is insecure')) {
    throw getError({
      type: 'DOCKER',
      message: `Failed to login to AWS container registry. Error message: \n${result.stderr}`
    });
  }
};

export const tagDockerImage = async (sourceImage: string, newTag: string) => {
  const { stderr } = await execDocker(['tag', sourceImage, newTag]);
  if (stderr) {
    throw getError({
      type: 'DOCKER',
      message: `Failed to tag docker image. Error message:\n${stderr}`
    });
  }
};

export const pushDockerImage = async (tagWithRepositoryUrl: string) => {
  const { stderr } = await execDocker(['push', `${tagWithRepositoryUrl}`]);
  if (stderr) {
    throw getError({
      type: 'DOCKER',
      message: `Failed to push docker image ${tagWithRepositoryUrl} to remote repository. Error message:\n${stderr}`
    });
  }
};

type PortMapping = { containerPort: number; hostPort: number; protocol?: string };

const getPortsArgs = (ports: PortMapping[]): string[] => {
  return (ports || [])
    .map(({ protocol, containerPort, hostPort }) => ['-p', `${hostPort}:${containerPort}/${protocol || 'tcp'}`])
    .flat();
};

const getEnvironmentArgsForDocker = (jobEnvironment: Record<string, any>): string[] => {
  const res = [];
  for (const varName in jobEnvironment) {
    const value = jobEnvironment[varName];
    validateEnvVariableValue(varName, value);
    res.push('-e', `${varName}=${value}`);
  }
  return res;
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
    throw getError({
      type: 'UNEXPECTED',
      message: 'Only one of command and entryPoint can be specified when running Docker container.'
    });
  }
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
  if (Object.keys(environment).length) {
    dockerArgs.push(...getEnvironmentArgsForDocker(environment));
  }
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
    env: { DOCKER_BUILDKIT: 1 }
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

  const command = [
    // Use buildx with docker-container builder when remote cache is enabled (required for cache export)
    ...(useRemoteCache ? ['buildx', 'build', '--builder', STACKTAPE_BUILDER_NAME, '--load'] : ['build']),
    ...(dockerBuildOutputArchitecture ? ['--platform', dockerBuildOutputArchitecture] : []),
    '-t',
    imageTag,
    ...(cacheFromRef ? ['--cache-from', `type=registry,ref=${cacheFromRef}`] : []),
    ...(cacheToRef ? ['--cache-to', `type=registry,ref=${cacheToRef},image-manifest=true,mode=max`] : []),
    ...(dockerfilePath ? ['-f', join(buildContextPath, dockerfilePath)] : []),
    ...buildDockerBuildArgs(buildArgs),
    contextPath
  ];

  let stderr;
  try {
    ({ stderr } = await execDocker(command));
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
    throw getError({
      type: 'DOCKER',
      message: 'Unable to find supported platforms in docker buildx inspect output'
    });
  }

  // Extract platforms from the line (format: "Platforms: linux/amd64, linux/arm64, ...")
  const platformsText = platformsLine.split('Platforms:')[1]?.trim();
  if (!platformsText) {
    throw getError({
      type: 'DOCKER',
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
    throw getError({
      type: 'DOCKER',
      message: `Failed to install Docker platforms ${platformsArg}. Error message:\n${stderr}`
    });
  }
};
