/**
 * Process-level harness for `stacktape init` scenarios.
 *
 * Each scenario gets its own directory holding the project, an isolated HOME, and a `bin` directory whose
 * `claude` is the recorded stand-in in `recorded-agent-cli.ts`. The current source CLI runs as a child process
 * with the same scrubbed environment the project-qualification package lane uses, so neither AWS nor
 * Stacktape is reachable: Stacktape requests reach a loopback stub that answers only the price estimate and
 * records everything else.
 */

import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { buildOfflineQualificationEnvironment, startOfflineAwsServer } from '../qualification/offline-aws';
import { runProcess, type ProcessResult } from '../qualification/process';
import { parseCliJsonl } from '../verify-source-cli-aws-readonly';
import type { AgentLogEntry, AgentScript } from './recorded-agent-cli';

const cliDirectory = join(import.meta.dir, '..', '..');
const devEntry = join(cliDirectory, 'scripts', 'dev.ts');
const standIn = join(import.meta.dir, 'recorded-agent-cli.ts');

const docker = (args: string[]) => spawnSync('docker', args, { encoding: 'utf8' });

/**
 * Images packaging built for one sandbox. Every fixture puts the sandbox id in its resource names, and image tags
 * are derived from them, so this finds them by name even when packaging failed before reporting what it built.
 */
const imagesOwnedBy = (id: string): string[] => {
  const listed = docker(['image', 'ls', '--format', '{{.Repository}}:{{.Tag}}']);
  if (listed.status !== 0) return [];
  return listed.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((image) => image !== '' && (image.split(':')[0] ?? '').includes(id));
};

const removeImages = async (images: readonly string[]) => {
  const remaining = new Set(images);
  for (let attempt = 0; attempt < 3 && remaining.size > 0; attempt += 1) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 1_000));
    for (const image of [...remaining]) {
      docker(['image', 'rm', '--force', image]);
      if (docker(['image', 'inspect', image]).status !== 0) remaining.delete(image);
    }
  }
  if (remaining.size > 0) throw new Error(`Could not remove test images: ${[...remaining].join(', ')}.`);
};

export type InitSandbox = {
  /** Short random suffix, unique per scenario. Fixtures put it in package names so image tags never collide. */
  id: string;
  root: string;
  project: string;
  home: string;
  bin: string;
  agentScript: string;
  agentLog: string;
  readAgentLog: () => Promise<AgentLogEntry[]>;
  /** Removes every image built for this sandbox and the sandbox directory, and verifies the images are gone. */
  cleanup: () => Promise<void>;
};

export const createInitSandbox = async ({
  files,
  projectDirectoryName = 'project'
}: {
  files: (id: string) => Record<string, string>;
  /** A function when the directory name becomes a resource name, so the image tag carries the sandbox id. */
  projectDirectoryName?: string | ((id: string) => string);
}): Promise<InitSandbox> => {
  const id = randomBytes(3).toString('hex');
  const root = await mkdtemp(join(tmpdir(), `stacktape-j1-init-${id}-`));
  const project = join(
    root,
    typeof projectDirectoryName === 'function' ? projectDirectoryName(id) : projectDirectoryName
  );
  const home = join(root, 'home');
  const bin = join(root, 'bin');
  await Promise.all(
    ['tmp', 'appdata', 'localappdata', '.config', '.cache', '.docker'].map((directory) =>
      mkdir(join(home, directory), { recursive: true })
    )
  );
  await mkdir(bin, { recursive: true });
  for (const [path, contents] of Object.entries(files(id))) {
    const absolute = join(project, path);
    await mkdir(join(absolute, '..'), { recursive: true });
    await writeFile(absolute, contents, 'utf8');
  }

  // The vendor CLI is found on PATH, exactly as `detectAgents` looks for it.
  if (process.platform === 'win32') {
    await writeFile(join(bin, 'claude.cmd'), `@"${process.execPath}" "${standIn}" %*\r\n`, 'utf8');
  } else {
    await writeFile(join(bin, 'claude'), `#!/bin/sh\nexec "${process.execPath}" "${standIn}" "$@"\n`, 'utf8');
    await chmod(join(bin, 'claude'), 0o755);
  }

  const agentLog = join(root, 'agent-log.jsonl');
  return {
    id,
    root,
    project,
    home,
    bin,
    agentScript: join(root, 'agent-script.json'),
    agentLog,
    readAgentLog: async () =>
      existsSync(agentLog)
        ? (await readFile(agentLog, 'utf8'))
            .split('\n')
            .filter((line) => line.trim() !== '')
            .map((line) => JSON.parse(line) as AgentLogEntry)
        : [],
    // Images first, then the directory, and the directory even when an image could not be removed.
    cleanup: async () => {
      try {
        await removeImages(imagesOwnedBy(id));
      } finally {
        await rm(root, { recursive: true, force: true, maxRetries: 3 });
      }
    }
  };
};

export type StacktapeApiStub = {
  url: string;
  /** Configs sent for pricing, in order. */
  pricedConfigs: string[];
  /** Any other Stacktape request. A scenario expects none. */
  unexpectedRequests: string[];
  close: () => Promise<void>;
};

/**
 * Loopback stand-in for the anonymous Stacktape API: a recorded price for `stackPriceEstimation`, a 404 for
 * anything else. tRPC's batch link posts `{ "0": input }` to `/<procedure>?batch=1`.
 */
export const startStacktapeApiStub = async ({ flatMonthlyCost }: { flatMonthlyCost: number }) => {
  const pricedConfigs: string[] = [];
  const unexpectedRequests: string[] = [];
  const server: Server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    const path = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
    if (request.method === 'POST' && path === '/stackPriceEstimation') {
      const input = (JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, { stackConfig: string }>)[
        '0'
      ];
      pricedConfigs.push(input?.stackConfig ?? '');
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify([{ result: { data: { success: true, costs: { flatMonthlyCost, resourcesBreakdown: {} } } } }])
      );
      return;
    }
    unexpectedRequests.push(`${request.method} ${path}`);
    response.writeHead(404, { 'content-type': 'application/json' });
    response.end('[]');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('The Stacktape API stub has no port.');
  return {
    url: `http://127.0.0.1:${address.port}`,
    pricedConfigs,
    unexpectedRequests,
    close: () => new Promise<void>((resolve) => server.close(() => resolve()))
  } satisfies StacktapeApiStub;
};

const cliEnvironment = ({ sandbox, apiUrl }: { sandbox: InitSandbox; apiUrl: string }) => {
  const environment = buildOfflineQualificationEnvironment({
    endpoint: apiUrl,
    invocationId: `j1-init-${sandbox.id}-${randomBytes(3).toString('hex')}`,
    homeDirectory: sandbox.home
  });
  const pathSeparator = process.platform === 'win32' ? ';' : ':';
  return {
    ...environment,
    PATH: `${sandbox.bin}${pathSeparator}${environment.PATH ?? ''}`,
    STP_CUSTOM_TRPC_API_ENDPOINT: apiUrl,
    STACKTAPE_TEST_AGENT_SCRIPT: sandbox.agentScript,
    STACKTAPE_TEST_AGENT_LOG: sandbox.agentLog
  };
};

export type InitRun = ProcessResult & { output: string; api: StacktapeApiStub; agentLog: AgentLogEntry[] };

/** `stacktape init --headless` from the current source, against the sandbox project. */
export const runSourceInit = async ({
  sandbox,
  args = [],
  agent,
  flatMonthlyCost = 41.6
}: {
  sandbox: InitSandbox;
  args?: string[];
  agent?: AgentScript;
  flatMonthlyCost?: number;
}): Promise<InitRun> => {
  await writeFile(sandbox.agentScript, JSON.stringify(agent ?? { behavior: 'fail', exitCode: 1, stderr: '' }));
  const api = await startStacktapeApiStub({ flatMonthlyCost });
  try {
    const result = await runProcess({
      command: process.execPath,
      args: [devEntry, 'init', '--headless', '--projectDirectory', sandbox.project, ...args],
      cwd: cliDirectory,
      env: cliEnvironment({ sandbox, apiUrl: api.url }),
      timeoutMs: 4 * 60_000
    });
    return { ...result, output: `${result.stdout}\n${result.stderr}`, api, agentLog: await sandbox.readAgentLog() };
  } finally {
    await api.close();
  }
};

const isAlive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

/**
 * Start init, wait until the agent session is connected to its MCP server, then send SIGINT to the CLI
 * process alone, the way a supervisor or `kill -INT` does. Returns what was left running afterwards.
 */
export const interruptSourceInitDuringAnalysis = async ({ sandbox }: { sandbox: InitSandbox }) => {
  await writeFile(sandbox.agentScript, JSON.stringify({ behavior: 'hang' } satisfies AgentScript));
  const api = await startStacktapeApiStub({ flatMonthlyCost: 1 });
  const child = spawn(
    process.execPath,
    [devEntry, 'init', '--headless', '--codingAgent', 'claude-code', '--projectDirectory', sandbox.project],
    {
      cwd: cliDirectory,
      env: cliEnvironment({ sandbox, apiUrl: api.url }),
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );
  let output = '';
  child.stdout.on('data', (chunk: Buffer) => (output += chunk.toString()));
  child.stderr.on('data', (chunk: Buffer) => (output += chunk.toString()));
  const exited = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) =>
    child.once('close', (code, signal) => resolve({ code, signal }))
  );

  try {
    const connectedBy = Date.now() + 90_000;
    let invocation: Extract<AgentLogEntry, { type: 'invocation' }> | undefined;
    while (Date.now() < connectedBy) {
      const log = await sandbox.readAgentLog();
      invocation = log.find((entry) => entry.type === 'invocation' && entry.mcpServerPid !== undefined) as
        | typeof invocation
        | undefined;
      if (invocation !== undefined && log.some((entry) => entry.type === 'tools')) break;
      if (child.exitCode !== null) throw new Error(`init exited before the agent connected.\n${output}`);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (invocation === undefined) throw new Error(`The agent session never connected.\n${output}`);

    process.kill(child.pid!, 'SIGINT');
    const exit = await Promise.race([
      exited,
      new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 30_000))
    ]);
    // Children are reaped asynchronously after the parent exits; give them the same short grace a user would.
    const settledBy = Date.now() + 5_000;
    const survivors = () => [invocation!.pid, invocation!.mcpServerPid!].filter(isAlive);
    while (survivors().length > 0 && Date.now() < settledBy) await new Promise((resolve) => setTimeout(resolve, 100));
    const remaining = survivors();
    // Reported, then stopped: a failed assertion must not leave the stand-in running on a shared machine.
    for (const pid of remaining) {
      try {
        process.kill(pid, 'SIGKILL');
      } catch {}
    }
    return { exit, output, agentPid: invocation.pid, mcpServerPid: invocation.mcpServerPid!, survivors: remaining };
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      try {
        process.kill(process.platform === 'win32' ? child.pid! : -child.pid!, 'SIGKILL');
      } catch {}
    }
    await api.close();
  }
};

/**
 * Resolve the sandbox project's pnpm lockfile, as a repository commits it. Nothing is installed: packaging
 * starts from a checkout without `node_modules`, the way CI does. Uses the sandbox's HOME and its own store, so
 * the developer's store and pnpm configuration are neither read nor written.
 */
export const lockPnpmDependencies = async (sandbox: InitSandbox) => {
  const result = await runProcess({
    command: 'pnpm',
    args: ['install', '--lockfile-only', '--store-dir', join(sandbox.root, 'pnpm-store')],
    cwd: sandbox.project,
    env: {
      PATH: process.env.PATH,
      HOME: sandbox.home,
      USERPROFILE: sandbox.home,
      XDG_CONFIG_HOME: join(sandbox.home, '.config'),
      XDG_CACHE_HOME: join(sandbox.home, '.cache'),
      CI: '1'
    },
    timeoutMs: 4 * 60_000
  });
  if (result.exitCode !== 0)
    throw new Error(`pnpm install --lockfile-only failed:\n${result.stdout}\n${result.stderr}`);
};

export type PackagedProject = {
  templatePath: string;
  template: Record<string, any>;
  packagedWorkloads: Array<{ jobName: string; digest: string }>;
};

/**
 * `validate --withPackage` from the current source with AWS answered by the qualification loopback guard:
 * builds every workload and synthesizes the template, exactly as the project-qualification package lane does.
 */
export const packageOffline = async ({
  sandbox,
  configFile,
  projectName
}: {
  sandbox: InitSandbox;
  configFile: string;
  projectName: string;
}): Promise<PackagedProject> => {
  const guard = await startOfflineAwsServer();
  const templatePath = join(sandbox.root, 'compiled-template.yml');
  try {
    // Secrets a first deploy expects the user to create: the guard answers exactly these with a placeholder.
    const configText = await readFile(join(sandbox.project, configFile), 'utf8');
    guard.registerSecretReferences([...configText.matchAll(/\$Secret\(['"]([^'"]+)['"]\)/g)].map((match) => match[1]!));
    const environment = buildOfflineQualificationEnvironment({
      endpoint: guard.endpoint,
      invocationId: `j1-package-${sandbox.id}`,
      homeDirectory: sandbox.home
    });
    const result = await runProcess({
      command: process.execPath,
      args: [
        devEntry,
        'validate',
        '--withPackage',
        '--configPath',
        join(sandbox.project, configFile),
        '--currentWorkingDirectory',
        sandbox.project,
        '--projectName',
        projectName,
        '--stage',
        'qualification',
        '--region',
        'eu-west-1',
        '--agent',
        '--outFile',
        templatePath
      ],
      cwd: cliDirectory,
      env: environment,
      timeoutMs: 8 * 60_000
    });
    const parsed = parseCliJsonl(result.stdout, 'validate --withPackage');
    if (result.exitCode !== 0 || !parsed.result.ok) {
      throw new Error(
        `validate --withPackage failed (${String(result.exitCode)}): ${parsed.result.code}: ${parsed.result.message}\n${JSON.stringify((parsed.result.data as { hints?: unknown } | undefined)?.hints ?? [])}\n${result.stderr.slice(-4_000)}`
      );
    }
    if (guard.unexpectedRequests.length > 0) {
      throw new Error(`Packaging attempted blocked network calls: ${guard.unexpectedRequests.join(', ')}.`);
    }
    const data = parsed.result.data as { result?: { packagedWorkloads?: PackagedProject['packagedWorkloads'] } };
    return {
      templatePath,
      template: parseYaml(await readFile(templatePath, 'utf8')) as Record<string, any>,
      packagedWorkloads: data.result?.packagedWorkloads ?? []
    };
  } finally {
    await guard.close();
  }
};

export const assertDockerAvailable = () => {
  const info = docker(['info', '--format', '{{.ServerVersion}}']);
  if (info.status !== 0) throw new Error(`This scenario builds and runs an image and needs Docker: ${info.stderr}`);
};

type ContainerDefinition = {
  Name: string;
  Image: unknown;
  Environment?: Array<{ Name: string; Value: unknown }>;
  PortMappings?: Array<{ ContainerPort: number }>;
};

/** The container definition the deployed service would run for a packaged job, from the synthesized template. */
export const containerDefinitionFor = (template: Record<string, any>, jobName: string): ContainerDefinition => {
  for (const resource of Object.values<any>(template.Resources ?? {})) {
    if (resource?.Type !== 'AWS::ECS::TaskDefinition') continue;
    for (const container of (resource.Properties?.ContainerDefinitions ?? []) as ContainerDefinition[]) {
      if (typeof container.Image === 'string' && container.Image.includes(`:${jobName}--`)) return container;
    }
  }
  throw new Error(`The template has no container definition for ${jobName}.`);
};

/**
 * Run a packaged image with the environment and port mapping its synthesized task definition declares, and
 * return the first HTTP response on the port the load balancer would route to.
 */
export const requestRunningImage = async ({
  jobName,
  container,
  path = '/',
  deadlineMs = 60_000
}: {
  jobName: string;
  container: ContainerDefinition;
  path?: string;
  deadlineMs?: number;
}): Promise<{ status: number; body: string; logs: string }> => {
  const containerPort = container.PortMappings?.[0]?.ContainerPort;
  if (containerPort === undefined) throw new Error(`${container.Name} declares no container port.`);
  const name = `stacktape-j1-${jobName}-${randomBytes(3).toString('hex')}`;
  // Literal values only. Intrinsics and `{{resolve:...}}` dynamic references are resolved by AWS at deploy time.
  const environment = (container.Environment ?? [])
    .filter(
      (entry) =>
        typeof entry.Value === 'number' || (typeof entry.Value === 'string' && !entry.Value.startsWith('{{resolve:'))
    )
    .flatMap((entry) => ['--env', `${entry.Name}=${String(entry.Value)}`]);
  const started = docker([
    'run',
    '--detach',
    '--name',
    name,
    '--label',
    'stacktape.test=j1-init-first-deployment',
    '--publish',
    `127.0.0.1::${containerPort}`,
    ...environment,
    `${jobName}:latest`
  ]);
  if (started.status !== 0) throw new Error(`docker run failed: ${started.stderr}`);
  try {
    const mapped =
      docker(['port', name, `${containerPort}/tcp`])
        .stdout.trim()
        .split('\n')[0] ?? '';
    const hostPort = mapped.split(':').at(-1);
    const deadline = Date.now() + deadlineMs;
    let lastError = 'no attempt';
    while (Date.now() < deadline) {
      try {
        const response = await fetch(`http://127.0.0.1:${hostPort}${path}`, { signal: AbortSignal.timeout(2_000) });
        return { status: response.status, body: await response.text(), logs: docker(['logs', name]).stdout };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
      if (docker(['inspect', '--format', '{{.State.Running}}', name]).stdout.trim() !== 'true') break;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    const logs = docker(['logs', name]);
    throw new Error(
      `${jobName} never answered on container port ${containerPort} (${lastError}). Container output:\n${logs.stdout}${logs.stderr}`
    );
  } finally {
    docker(['rm', '--force', name]);
  }
};
