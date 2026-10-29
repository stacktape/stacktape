import { expect, test } from 'bun:test';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createConnection } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// `stacktape dev:stop --agentPort <port>` is the stop command the dev agent prints at startup. It must return only once
// the agent process is gone: an assistant restarts dev mode right after it, and a still-running agent holds the ports,
// containers and dev servers the new session needs. The agent below answers with the real agent's response envelope.
const CLI_DIRECTORY = join(import.meta.dir, '..', '..', '..');

const descendantScript = `
process.on('SIGTERM', () => {});
require('node:net').createServer().listen(0, '127.0.0.1', function () {
  console.log(JSON.stringify({ descendantPid: process.pid, descendantPort: this.address().port }));
});`;

const listening = (port: number) =>
  new Promise<boolean>((resolve) => {
    const socket = createConnection({ host: '127.0.0.1', port });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });

const agentScript = (
  behavior: 'slow-cleanup' | 'ignores-stop' | 'rejects-stop',
  status: Record<string, unknown> = {}
) => `
const send = (response, data) => {
  response.writeHead(200, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ v: '1.0', ok: true, code: 'OK', message: 'OK', data }));
};
const server = require('node:http').createServer((request, response) => {
  if (request.url.startsWith('/status')) return send(response, { phase: 'ready', ready: true, workloads: {}, pid: process.pid, ...${JSON.stringify(status)} });
  if (request.url === '/health') return send(response, { phase: 'ready' });
  if (request.url === '/stop' && request.method === 'POST') {
    if (${JSON.stringify(behavior)} === 'rejects-stop') { response.destroy(); return; }
    send(response, {});
    // Stopping containers and dev servers takes a few seconds in a real session.
    if (${JSON.stringify(behavior)} === 'slow-cleanup') setTimeout(() => process.exit(0), 3000);
    return;
  }
  response.writeHead(404).end();
});
process.on('SIGTERM', () => {});
server.listen(0, '127.0.0.1', () => {
  const child = require('node:child_process').spawn(process.execPath, ['-e', ${JSON.stringify(descendantScript)}], {
    detached: true, stdio: ['ignore', 'pipe', 'inherit']
  });
  child.stdout.once('data', (data) => console.log(JSON.stringify({ port: server.address().port, ...JSON.parse(String(data)) })));
});`;

const isRunning = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const startAgent = async (
  behavior: 'slow-cleanup' | 'ignores-stop' | 'rejects-stop',
  status: Record<string, unknown> = {}
) => {
  const agent = spawn(process.execPath, ['-e', agentScript(behavior, status)]);
  const [output] = await once(agent.stdout, 'data');
  return { agent, ...(JSON.parse(String(output)) as { port: number; descendantPid: number; descendantPort: number }) };
};

const runCli = async (
  args: string[],
  { home: givenHome, env = {} }: { home?: string; env?: Record<string, string> } = {}
) => {
  const home = givenHome ?? (await mkdtemp(join(tmpdir(), 'stacktape-dev-stop-')));
  try {
    // `--no-env-file`: Bun would otherwise load `apps/cli/.env.local`, which on a developer machine holds an API key.
    // dev:stop is local and must work with no key and an empty HOME.
    const child = spawn(
      process.execPath,
      [
        '--no-env-file',
        '--preload',
        join(CLI_DIRECTORY, 'scripts/network-guard-preload.ts'),
        'scripts/dev.ts',
        ...args,
        '--agent'
      ],
      {
        cwd: CLI_DIRECTORY,
        env: {
          PATH: process.env.PATH,
          HOME: home,
          SKIP_LOADING_ENV: '1',
          STP_DISABLE_TELEMETRY: '1',
          AWS_EC2_METADATA_DISABLED: 'true',
          ...env
        }
      }
    );
    let output = '';
    child.stdout.on('data', (data) => (output += data));
    child.stderr.on('data', (data) => (output += data));
    const deadline = setTimeout(() => child.kill('SIGKILL'), 45_000);
    const [exitCode] = (await once(child, 'close')) as [number | null];
    clearTimeout(deadline);
    return { exitCode, output };
  } finally {
    if (!givenHome) await rm(home, { recursive: true, force: true });
  }
};

const runDevStop = (port: number, options: { home?: string } = {}) =>
  runCli(['dev:stop', '--agentPort', String(port)], options);

const stopIfRunning = (agent: ChildProcessWithoutNullStreams) => {
  if (agent.exitCode === null && agent.signalCode === null) agent.kill('SIGKILL');
};

test('dev:stop returns after the agent has finished stopping', async () => {
  const { agent, port, descendantPid } = await startAgent('slow-cleanup');
  try {
    const { exitCode, output } = await runDevStop(port);
    expect(output).not.toContain('API_KEY');
    expect(output).toContain('Dev agent stopped.');
    expect(exitCode).toBe(0);
    expect(isRunning(agent.pid!)).toBeFalse();
  } finally {
    stopIfRunning(agent);
    try {
      process.kill(descendantPid, 'SIGKILL');
    } catch {}
  }
}, 60_000);

test.skipIf(process.platform === 'win32').each(['ignores-stop', 'rejects-stop'] as const)(
  'dev:stop frees descendant ports when the agent %s',
  async (behavior) => {
    const { agent, port, descendantPid, descendantPort } = await startAgent(behavior);
    const unrelated = await startAgent('ignores-stop');
    try {
      expect(await listening(descendantPort)).toBeTrue();
      const { exitCode } = await runDevStop(port);
      expect(exitCode).toBe(0);
      expect(isRunning(agent.pid!)).toBeFalse();
      expect(await listening(descendantPort)).toBeFalse();
      expect(await listening(unrelated.descendantPort)).toBeTrue();
    } finally {
      stopIfRunning(unrelated.agent);
      try {
        process.kill(unrelated.descendantPid, 'SIGKILL');
      } catch {}
      stopIfRunning(agent);
      try {
        process.kill(descendantPid, 'SIGKILL');
      } catch {}
    }
  },
  60_000
);

// The real agent server, with the application manager's signal handling, as the `dev` command runs it. `dev:stop`
// must reach its stop route, and the route must run the registered cleanup hooks (Lambda environment restore, container
// stop) before the process ends; a stop that only kills the agent leaves deployed functions pointing at a dead relay.
const startRealAgent = async (directory: string) => {
  const driver = join(directory, 'agent.ts');
  await writeFile(
    driver,
    `
import { createServer } from 'node:net';
import { applicationManager } from ${JSON.stringify(join(CLI_DIRECTORY, 'src/app/application-manager/index.ts'))};
import { existsSync } from 'node:fs';
import { getAgentTokenFile, registerAgentCleanupHook, startAgentServer, updateAgentState } from ${JSON.stringify(join(CLI_DIRECTORY, 'src/commands/dev/agent-server.ts'))};
await applicationManager.init();
registerAgentCleanupHook();
applicationManager.registerCleanUpHook(async () => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  console.log('FIXTURE cleanup-hook-ran');
});
const probe = createServer();
await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve));
const port = probe.address().port;
await new Promise((resolve) => probe.close(resolve));
await startAgentServer(port, ${JSON.stringify(directory)});
// The session finishes starting once the test creates this file.
const readyTimer = setInterval(() => {
  if (!existsSync(${JSON.stringify(join(directory, 'ready'))})) return;
  updateAgentState({ phase: 'ready' });
  clearInterval(readyTimer);
}, 50);
console.log(JSON.stringify({ port, pid: process.pid, tokenFile: getAgentTokenFile() }));
`
  );
  const agent = spawn(
    process.execPath,
    ['--no-env-file', '--preload', join(CLI_DIRECTORY, 'scripts/test-preload.ts'), driver],
    {
      cwd: CLI_DIRECTORY,
      env: { PATH: process.env.PATH, HOME: directory, SKIP_LOADING_ENV: '1', STP_DISABLE_TELEMETRY: '1' }
    }
  );
  let output = '';
  const started = new Promise<{ port: number; pid: number; tokenFile: string }>((resolve, reject) => {
    agent.stdout.on('data', (data) => {
      output += data;
      const line = output.split('\n').find((candidate) => candidate.startsWith('{"port"'));
      if (line) resolve(JSON.parse(line));
    });
    agent.stderr.on('data', (data) => (output += data));
    agent.once('exit', (code) => reject(new Error(`agent exited early (${code}): ${output}`)));
  });
  return { agent, ...(await started), output: () => output };
};

test('dev:stop ends a real dev agent through its stop route after its cleanup hooks ran', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-real-agent-'));
  const { agent, port, tokenFile, output } = await startRealAgent(directory);
  try {
    // The token is kept per user under the agent's port, not in the directory dev mode was started in.
    expect(tokenFile).toBe(join(directory, '.stacktape', 'dev-agent-tokens', `${port}.token`));
    const token = await readFile(tokenFile, 'utf8');
    const status = (await (
      await fetch(`http://127.0.0.1:${port}/status`, { headers: { authorization: `Bearer ${token}` } })
    ).json()) as { data: { pid: number } };
    expect(status.data.pid).toBe(agent.pid!);

    // Another user (another HOME) has no token for this port: dev:stop cannot stop the agent and says why.
    const refused = await runDevStop(port);
    expect(refused.exitCode).toBe(1);
    expect(refused.output).toContain('refused the dev agent session token');
    expect(refused.output).not.toContain('No dev agent found');
    expect(isRunning(agent.pid!)).toBeTrue();

    // The same user stops it from a directory other than the one dev mode was started in (dev:stop runs in the CLI
    // package, the agent in its own directory).
    const result = await runDevStop(port, { home: directory });
    expect(result.output).toContain('Dev agent stopped.');
    expect(result.exitCode).toBe(0);
    expect(isRunning(agent.pid!)).toBeFalse();
    expect(output()).toContain('FIXTURE cleanup-hook-ran');
    // The agent removes its token when it stops; a later agent on the port gets a new one.
    expect(existsSync(tokenFile)).toBeFalse();
  } finally {
    stopIfRunning(agent);
    await rm(directory, { recursive: true, force: true });
  }
}, 60_000);

// An assistant that runs `dev --agent` again while its agent is running must get the same result as for a new agent:
// MCP and other JSONL clients take the agent's port and token file from it.
test('dev --agent reports an agent that is already running like a new one', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-real-agent-'));
  const { agent, port, pid, tokenFile } = await startRealAgent(directory);
  try {
    const project = join(directory, 'project');
    await mkdir(join(project, '.stacktape', 'dev-agents'), { recursive: true });
    await writeFile(
      join(project, '.stacktape', 'dev-agents', 'fixture-dev.json'),
      JSON.stringify({
        pid,
        port,
        phase: 'ready',
        projectName: 'fixture',
        stage: 'dev',
        region: 'eu-west-1',
        profile: 'fixture',
        awsAccountId: '111111111111',
        startedAt: new Date().toISOString(),
        workloads: ['api'],
        databases: [],
        logFile: join(directory, `${port}-logs.txt`)
      })
    );
    // A profile that names its account: the start compares the agent's target without asking AWS.
    await writeFile(
      join(directory, 'aws-config'),
      '[profile fixture]\nregion = eu-west-1\nsso_session = fixture\nsso_account_id = 111111111111\nsso_role_name = Developer\n\n[sso-session fixture]\nsso_start_url = https://example.awsapps.com/start\nsso_region = eu-west-1\n'
    );
    await writeFile(join(directory, 'aws-credentials'), '');
    const report = async () => {
      const { exitCode, output } = await runCli(
        [
          'dev',
          '--projectName',
          'fixture',
          '--stage',
          'dev',
          '--region',
          'eu-west-1',
          '--currentWorkingDirectory',
          project
        ],
        // `dev` requires a key before it runs; this path never sends it anywhere (the network guard would refuse).
        {
          home: directory,
          env: {
            STACKTAPE_API_KEY: 'test-value',
            AWS_PROFILE: 'fixture',
            AWS_CONFIG_FILE: join(directory, 'aws-config'),
            AWS_SHARED_CREDENTIALS_FILE: join(directory, 'aws-credentials')
          }
        }
      );
      const final = output
        .split('\n')
        .filter((line) => line.startsWith('{'))
        .map(
          (line) =>
            JSON.parse(line) as {
              type?: string;
              ok?: boolean;
              code?: string;
              data?: { result?: Record<string, unknown>; ready?: boolean };
            }
        )
        .find((event) => event.type === 'result');
      return { exitCode, output, final };
    };

    // Still starting: the session is reported with its details, but not as started, and without AGENT_READY.
    const starting = await report();
    expect(starting.exitCode).toBe(1);
    expect(starting.final).toMatchObject({ ok: false, code: 'DEV_SESSION_NOT_READY', data: { ready: false } });
    expect(starting.final?.data?.result).toMatchObject({ port, projectName: 'fixture', stage: 'dev', tokenFile });
    expect(starting.output).not.toContain('AGENT_READY');
    expect(isRunning(agent.pid!)).toBeTrue();

    await writeFile(join(directory, 'ready'), '');
    await new Promise((resolve) => setTimeout(resolve, 300));
    const ready = await report();
    expect(ready.exitCode).toBe(0);
    expect(ready.final?.ok).toBeTrue();
    expect(ready.final?.data?.result).toMatchObject({ port, projectName: 'fixture', stage: 'dev', tokenFile });
    expect(isRunning(agent.pid!)).toBeTrue();
  } finally {
    stopIfRunning(agent);
    await rm(directory, { recursive: true, force: true });
  }
}, 60_000);

// Every agent stores its token under its port in the user's state directory, which is how `dev stop` and a restarted MCP
// server find agents whose lock file is in another directory. These fixtures report a project directory and stage.
const startProjectAgent = async (home: string, status: { projectDirectory: string; stage: string }) => {
  const started = await startAgent('slow-cleanup', { projectName: 'fixture', ...status });
  await mkdir(join(home, '.stacktape', 'dev-agent-tokens'), { recursive: true });
  await writeFile(join(home, '.stacktape', 'dev-agent-tokens', `${started.port}.token`), 'fixture-token');
  return started;
};

const parseResult = (output: string) =>
  output
    .split('\n')
    .filter((line) => line.startsWith('{'))
    .map((line) => JSON.parse(line) as { type?: string; ok?: boolean; code?: string; message?: string; data?: any })
    .find((event) => event.type === 'result');

// `dev stop` used to fall back to port 7331 when the directory had no lock file and stopped another worktree's agent.
// It now stops only an agent that reports this project directory, and stops none when several match.
test.skipIf(process.platform === 'win32')(
  'dev stop stops only the agent of its project directory and refuses to guess between stages',
  async () => {
    const home = await mkdtemp(join(tmpdir(), 'stacktape-dev-stop-home-'));
    const project = join(home, 'project');
    const otherWorktree = join(home, 'other-worktree');
    await mkdir(project, { recursive: true });
    await mkdir(otherWorktree, { recursive: true });
    const other = await startProjectAgent(home, { projectDirectory: otherWorktree, stage: 'dev' });
    const dev = await startProjectAgent(home, { projectDirectory: project, stage: 'dev' });
    const test = await startProjectAgent(home, { projectDirectory: project, stage: 'test' });
    try {
      const ambiguous = await runCli(['dev:stop', '--cwd', project], { home });
      expect(ambiguous.exitCode).toBe(1);
      expect(parseResult(ambiguous.output)).toMatchObject({ ok: false, code: 'CLI_DEV_STOP_AMBIGUOUS' });
      expect(parseResult(ambiguous.output)?.message).toContain(`fixture/test on port ${test.port}`);
      expect([isRunning(dev.agent.pid!), isRunning(test.agent.pid!), isRunning(other.agent.pid!)]).toEqual([
        true,
        true,
        true
      ]);

      const stopped = await runCli(['dev:stop', '--cwd', project, '--stage', 'test'], { home });
      expect(stopped.exitCode).toBe(0);
      expect(parseResult(stopped.output)?.data?.result).toEqual({
        stopped: [{ port: test.port, projectName: 'fixture', stage: 'test' }]
      });
      expect([isRunning(dev.agent.pid!), isRunning(test.agent.pid!), isRunning(other.agent.pid!)]).toEqual([
        true,
        false,
        true
      ]);

      // A directory with no agent of its own stops nothing, and names the agents of other directories.
      const elsewhere = join(home, 'elsewhere');
      await mkdir(elsewhere);
      const nothing = await runCli(['dev:stop', '--cwd', elsewhere], { home });
      expect(nothing.exitCode).toBe(0);
      expect(parseResult(nothing.output)?.data?.result).toEqual({ stopped: [] });
      expect(nothing.output).toContain(`in ${otherWorktree}`);
      expect(isRunning(other.agent.pid!)).toBeTrue();
    } finally {
      for (const { agent, descendantPid } of [other, dev, test]) {
        stopIfRunning(agent);
        try {
          process.kill(descendantPid, 'SIGKILL');
        } catch {}
      }
      await rm(home, { recursive: true, force: true });
    }
  },
  90_000
);

// A lock file can outlive its agent while another project's agent took over its port. dev stop must not stop that agent.
test.skipIf(process.platform === 'win32')(
  'dev stop ignores a stale lock file whose port now answers for another session',
  async () => {
    const home = await mkdtemp(join(tmpdir(), 'stacktape-dev-stop-stale-'));
    const project = join(home, 'project');
    const elsewhere = join(home, 'elsewhere');
    await mkdir(join(project, '.stacktape', 'dev-agents'), { recursive: true });
    await mkdir(elsewhere);
    const other = await startProjectAgent(home, { projectDirectory: elsewhere, stage: 'dev' });
    const lockFile = join(project, '.stacktape', 'dev-agents', 'fixture-dev.json');
    await writeFile(
      lockFile,
      JSON.stringify({
        pid: other.agent.pid,
        port: other.port,
        phase: 'ready',
        projectName: 'fixture',
        stage: 'dev',
        region: 'eu-west-1',
        startedAt: new Date().toISOString(),
        workloads: [],
        databases: [],
        sessionId: 'session-that-wrote-the-lock'
      })
    );
    try {
      const run = await runCli(['dev:stop', '--cwd', project], { home });
      expect(run.exitCode).toBe(0);
      expect(parseResult(run.output)?.data?.result).toEqual({ stopped: [] });
      expect(isRunning(other.agent.pid!)).toBeTrue();
      expect(existsSync(lockFile)).toBeFalse();
    } finally {
      stopIfRunning(other.agent);
      try {
        process.kill(other.descendantPid, 'SIGKILL');
      } catch {}
      await rm(home, { recursive: true, force: true });
    }
  },
  60_000
);

// The daemon parent used to keep only the child's code and message, so the hint that says how to fix a failed start
// never reached the agent. It also printed nothing until the start ended; the agent's port comes first now.
test('dev --agent reports the agent port at once and passes the daemon error code and hints through', async () => {
  const home = await mkdtemp(join(tmpdir(), 'stacktape-dev-agent-fail-'));
  const project = join(home, 'project');
  await mkdir(project);
  try {
    const { exitCode, output } = await runCli(
      ['dev', '--stage', 'dev', '--region', 'eu-west-1', '--currentWorkingDirectory', project],
      // The parent accepts any key. The daemon receives it too, and inherits the network guard, which refuses its first
      // Console request.
      { home, env: { STACKTAPE_API_KEY: 'test-value' } }
    );
    expect(exitCode).toBe(1);
    const records = output
      .split('\n')
      .filter((line) => line.startsWith('{'))
      .map((line) => JSON.parse(line) as { type?: string; detail?: { kind?: string; agentPort?: number } });
    expect(records[0]).toMatchObject({ type: 'event', eventType: 'DEV_SESSION', detail: { kind: 'dev-agent' } });
    const result = parseResult(output);
    // The daemon fails before it touches AWS or the Console, and its own code comes through instead of the parent's
    // generic start failure. That its hints come through too is covered with a hinted refusal in
    // tests/cli-process/aws-account-selection.spec.ts.
    expect(result?.ok).toBe(false);
    expect(result?.code).not.toBe('CLI_DEV_AGENT_START_FAILED');
    expect(result?.message).not.toContain('Failed to start dev agent');
    expect(result?.message).toContain('Tests cannot access external network target');
  } finally {
    await rm(home, { recursive: true, force: true });
  }
}, 60_000);

// `dev stop --cleanup-containers` removed every left-behind dev container on the machine, including another project's.
// It removes this project directory's containers (with `--stage`, that stage's), `--all` those of every project, and it
// reports what it removed. A fake `docker` lists the containers and records the removals, so no real container is
// at risk.
test.skipIf(process.platform === 'win32')(
  'dev:stop --cleanupContainers removes only the containers of this project directory unless --all is given',
  async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-dev-cleanup-'));
    try {
      const shop = join(root, 'shop');
      const blog = join(root, 'blog');
      await mkdir(join(shop, '.stacktape', 'dev-agents'), { recursive: true });
      const lock = (directory: string, stage: string) =>
        join(directory, '.stacktape', 'dev-agents', `app-${stage}.json`);
      const containers = [
        ['stp-app-dev-1-db', 'exited', lock(shop, 'dev'), '4100', 'dev'],
        ['stp-app-test-1-db', 'exited', lock(shop, 'test'), '4101', 'test'],
        ['stp-app-dev-2-db', 'exited', lock(blog, 'dev'), '4200', 'dev'],
        ['stp-old-dev-db', 'exited', '', '', '']
      ];
      const bin = join(root, 'bin');
      await mkdir(bin);
      const removedLog = join(root, 'removed.log');
      await writeFile(join(root, 'ps.txt'), `${containers.map((fields) => fields.join('\t')).join('\n')}\n`);
      await writeFile(
        join(bin, 'docker'),
        `#!/bin/sh\nif [ "$1" = ps ]; then cat '${join(root, 'ps.txt')}'; exit 0; fi\nif [ "$1" = rm ]; then echo "$3" >> '${removedLog}'; fi\nexit 0\n`,
        { mode: 0o755 }
      );
      const cleanup = async (...args: string[]) => {
        await rm(removedLog, { force: true });
        const { exitCode, output } = await runCli(['dev:stop', '--cleanupContainers', '--cwd', shop, ...args], {
          env: { PATH: `${bin}:${process.env.PATH}` }
        });
        expect(exitCode).toBe(0);
        const result = output
          .split('\n')
          .filter((line) => line.startsWith('{'))
          .map((line) => JSON.parse(line))
          .find((record) => record.type === 'result');
        const removed = existsSync(removedLog) ? (await readFile(removedLog, 'utf8')).trim().split('\n') : [];
        expect(result.data.result.removedContainers).toEqual(removed);
        return removed;
      };

      expect(await cleanup()).toEqual(['stp-app-dev-1-db', 'stp-app-test-1-db']);
      expect(await cleanup('--stage', 'test')).toEqual(['stp-app-test-1-db']);
      expect(await cleanup('--all')).toEqual(containers.map(([name]) => name));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
  120_000
);
