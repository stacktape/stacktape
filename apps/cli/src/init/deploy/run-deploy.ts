/**
 * Running the first deploy, from the wizard.
 *
 * The deploy runs as a *child* `stacktape deploy --agent`, not as a function call inside this
 * process. That is the important decision here, and it is not laziness: the deploy command owns
 * global state — the resolved config, the AWS clients, the event manager, the TUI — and running it
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
import { terminateChild } from '../terminate-child';

export type DeployRequest = {
  /** Directory holding the configuration. The child runs here, so relative paths resolve. */
  repositoryRoot: string;
  configPath: string;
  stage: string;
  region: string;
  projectName: string;
  /** Named AWS profile, when the user picked one rather than using the ambient credentials. */
  profile?: string;
  /**
   * Leave whatever was created in place if this attempt fails.
   *
   * Set only when the stack already exists. A failed *update* stops at `UPDATE_FAILED`, which
   * CloudFormation will deploy over, so the resources that did come up — a database that took
   * minutes — are still there for the next attempt. A failed *create* stops at `CREATE_FAILED`,
   * which nothing can update, so keeping it there only forces a manual rollback first.
   */
  keepPartialProgress?: boolean;
};

export type DeployHandle = {
  /** Resolves with the child's exit code once it has finished. */
  finished: Promise<number>;
  /** Stops the deploy. CloudFormation keeps going; this only stops watching and reporting. */
  cancel: () => void;
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
    ...(request.profile === undefined ? [] : ['--profile', request.profile])
  ]
    .map((part) => (part.includes(' ') ? `"${part}"` : part))
    .join(' ');

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
    env: { ...process.env, STACKTAPE_INIT_MCP: '', FORCE_COLOR: '0' },
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
