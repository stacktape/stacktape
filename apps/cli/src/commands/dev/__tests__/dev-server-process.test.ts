import { expect, test } from 'bun:test';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { once } from 'node:events';
import { createConnection } from 'node:net';
import { terminateDevServerProcess } from '../dev-server-process';

const serverScript = `
process.on('SIGTERM', () => {});
require('node:net').createServer().listen(0, '127.0.0.1', function () {
  console.log(JSON.stringify({ pid: process.pid, port: this.address().port }));
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

const ready = async (child: ChildProcessWithoutNullStreams) => {
  const [output] = await once(child.stdout, 'data');
  return JSON.parse(String(output)) as { pid: number; port: number };
};

test.skipIf(process.platform === 'win32')(
  'dev cleanup stops a detached watcher and preserves an unrelated server',
  async () => {
    const parent = spawn(process.execPath, [
      '-e',
      `
    process.on('SIGTERM', () => {});
    require('node:child_process').spawn(process.execPath, ['-e', ${JSON.stringify(serverScript)}], {
      detached: true, stdio: ['ignore', 'inherit', 'inherit']
    });
    setInterval(() => {}, 1000);
  `
    ]);
    const unrelated = spawn(process.execPath, ['-e', serverScript]);
    let descendant: { pid: number; port: number } | undefined;
    try {
      const [owned, other] = await Promise.all([ready(parent), ready(unrelated)]);
      descendant = owned;
      expect(await listening(owned.port)).toBeTrue();
      await terminateDevServerProcess(parent);
      expect(await listening(owned.port)).toBeFalse();
      expect(await listening(other.port)).toBeTrue();
    } finally {
      for (const child of [parent, unrelated]) {
        if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
      }
      if (descendant) {
        try {
          process.kill(descendant.pid, 'SIGKILL');
        } catch {}
      }
    }
  }
);
