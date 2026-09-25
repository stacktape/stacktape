import { afterEach, describe, expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { extractZip, postBeforeDeadline, removeContainer } from './lambda-runtime';

const servers: { stop: (closeActiveConnections?: boolean) => void }[] = [];

afterEach(() => {
  for (const server of servers.splice(0)) server.stop(true);
});

const expectRejectedWithin = async (promise: Promise<unknown>, startedAt: number, limitMs: number) => {
  await expect(promise).rejects.toThrow('did not answer before the deadline');
  expect(Date.now() - startedAt).toBeLessThan(limitMs);
};

describe('invoking the Lambda runtime emulator', () => {
  test('gives up at the deadline when a request is accepted but never answered', async () => {
    const server = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: () => new Promise<Response>(() => {}) });
    servers.push(server);
    const startedAt = Date.now();

    await expectRejectedWithin(
      postBeforeDeadline({ url: `http://127.0.0.1:${server.port}/`, body: '{}', deadline: startedAt + 500 }),
      startedAt,
      3000
    );
  });

  test('gives up at the deadline when the answer starts but its body never ends', async () => {
    const server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch: () =>
        new Response(
          new ReadableStream({
            start: (controller) => controller.enqueue(new TextEncoder().encode('{"partial":'))
          })
        )
    });
    servers.push(server);
    const startedAt = Date.now();

    await expectRejectedWithin(
      postBeforeDeadline({ url: `http://127.0.0.1:${server.port}/`, body: '{}', deadline: startedAt + 500 }),
      startedAt,
      3000
    );
  });

  test('keeps retrying a refused connection only until the deadline', async () => {
    const server = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: () => new Response('unused') });
    const { port } = server;
    server.stop(true);
    const startedAt = Date.now();

    await expectRejectedWithin(
      postBeforeDeadline({ url: `http://127.0.0.1:${port}/`, body: '{}', deadline: startedAt + 600 }),
      startedAt,
      3000
    );
  });

  test('returns the status and complete body of an answer', async () => {
    const server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch: async (request) => new Response(`echo ${await request.text()}`)
    });
    servers.push(server);

    expect(
      await postBeforeDeadline({ url: `http://127.0.0.1:${server.port}/`, body: 'ping', deadline: Date.now() + 5000 })
    ).toEqual({ status: 200, body: 'echo ping' });
  });
});

describe('container removal', () => {
  const runner = (psResult: { exitCode: number; stdout: string }) => (command: string[]) =>
    command[1] === 'ps' ? { ...psResult, stderr: '' } : { exitCode: 0, stdout: '', stderr: '' };

  test('counts as verified only when docker ps succeeds and no longer lists the container', () => {
    expect(() => removeContainer('stp-test', runner({ exitCode: 0, stdout: '' }))).not.toThrow();
    expect(() => removeContainer('stp-test', runner({ exitCode: 1, stdout: '' }))).toThrow(
      'Could not verify that container stp-test was removed'
    );
    expect(() => removeContainer('stp-test', runner({ exitCode: 0, stdout: 'abc123\n' }))).toThrow(
      'is still present after removal'
    );
  });
});

describe('extraction', () => {
  test('removes its own directory when extraction fails', async () => {
    let directory = '';
    const failingUnzip = (command: string[]) => {
      directory = command.at(-1)!;
      return { exitCode: 9, stdout: '', stderr: 'unzip: cannot find zipfile' };
    };

    await expect(extractZip('/missing.zip', failingUnzip)).rejects.toThrow('unzip -q -o failed (9)');
    expect(directory).not.toBe('');
    expect(existsSync(directory)).toBe(false);
  });
});
