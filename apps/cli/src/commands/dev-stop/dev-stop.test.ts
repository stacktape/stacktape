import { expect, test } from 'bun:test';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
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

const agentScript = (behavior: 'slow-cleanup' | 'ignores-stop' | 'rejects-stop') => `
const send = (response, data) => {
  response.writeHead(200, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ v: '1.0', ok: true, code: 'OK', message: 'OK', data }));
};
const server = require('node:http').createServer((request, response) => {
  if (request.url.startsWith('/status')) return send(response, { phase: 'ready', ready: true, workloads: {}, pid: process.pid });
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

const startAgent = async (behavior: 'slow-cleanup' | 'ignores-stop' | 'rejects-stop') => {
  const agent = spawn(process.execPath, ['-e', agentScript(behavior)]);
  const [output] = await once(agent.stdout, 'data');
  return { agent, ...(JSON.parse(String(output)) as { port: number; descendantPid: number; descendantPort: number }) };
};

const runDevStop = async (port: number) => {
  const home = await mkdtemp(join(tmpdir(), 'stacktape-dev-stop-'));
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
        'dev:stop',
        '--agentPort',
        String(port),
        '--agent'
      ],
      {
        cwd: CLI_DIRECTORY,
        env: {
          PATH: process.env.PATH,
          HOME: home,
          SKIP_LOADING_ENV: '1',
          STP_DISABLE_TELEMETRY: '1',
          AWS_EC2_METADATA_DISABLED: 'true'
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
    await rm(home, { recursive: true, force: true });
  }
};

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
import { startAgentServer } from ${JSON.stringify(join(CLI_DIRECTORY, 'src/commands/dev/agent-server.ts'))};
await applicationManager.init();
applicationManager.registerCleanUpHook(async () => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  console.log('FIXTURE cleanup-hook-ran');
});
const probe = createServer();
await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve));
const port = probe.address().port;
await new Promise((resolve) => probe.close(resolve));
await startAgentServer(port, ${JSON.stringify(directory)}, () => null);
console.log(JSON.stringify({ port, pid: process.pid }));
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
  const started = new Promise<{ port: number; pid: number }>((resolve, reject) => {
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
  const { agent, port, output } = await startRealAgent(directory);
  try {
    const status = (await (await fetch(`http://127.0.0.1:${port}/status`)).json()) as { data: { pid: number } };
    expect(status.data.pid).toBe(agent.pid!);
    const result = await runDevStop(port);
    expect(result.output).toContain('Dev agent stopped.');
    expect(result.exitCode).toBe(0);
    expect(isRunning(agent.pid!)).toBeFalse();
    expect(output()).toContain('FIXTURE cleanup-hook-ran');
  } finally {
    stopIfRunning(agent);
    await rm(directory, { recursive: true, force: true });
  }
}, 60_000);
