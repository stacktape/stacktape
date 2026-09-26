import type { SandboxMasks } from './network-sandbox';
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { createSocket } from 'node:dgram';
import { existsSync, lstatSync, readdirSync, readFileSync, readlinkSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runBoundedProcess } from './bounded-process';
import {
  discoverSandboxMasks,
  findSocketsUnder,
  getNetworkSandboxCommand,
  getNetworkSandboxEnvironment,
  probeEgress,
  readHostNetworkState,
  SANDBOX_RESOLV_CONF,
  withDeadline
} from './network-sandbox';

// Some hosts cannot create the sandbox at all: Windows and macOS have no `unshare`, and some CI runners restrict
// unprivileged user namespaces.
const sandboxAvailable =
  Bun.which('unshare') !== null &&
  Bun.spawnSync({
    cmd: ['unshare', '--user', '--map-root-user', '--net', '--pid', '--fork', 'true'],
    stdout: 'ignore',
    stderr: 'ignore'
  }).exitCode === 0;
const python = Bun.which('python3');
const ss = Bun.which('ss', { PATH: `${process.env.PATH ?? ''}:/usr/sbin:/usr/bin` });
const hostDocker = Bun.which('docker', { PATH: '/usr/bin:/usr/sbin' });

let root: string;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'stacktape-network-sandbox-'));
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

/** Runs a Bun script inside the sandbox, bounded, with the masks this host needs. */
const runInSandbox = async (name: string, script: string, masks: SandboxMasks = discoverSandboxMasks()) => {
  const resolvConfPath = join(root, `${name}-resolv.conf`);
  await writeFile(resolvConfPath, SANDBOX_RESOLV_CONF);
  const scriptPath = join(root, `${name}.ts`);
  await writeFile(scriptPath, script);
  return runBoundedProcess({
    cmd: getNetworkSandboxCommand({ argv: [process.execPath, scriptPath], resolvConfPath, masks }),
    cwd: root,
    env: { ...(process.env as Record<string, string>), ...getNetworkSandboxEnvironment(masks) },
    timeoutMs: 60_000
  });
};

const sandboxModule = JSON.stringify(join(import.meta.dir, 'network-sandbox.ts'));

describe('network sandbox', () => {
  test.skipIf(!sandboxAvailable)(
    'allows loopback only, records every attempted name, and leaves the host as it was',
    async () => {
      const hostBefore = readHostNetworkState();
      // Long probe deadlines: the failures inside are immediate, so the process must still end at once.
      const result = await runInSandbox(
        'egress',
        `import { assertNetworkSandbox, probeEgress, startDnsRecorder } from ${sandboxModule};
const description = assertNetworkSandbox();
const recorder = await startDnsRecorder();
const loopback = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: () => new Response('local') });
const local = await (await fetch(\`http://127.0.0.1:\${loopback.port}/\`)).text();
const probes = await probeEgress({ timeoutMs: 60_000 });
loopback.stop(true);
await recorder.close();
console.log(JSON.stringify({ description, local, probes, queries: recorder.takeQueries() }));
`
      );
      expect(readHostNetworkState()).toEqual(hostBefore);
      expect(hostBefore.resolverMounts).toEqual([]);
      expect(result.stderr).toBe('');
      expect(result.exitCode).toBe(0);
      expect(result.wallMs).toBeLessThan(10_000);
      const { description, local, probes, queries } = JSON.parse(result.stdout);
      expect(description.interfaces).toEqual(['lo']);
      expect(description.uid).toBe(process.getuid!());
      expect(description.pid).toBe(1);
      expect(local).toBe('local');
      expect(probes.map(({ probe, blocked }: { probe: string; blocked: boolean }) => [probe, blocked])).toEqual([
        ['tcp 1.1.1.1:443', true],
        ['dns sts.amazonaws.com', true],
        ['https sts.amazonaws.com', true]
      ]);
      expect(queries.map(({ name }: { name: string }) => name)).toContain('sts.amazonaws.com');
    },
    90_000
  );

  test.skipIf(!sandboxAvailable)(
    'reaches no container daemon: not the Docker CLI by absolute path, not a raw socket connection',
    async () => {
      const masks = discoverSandboxMasks();
      const sockets = [...new Set([...masks.files, ...findSocketsUnder(masks.directories)])];
      const hostSocketsBefore = masks.files.filter((path) => lstatSync(path).isSocket());
      const result = await runInSandbox(
        'isolation',
        `import { assertNetworkSandbox, probeUnixSockets } from ${sandboxModule};
assertNetworkSandbox();
const docker = ${JSON.stringify(hostDocker)};
const attempts = docker
  ? [[], ['--host', 'unix:///run/docker.sock']].map((extra) => {
      const result = Bun.spawnSync({ cmd: [docker, ...extra, 'version', '--format', '{{.Server.Version}}'], stdout: 'pipe', stderr: 'pipe', env: { PATH: '/usr/bin', HOME: '/tmp' }, timeout: 20_000 });
      return { exitCode: result.exitCode, output: (result.stdout.toString() + result.stderr.toString()).trim() };
    })
  : [];
const sockets = await probeUnixSockets({ paths: ${JSON.stringify(sockets)}, pingPaths: ${JSON.stringify(masks.files)} });
console.log(JSON.stringify({ attempts, sockets }));
`,
        masks
      );
      expect(result.exitCode).toBe(0);
      const { attempts, sockets: probes } = JSON.parse(result.stdout.trim().split('\n').at(-1)!);
      for (const attempt of attempts) {
        expect(attempt.exitCode).not.toBe(0);
        expect(attempt.output).toMatch(/cannot connect/i);
      }
      expect(probes.length).toBe(sockets.length);
      for (const probe of probes) expect(probe.reached).toBe(false);
      // The masks lived only in the sandbox: the host's sockets are untouched.
      expect(masks.files.filter((path) => lstatSync(path).isSocket())).toEqual(hostSocketsBefore);
    },
    90_000
  );

  test.skipIf(!sandboxAvailable)(
    'ends a process that left its process group when the sandbox ends, without any cleanup here',
    async () => {
      const marker = `stacktape-sandbox-escape-${process.pid}-${Date.now()}`;
      // The escaped process runs a copy of sleep named after the marker, so it can be looked for by name afterwards.
      const sleeper = join(root, marker);
      await Bun.write(sleeper, Bun.file('/usr/bin/sleep'));
      Bun.spawnSync({ cmd: ['chmod', '755', sleeper] });
      const result = await runInSandbox(
        'escape',
        `import { assertNetworkSandbox } from ${sandboxModule};
const { pidNamespace } = assertNetworkSandbox();
Bun.spawnSync({ cmd: ['sh', '-c', 'setsid ${sleeper} 60 > /dev/null 2>&1 &'] });
await Bun.sleep(200);
console.log(JSON.stringify({ pidNamespace }));
`
      );
      expect(result.exitCode).toBe(0);
      expect(result.leftoverProcesses).toBe(0);
      const { pidNamespace } = JSON.parse(result.stdout.trim());
      await Bun.sleep(300);
      const survivors = readdirSync('/proc')
        .filter((entry) => /^\d+$/.test(entry))
        .filter((pid) => {
          try {
            return (
              readlinkSync(`/proc/${pid}/ns/pid`) === pidNamespace ||
              readFileSync(`/proc/${pid}/cmdline`, 'utf8').includes(marker)
            );
          } catch {
            return false;
          }
        });
      expect(survivors).toEqual([]);
    },
    90_000
  );

  test.skipIf(!sandboxAvailable)(
    'ends everything in the namespace when the sandbox is killed at its deadline, keeping the output it got',
    async () => {
      const masks = discoverSandboxMasks();
      const resolvConfPath = join(root, 'deadline-resolv.conf');
      await writeFile(resolvConfPath, SANDBOX_RESOLV_CONF);
      const scriptPath = join(root, 'deadline.ts');
      await writeFile(
        scriptPath,
        `import { assertNetworkSandbox } from ${sandboxModule};
const { pidNamespace } = assertNetworkSandbox();
Bun.spawnSync({ cmd: ['sh', '-c', 'setsid sleep 60 > /dev/null 2>&1 &'] });
console.log(JSON.stringify({ pidNamespace }));
await Bun.sleep(60_000);
`
      );
      const result = await runBoundedProcess({
        cmd: getNetworkSandboxCommand({ argv: [process.execPath, scriptPath], resolvConfPath, masks }),
        cwd: root,
        env: { ...(process.env as Record<string, string>), ...getNetworkSandboxEnvironment(masks) },
        timeoutMs: 2000
      });
      expect(result.timedOut).toBe(true);
      const { pidNamespace } = JSON.parse(result.stdout.trim().split('\n')[0]!);
      await Bun.sleep(300);
      const survivors = readdirSync('/proc')
        .filter((entry) => /^\d+$/.test(entry))
        .filter((pid) => {
          try {
            return readlinkSync(`/proc/${pid}/ns/pid`) === pidNamespace;
          } catch {
            return false;
          }
        });
      expect(survivors).toEqual([]);
    },
    60_000
  );

  test.skipIf(!sandboxAvailable)(
    'does not start the command when a mask cannot be installed',
    async () => {
      const started = join(root, 'started-despite-missing-mask');
      const result = await runInSandbox('mask-failure', `await Bun.write(${JSON.stringify(started)}, 'started');`, {
        files: ['/run/stacktape-no-such-socket'],
        directories: []
      });
      expect(result.exitCode).not.toBe(0);
      expect(existsSync(started)).toBe(false);
    },
    60_000
  );

  // `runBoundedProcess` accounts for the command's process group through `/proc`, which is Linux.
  test.skipIf(process.platform !== 'linux')(
    'refuses to run a command that was not started through the sandbox',
    async () => {
      const result = await runBoundedProcess({
        cmd: [
          process.execPath,
          '-e',
          `const { assertNetworkSandbox } = await import(${sandboxModule}); assertNetworkSandbox();`
        ],
        cwd: root,
        env: { PATH: process.env.PATH ?? '', HOME: root },
        timeoutMs: 30_000
      });
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('Not started through the network sandbox');
    },
    60_000
  );
});

describe('probe deadlines', () => {
  test('abort the attempt and clear the timer whichever way the race ends', async () => {
    let abortedAtDeadline = false;
    await expect(
      withDeadline(100, (signal) => {
        signal.addEventListener('abort', () => {
          abortedAtDeadline = true;
        });
        return new Promise<never>(() => {});
      })
    ).rejects.toThrow('no answer within 100 ms');
    expect(abortedAtDeadline).toBe(true);

    let abortedAfterSuccess = false;
    await expect(
      withDeadline(60_000, async (signal) => {
        signal.addEventListener('abort', () => {
          abortedAfterSuccess = true;
        });
        return 'answered';
      })
    ).resolves.toBe('answered');
    expect(abortedAfterSuccess).toBe(true);
  });

  test.skipIf(!python || !ss)(
    'destroy a hanging connection, cancel an unanswered query and abort an unanswered request',
    async () => {
      // A listener that never accepts: after its one-slot backlog fills, further connection attempts hang in SYN-SENT.
      const listener = Bun.spawn({
        cmd: [
          python!,
          '-c',
          'import socket,time\ns=socket.socket()\ns.bind(("127.0.0.1",0))\ns.listen(0)\nprint(s.getsockname()[1],flush=True)\ntime.sleep(60)'
        ],
        stdout: 'pipe'
      });
      const silentDns = createSocket('udp4');
      let dnsQueries = 0;
      silentDns.on('message', () => {
        dnsQueries += 1;
      });
      let requestConnections = 0;
      const requestClosed: Promise<void>[] = [];
      const silentHttp = createServer((socket) => {
        requestConnections += 1;
        // Reading lets the server notice the client's close; it never answers the TLS handshake.
        socket.resume();
        requestClosed.push(new Promise((resolveClosed) => socket.once('close', () => resolveClosed())));
      });
      try {
        const reader = listener.stdout.getReader();
        const tcpPort = Number(new TextDecoder().decode((await reader.read()).value).trim());
        reader.releaseLock();
        const { connect } = await import('node:net');
        const filler = connect(tcpPort, '127.0.0.1');
        await new Promise<void>((resolveConnect) => filler.once('connect', () => resolveConnect()));
        await new Promise<void>((resolveBind) => silentDns.bind(0, '127.0.0.1', () => resolveBind()));
        await new Promise<void>((resolveListen) => silentHttp.listen(0, '127.0.0.1', () => resolveListen()));
        const dnsPort = (silentDns.address() as { port: number }).port;
        const httpPort = (silentHttp.address() as { port: number }).port;

        const probes = await probeEgress({
          timeoutMs: 400,
          targets: {
            tcp: { host: '127.0.0.1', port: tcpPort },
            dnsName: 'nothing.invalid',
            dnsServers: [`127.0.0.1:${dnsPort}`],
            httpsUrl: `https://127.0.0.1:${httpPort}/`
          }
        });
        filler.destroy();
        for (const probe of probes) {
          expect(probe.blocked).toBe(true);
          expect(probe.ms).toBeGreaterThanOrEqual(350);
          expect(probe.ms).toBeLessThan(3000);
        }
        // Nothing the probes started is left: no half-open connection, no repeated query, no open request.
        const synSent = Bun.spawnSync({
          cmd: [ss!, '-Htn', 'state', 'syn-sent', `( dport = :${tcpPort} )`],
          stdout: 'pipe'
        });
        expect(synSent.stdout.toString().trim()).toBe('');
        expect(dnsQueries).toBe(1);
        expect(requestConnections).toBe(1);
        await Promise.race([
          Promise.all(requestClosed),
          new Promise((_, reject) => setTimeout(() => reject(new Error('request connection still open')), 2000).unref())
        ]);
        const established = Bun.spawnSync({
          cmd: [ss!, '-Htn', 'state', 'established', `( dport = :${httpPort} )`],
          stdout: 'pipe'
        });
        expect(established.stdout.toString().trim()).toBe('');
        // A cancelled query is not retried.
        await Bun.sleep(1200);
        expect(dnsQueries).toBe(1);
      } finally {
        listener.kill();
        silentDns.close();
        silentHttp.close();
      }
    },
    30_000
  );
});
