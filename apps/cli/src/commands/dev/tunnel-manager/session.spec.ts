import { expect, test } from 'bun:test';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer, type Socket, type AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const waitFor = async (description: string, ready: () => boolean, timeout = 5000) => {
  const deadline = Date.now() + timeout;
  while (!ready()) {
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${description}.`);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

// Bore's serde unit variant is the JSON string "Heartbeat"; all other messages carry an object.
// https://github.com/ekzhang/bore/blob/main/src/shared.rs
for (const behavior of ['heartbeat', 'reconnect-cleanup', 'startup-cleanup', 'relay-reset'] as const) {
  test(`a dev tunnel ${behavior === 'heartbeat' ? 'forwards bytes after a real bore heartbeat' : behavior === 'reconnect-cleanup' ? 'cancels an in-flight reconnect during cleanup' : behavior === 'relay-reset' ? 'survives a relay reset while opening the local connection' : 'cannot finish startup after cleanup'}`, async () => {
    const directory = await mkdtemp(join(tmpdir(), 'stacktape-bore-session-'));
    const sockets = new Set<Socket>();
    const remotes = new Map<string, Socket>();
    let control: Socket | undefined;
    let pending: Socket | undefined;
    let hellos = 0;
    let accepts = 0;
    const relay = createServer((remote) => {
      sockets.add(remote);
      remote.once('close', () => sockets.delete(remote));
      const id = randomUUID();
      remotes.set(id, remote);
      control?.write(JSON.stringify({ Connection: id }) + '\0');
    });
    await new Promise<void>((resolve) => relay.listen(0, '127.0.0.1', resolve));
    const publicPort = (relay.address() as AddressInfo).port;
    const server = createServer((socket) => {
      sockets.add(socket);
      socket.once('close', () => sockets.delete(socket));
      let buffer = '';
      const receive = (chunk: Buffer) => {
        buffer += chunk.toString();
        const end = buffer.indexOf('\0');
        if (end < 0) return;
        const message = JSON.parse(buffer.slice(0, end)) as { Hello?: number; Accept?: string };
        socket.removeListener('data', receive);
        if (message.Hello === 0) {
          hellos++;
          if (hellos > 1 && behavior === 'reconnect-cleanup') {
            pending = socket;
            return;
          }
          control = socket;
          socket.write(JSON.stringify({ Hello: publicPort }) + '\0');
          if (behavior === 'heartbeat') socket.write('"Heartbeat"\0');
        } else if (message.Accept) {
          if (behavior === 'relay-reset' && ++accepts === 1) {
            socket.resetAndDestroy();
            remotes.get(message.Accept)!.destroy();
            return;
          }
          const remote = remotes.get(message.Accept)!;
          socket.pipe(remote);
          remote.pipe(socket);
          socket.once('close', () => remote.destroy());
          remote.once('close', () => socket.destroy());
        }
      };
      socket.on('data', receive);
      socket.on('error', () => {});
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const serverPort = (server.address() as AddressInfo).port;
    const driver = join(directory, 'session.ts');
    await writeFile(
      driver,
      `
import { createServer, createConnection, Socket } from 'node:net';
import { applicationManager } from ${JSON.stringify(resolve(import.meta.dir, '../../../app/application-manager/index.ts'))};
import { startTunnel, registerTunnelCleanupHook, getActiveTunnels } from ${JSON.stringify(join(import.meta.dir, 'index.ts'))};
const localSockets = new Set();
const local = createServer(socket => {
  localSockets.add(socket);
  socket.on('close', () => localSockets.delete(socket));
  socket.once('data', data => socket.write('database:' + data));
});
await new Promise(resolve => local.listen(0, '127.0.0.1', resolve));
registerTunnelCleanupHook();
if (${JSON.stringify(behavior)} === 'relay-reset') {
  // Deliberate timing injection: keep real TCP, but hold the local connect notification until the relay reset arrives.
  const emit = Socket.prototype.emit;
  Socket.prototype.emit = function(event, ...args) {
    if (event === 'connect' && this.remotePort === local.address().port) {
      setTimeout(() => emit.call(this, event, ...args), 150);
      return true;
    }
    return emit.call(this, event, ...args);
  };
}
if (${JSON.stringify(behavior)} === 'startup-cleanup') {
  // Inject cancellation between the settled handshake and the public startup promise's continuation.
  const originalCheck = AbortSignal.prototype.throwIfAborted;
  let sessionSignal;
  let checks = 0;
  AbortSignal.prototype.throwIfAborted = function () {
    originalCheck.call(this);
    sessionSignal ||= this;
    if (this === sessionSignal && ++checks === 2) queueMicrotask(() => {
      for (const hook of applicationManager.cleanUpHooks) void hook({success:true,interrupted:false});
    });
  };
  let started = false;
  try { await startTunnel('db', local.address().port); started = true; }
  catch (error) { if (error.name !== 'AbortError') throw error; }
  finally { AbortSignal.prototype.throwIfAborted = originalCheck; }
  console.log('FIXTURE ' + JSON.stringify({phase:'cancelled', started, active:getActiveTunnels().length}));
  local.close();
} else {
const tunnel = await startTunnel('db', local.address().port);
if (${JSON.stringify(behavior)} === 'relay-reset') {
  await new Promise((resolve, reject) => {
    const socket = createConnection({host:'127.0.0.1', port:tunnel.publicPort});
    const timer = setTimeout(() => { socket.destroy(); reject(new Error('reset connection did not close')); }, 2000);
    socket.on('error', () => {});
    socket.once('close', () => { clearTimeout(timer); resolve(); });
  });
  await new Promise(resolve => setTimeout(resolve, 300));
  if (localSockets.size) throw new Error('failed relay left a database connection open');
}
const answer = await new Promise((resolve, reject) => {
  const socket = createConnection({host:'127.0.0.1',port:tunnel.publicPort}, () => socket.write(Buffer.from([113, 0, 117, 101, 114, 121])));
  const timer = setTimeout(() => { socket.destroy(); reject(new Error('tunnel request timed out')); }, 2000);
  socket.once('data', data => { clearTimeout(timer); resolve(String(data)); });
  socket.once('error', reject);
});
console.log('FIXTURE ' + JSON.stringify({ phase: 'ready', answer }));
process.stdin.once('data', async () => {
  await Promise.all(applicationManager.cleanUpHooks.map(hook => hook({success:true,interrupted:false})));
  console.log('FIXTURE ' + JSON.stringify({ phase: 'stopped', active: getActiveTunnels().length }));
  local.close();
  process.stdin.destroy();
});
}
`
    );
    const child = spawn(
      process.execPath,
      ['--no-env-file', '--preload', resolve(import.meta.dir, '../../../../scripts/test-preload.ts'), driver],
      {
        cwd: resolve(import.meta.dir, '../../../..'),
        env: {
          PATH: process.env.PATH,
          HOME: directory,
          SKIP_LOADING_ENV: '1',
          STP_DISABLE_TELEMETRY: '1',
          STACKTAPE_TUNNEL_SERVER: `127.0.0.1:${serverPort}`
        },
        stdio: ['pipe', 'pipe', 'pipe']
      }
    );
    const records: Array<{ phase: string; answer?: string; active?: number; started?: boolean }> = [];
    let output = '';
    let buffer = '';
    child.stdout.on('data', (chunk) => {
      buffer += String(chunk);
      output += String(chunk);
      const lines = buffer.split('\n');
      buffer = lines.pop()!;
      for (const line of lines) if (line.startsWith('FIXTURE ')) records.push(JSON.parse(line.slice(8)));
    });
    child.stderr.on('data', (chunk) => {
      output += String(chunk);
    });
    try {
      if (behavior === 'startup-cleanup') {
        await waitFor(
          'cancelled startup',
          () => records.some(({ phase }) => phase === 'cancelled') || child.exitCode !== null
        );
        expect(
          records.find(({ phase }) => phase === 'cancelled'),
          output
        ).toMatchObject({ started: false, active: 0 });
        await waitFor('startup control socket closure', () => Boolean(control?.destroyed));
        await waitFor('startup driver exit', () => child.exitCode !== null);
        expect(child.exitCode, output).toBe(0);
        return;
      }
      await waitFor(
        `forwarded local database reply (${behavior})`,
        () => records.some(({ phase }) => phase === 'ready') || child.exitCode !== null
      );
      expect(records.find(({ phase }) => phase === 'ready')?.answer, output).toBe('database:q\0uery');
      if (behavior === 'reconnect-cleanup') {
        control!.destroy();
        await waitFor('new reconnect handshake', () => pending !== undefined).catch((error) => {
          throw new Error(String(error) + '\n' + output);
        });
      }
      child.stdin.write('stop\n');
      await waitFor('cleanup result', () => records.some(({ phase }) => phase === 'stopped'));
      expect(records.find(({ phase }) => phase === 'stopped')?.active).toBe(0);
      await waitFor(
        'owned control sockets to close',
        () => (!control || control.destroyed) && (!pending || pending.destroyed),
        1000
      );
      await waitFor('tunnel driver exit', () => child.exitCode !== null);
      expect(child.exitCode, output).toBe(0);
    } finally {
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
      await new Promise<void>((resolve) => {
        if (child.exitCode !== null || child.signalCode !== null) resolve();
        else child.once('close', () => resolve());
      });
      for (const socket of sockets) socket.destroy();
      await Promise.all([
        new Promise<void>((resolve) => server.close(() => resolve())),
        new Promise<void>((resolve) => relay.close(() => resolve()))
      ]);
      await rm(directory, { recursive: true, force: true });
    }
  }, 15_000);
}
