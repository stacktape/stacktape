/**
 * Running the first deploy, from the wizard.
 *
 * The deploy runs as a *child* `stacktape deploy --agent`, not as a function call inside this
 * process. That is the important decision here, and it is not laziness: the deploy command owns
 * global state — the resolved config, the AWS clients, the operation reporter, the TUI — and running it
 * inside a process that is already holding an init session would mean two commands sharing one set
 * of singletons. A child process has exactly the isolation the CLI already assumes it has.
 *
 * It also gets us a supported, documented interface for free. `--agent` emits the JSONL protocol in
 * `tui-manager/output/jsonl-types.ts`, which is the same stream Console renders, so the wizard reads
 * a contract rather than scraping human output.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import type { JsonlEvent } from '@application-services/tui-manager/output/jsonl-types';
import { getStackName } from '@stacktape/naming/stacks';
import { terminateChild } from '../terminate-child';
import {
  INIT_TARGET_CHECK_ENV,
  INIT_TARGET_EXPECTATION_ENV,
  INIT_TARGET_SCHEMA_VERSION,
  type DeployTargetExpectation,
  type DeployTargetObservation
} from './stack-expectation';

export type DeployRequest = {
  /** Directory holding the configuration. The child runs here, so relative paths resolve. */
  repositoryRoot: string;
  configPath: string;
  stage: string;
  region: string;
  projectName: string;
  /** Named AWS profile, when the user picked one rather than using the ambient credentials. */
  profile?: string;
  /** Connected Stacktape AWS account name, when more than one account is available. */
  awsAccount?: string;
  /**
   * Leave whatever was created in place if this attempt fails.
   *
   * Set only when the stack already exists. A failed *update* stops at `UPDATE_FAILED`, which
   * CloudFormation will deploy over, so the resources that did come up — a database that took
   * minutes — are still there for the next attempt. A failed *create* stops at `CREATE_FAILED`,
   * which nothing can update, so keeping it there only forces a manual rollback first.
   */
  keepPartialProgress?: boolean;
  /** Exact create/update consent, rechecked by the child after it loads deploy credentials. */
  targetExpectation?: DeployTargetExpectation;
};

export type DeployHandle = {
  /** Resolves with the child's exit code once it has finished. */
  finished: Promise<number>;
  /** Stops the deploy. CloudFormation keeps going; this only stops watching and reporting. */
  cancel: () => void;
};

type ResourceUrlRequest = Pick<DeployRequest, 'projectName' | 'stage' | 'region' | 'profile' | 'awsAccount'> & {
  resourceName: string;
};

/**
 * How to re-invoke this CLI as a child.
 *
 * Mirrors the MCP server's resolution rather than inventing a second answer: a release is a binary
 * that re-runs itself, and a development checkout is a script under Bun.
 */
export const resolveSelfCommand = (): { command: string; args: string[] } => {
  const script = process.argv[1] ? resolve(process.argv[1]) : undefined;
  if (script && /\.(mjs|cjs|js|ts)$/.test(script) && existsSync(script)) {
    return { command: process.execPath, args: [script] };
  }
  const executableName = basename(process.execPath || '').toLowerCase();
  // Under `bun`/`node` with no script path we are not a release binary; fall back to whatever
  // `stacktape` resolves to on PATH, which is what a user would type themselves.
  if (executableName.startsWith('bun') || executableName.startsWith('node')) {
    return { command: 'stacktape', args: [] };
  }
  return { command: process.execPath, args: [] };
};

/**
 * The arguments the child actually runs with.
 *
 * The config path is absolute and the working directory travels as `--currentWorkingDirectory`
 * rather than as the spawn cwd. That distinction is load-bearing in development: the dev wrapper
 * builds the CLI from source relative to *its own* working directory, so spawning it inside the
 * user's repository makes it try to compile their project as the CLI. The flag moves only what
 * should move — config resolution and packaging paths — and leaves the wrapper where it works.
 */
export const deployArgs = (request: DeployRequest): string[] => [
  'deploy',
  '--configPath',
  join(request.repositoryRoot, request.configPath),
  '--currentWorkingDirectory',
  request.repositoryRoot,
  '--stage',
  request.stage,
  '--region',
  request.region,
  '--projectName',
  request.projectName,
  ...(request.profile === undefined ? [] : ['--profile', request.profile]),
  ...(request.awsAccount === undefined ? [] : ['--awsAccount', request.awsAccount]),
  ...(request.keepPartialProgress === true ? ['--disableAutoRollback'] : []),
  // Agent mode is the machine-readable contract: JSONL on stdout, and no interactive confirmation
  // to answer — the user already confirmed by pressing the button.
  '--agent'
];

/**
 * The same command as a copyable line, for anyone who would rather run it themselves.
 *
 * Written the way a person standing in their project would type it — relative config path, no
 * working-directory flag — rather than echoing the child's absolute-path form.
 */
export const deployCommandLine = (request: DeployRequest): string =>
  [
    'stacktape',
    'deploy',
    '--configPath',
    request.configPath,
    '--stage',
    request.stage,
    '--region',
    request.region,
    '--projectName',
    request.projectName,
    ...(request.profile === undefined ? [] : ['--profile', request.profile]),
    ...(request.awsAccount === undefined ? [] : ['--awsAccount', request.awsAccount])
  ]
    .map((part) => (part.includes(' ') ? `"${part}"` : part))
    .join(' ');

/**
 * Read one typed resource URL after a successful deploy.
 *
 * The wizard used to scrape URL-looking strings from raw build output. Repository-controlled output
 * can print any URL it likes, so that turns “Live now” into a phishing surface. `param:get` resolves
 * the deployed stack's typed `url` parameter instead, under the same exact stack target.
 */
export const readResourceUrl = async ({
  request,
  spawnChild = spawn,
  timeoutMs = 30_000,
  terminate = terminateChild
}: {
  request: ResourceUrlRequest;
  spawnChild?: typeof spawn;
  /** Keeps a post-deploy convenience lookup from holding a successful wizard open forever. */
  timeoutMs?: number;
  terminate?: (child: ChildProcess) => void;
}): Promise<string | undefined> => {
  const self = resolveSelfCommand();
  const child = spawnChild(
    self.command,
    [
      ...self.args,
      'param:get',
      '--projectName',
      request.projectName,
      '--stage',
      request.stage,
      '--region',
      request.region,
      '--resourceName',
      request.resourceName,
      '--paramName',
      'url',
      ...(request.profile === undefined ? [] : ['--profile', request.profile]),
      ...(request.awsAccount === undefined ? [] : ['--awsAccount', request.awsAccount]),
      '--agent'
    ],
    {
      stdio: ['ignore', 'pipe', 'ignore'],
      env: { ...process.env, STACKTAPE_INIT_MCP: '', FORCE_COLOR: '0' },
      ...(process.platform === 'win32' && !self.command.includes('\\') ? { shell: true } : {})
    }
  );

  let output = '';
  child.stdout?.on('data', (chunk: Buffer) => {
    // A param result is tiny. Bound unexpected output so a broken child cannot grow this session.
    output = `${output}${chunk.toString('utf8')}`.slice(-64_000);
  });

  const exitCode = await new Promise<number>((resolveFinished) => {
    let settled = false;
    const finish = (code: number) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolveFinished(code);
    };
    const timeout = setTimeout(() => {
      terminate(child);
      finish(1);
    }, timeoutMs);
    child.on('error', () => finish(1));
    child.on('close', (code) => finish(code ?? 1));
  });
  if (exitCode !== 0) return undefined;

  const terminalResults: Array<{ ok?: unknown; data?: { result?: unknown } }> = [];
  for (const line of output.split(/\r?\n/)) {
    try {
      const event = JSON.parse(line) as { type?: unknown; ok?: unknown; data?: { result?: unknown } };
      if (event.type === 'result') terminalResults.push(event);
    } catch {
      // Not JSONL. Raw child output is untrusted and never becomes a URL.
    }
  }
  if (terminalResults.length !== 1) return undefined;
  const terminal = terminalResults[0]!;
  if (terminal.ok !== true || typeof terminal.data?.result !== 'string') return undefined;
  try {
    const url = new URL(terminal.data.result);
    return url.protocol === 'https:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
};

const isDeployTargetObservation = (value: unknown): value is DeployTargetObservation => {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<DeployTargetObservation>;
  const common =
    candidate.schemaVersion === INIT_TARGET_SCHEMA_VERSION &&
    typeof candidate.accountId === 'string' &&
    typeof candidate.stackName === 'string' &&
    typeof candidate.projectName === 'string' &&
    typeof candidate.stage === 'string' &&
    typeof candidate.region === 'string' &&
    typeof candidate.configSha256 === 'string' &&
    /^[a-f0-9]{64}$/.test(candidate.configSha256);
  if (!common) return false;
  if (candidate.status === 'absent') return true;
  if (candidate.status === 'updateable') {
    return typeof candidate.stackId === 'string' && typeof candidate.stackStatus === 'string';
  }
  if (candidate.status === 'blocked') {
    return (
      candidate.reason === 'foreign-stack' ||
      candidate.reason === 'identity-mismatch' ||
      candidate.reason === 'unsafe-status' ||
      candidate.reason === 'incomplete-stack-data'
    );
  }
  return false;
};

/**
 * Inspect the target in a short-lived deploy child.
 *
 * This deliberately does not use the init process's ambient AWS SDK. The deploy command may select
 * Console-issued credentials, an organization account, or persisted profile defaults; only the
 * child can authoritatively say which account it will mutate.
 */
export const inspectDeployTarget = async ({
  request,
  spawnChild = spawn,
  timeoutMs = 30_000,
  terminate = terminateChild,
  signal
}: {
  request: DeployRequest;
  spawnChild?: typeof spawn;
  timeoutMs?: number;
  terminate?: (child: ChildProcess) => void;
  signal?: AbortSignal;
}): Promise<DeployTargetObservation | undefined> => {
  const self = resolveSelfCommand();
  const child = spawnChild(self.command, [...self.args, ...deployArgs({ ...request, keepPartialProgress: false })], {
    stdio: ['ignore', 'pipe', 'ignore'],
    env: {
      ...process.env,
      STACKTAPE_INIT_MCP: '',
      [INIT_TARGET_CHECK_ENV]: '1',
      [INIT_TARGET_EXPECTATION_ENV]: '',
      FORCE_COLOR: '0'
    },
    ...(process.platform === 'win32' && !self.command.includes('\\') ? { shell: true } : {})
  });

  let output = '';
  child.stdout?.on('data', (chunk: Buffer) => {
    output = `${output}${chunk.toString('utf8')}`.slice(-128_000);
  });
  const exitCode = await new Promise<number>((resolveFinished) => {
    let settled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const abort = () => {
      terminate(child);
      finish(1);
    };
    const finish = (code: number) => {
      if (settled) return;
      settled = true;
      if (timeout !== undefined) clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
      resolveFinished(code);
    };
    timeout = setTimeout(() => {
      terminate(child);
      finish(1);
    }, timeoutMs);
    child.on('error', () => finish(1));
    child.on('close', (code) => finish(code ?? 1));
    if (signal?.aborted === true) abort();
    else signal?.addEventListener('abort', abort, { once: true });
  });
  if (exitCode !== 0) return undefined;

  const terminalResults: Array<{ ok?: unknown; data?: { result?: unknown } }> = [];
  for (const line of output.split(/\r?\n/)) {
    try {
      const event = JSON.parse(line) as { type?: unknown; ok?: unknown; data?: { result?: unknown } };
      if (event.type === 'result') terminalResults.push(event);
    } catch {
      // Only a singular typed terminal result is authoritative.
    }
  }
  if (terminalResults.length !== 1) return undefined;
  const terminal = terminalResults[0]!;
  if (terminal.ok !== true || !isDeployTargetObservation(terminal.data?.result)) return undefined;
  const observed = terminal.data.result;
  return observed.projectName === request.projectName &&
    observed.stage === request.stage &&
    observed.region === request.region &&
    observed.stackName === getStackName(request.projectName, request.stage)
    ? observed
    : undefined;
};

/**
 * Start a deploy and report everything it emits.
 *
 * Unparseable stdout lines are handed over as raw log lines rather than dropped. A CLI that prints
 * something unexpected is a CLI whose output the user still needs to see, especially when it is the
 * reason their deploy failed.
 */
export const startDeploy = ({
  request,
  onEvent,
  onLine,
  spawnChild = spawn
}: {
  request: DeployRequest;
  onEvent: (event: JsonlEvent) => void;
  /** Raw output that was not a JSONL event: stderr, and anything else on stdout. */
  onLine: (line: string) => void;
  spawnChild?: typeof spawn;
}): DeployHandle => {
  const self = resolveSelfCommand();
  // The parent's own working directory, not the repository: see `deployArgs` for why. In a release
  // this makes no difference; in development it is the difference between running and not.
  const child: ChildProcess = spawnChild(self.command, [...self.args, ...deployArgs(request)], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      STACKTAPE_INIT_MCP: '',
      [INIT_TARGET_CHECK_ENV]: '',
      [INIT_TARGET_EXPECTATION_ENV]:
        request.targetExpectation === undefined ? '' : JSON.stringify(request.targetExpectation),
      FORCE_COLOR: '0'
    },
    // Agent CLIs on Windows are `.cmd` shims; the same is true of `stacktape` from PATH.
    ...(process.platform === 'win32' && !self.command.includes('\\') ? { shell: true } : {})
  });

  const consume = (stream: NodeJS.ReadableStream | null, parse: boolean) => {
    let buffered = '';
    stream?.on('data', (chunk: Buffer) => {
      buffered += chunk.toString('utf8');
      const lines = buffered.split(/\r?\n/);
      // The last element is whatever arrived without a newline; it waits for the rest of itself.
      buffered = lines.pop() ?? '';
      for (const line of lines) {
        if (line.trim() === '') continue;
        if (!parse) {
          onLine(line);
          continue;
        }
        try {
          onEvent(JSON.parse(line) as JsonlEvent);
        } catch {
          onLine(line);
        }
      }
    });
  };

  consume(child.stdout, true);
  consume(child.stderr, false);

  const finished = new Promise<number>((resolveFinished) => {
    child.on('error', (error) => {
      onLine(`Could not start the deploy: ${error.message}`);
      resolveFinished(1);
    });
    child.on('close', (code) => resolveFinished(code ?? 1));
  });

  return {
    finished,
    cancel: () => {
      terminateChild(child);
    }
  };
};
