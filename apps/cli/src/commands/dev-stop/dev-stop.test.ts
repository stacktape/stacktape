import { expect, test } from 'bun:test';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// `stacktape dev:stop --agentPort <port>` is the stop command the dev agent prints at startup. It must return only once
// the agent process is gone: an assistant restarts dev mode right after it, and a still-running agent holds the ports,
// containers and dev servers the new session needs. The agent below answers with the real agent's response envelope.
const CLI_DIRECTORY = join(import.meta.dir, '..', '..', '..');

const agentScript = (behavior: 'slow-cleanup' | 'ignores-stop') => `
const send = (response, data) => {
  response.writeHead(200, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ v: '1.0', ok: true, code: 'OK', message: 'OK', data }));
};
const server = require('node:http').createServer((request, response) => {
  if (request.url.startsWith('/status')) return send(response, { phase: 'ready', ready: true, workloads: {}, pid: process.pid });
  if (request.url === '/health') return send(response, { phase: 'ready' });
  if (request.url === '/stop' && request.method === 'POST') {
    send(response, {});
    // Stopping containers and dev servers takes a few seconds in a real session.
    if (${JSON.stringify(behavior)} === 'slow-cleanup') setTimeout(() => process.exit(0), 3000);
    return;
  }
  response.writeHead(404).end();
});
process.on('SIGTERM', () => {});
server.listen(0, '127.0.0.1', () => console.log(JSON.stringify({ port: server.address().port })));`;

const isRunning = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const startAgent = async (behavior: 'slow-cleanup' | 'ignores-stop') => {
  const agent = spawn(process.execPath, ['-e', agentScript(behavior)]);
  const [output] = await once(agent.stdout, 'data');
  return { agent, port: (JSON.parse(String(output)) as { port: number }).port };
};

const runDevStop = async (port: number) => {
  const home = await mkdtemp(join(tmpdir(), 'stacktape-dev-stop-'));
  try {
    const child = spawn(process.execPath, ['scripts/dev.ts', 'dev:stop', '--agentPort', String(port), '--agent'], {
      cwd: CLI_DIRECTORY,
      env: {
        PATH: process.env.PATH,
        HOME: home,
        SKIP_LOADING_ENV: '1',
        STP_DISABLE_TELEMETRY: '1',
        AWS_EC2_METADATA_DISABLED: 'true'
      }
    });
    let output = '';
    child.stdout.on('data', (data) => (output += data));
    child.stderr.on('data', (data) => (output += data));
    const [exitCode] = (await once(child, 'exit')) as [number | null];
    return { exitCode, output };
  } finally {
    await rm(home, { recursive: true, force: true });
  }
};

const stopIfRunning = (agent: ChildProcessWithoutNullStreams) => {
  if (agent.exitCode === null && agent.signalCode === null) agent.kill('SIGKILL');
};

test('dev:stop returns after the agent has finished stopping', async () => {
  const { agent, port } = await startAgent('slow-cleanup');
  try {
    const { exitCode, output } = await runDevStop(port);
    expect(output).toContain('Dev agent stopped.');
    expect(exitCode).toBe(0);
    expect(isRunning(agent.pid!)).toBeFalse();
  } finally {
    stopIfRunning(agent);
  }
}, 60_000);

test('dev:stop ends an agent that does not stop on request', async () => {
  const { agent, port } = await startAgent('ignores-stop');
  try {
    const { exitCode } = await runDevStop(port);
    expect(exitCode).toBe(0);
    expect(isRunning(agent.pid!)).toBeFalse();
  } finally {
    stopIfRunning(agent);
  }
}, 60_000);
