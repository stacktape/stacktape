import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const cleanups: (() => Promise<void> | void)[] = [];

afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

/**
 * Lambda runs the responder under Node, whose `fetch` sends the Content-Length it is given; Bun's recomputes it. The
 * responder is therefore bundled for Node, as the helper Lambdas are, and run by Node against a loopback server.
 */
const respondFromNode = async ({ url, reason }: { url: string; reason: string }) => {
  const directory = await mkdtemp(join(tmpdir(), 'stp-cloudformation-response-'));
  cleanups.push(() => rm(directory, { recursive: true, force: true }));
  const entry = join(directory, 'entry.ts');
  await writeFile(
    entry,
    `import { respondToCloudformation } from ${JSON.stringify(join(import.meta.dir, 'cloudformation.ts'))};
const [url, reason] = process.argv.slice(2);
const response = await respondToCloudformation({
  event: { ResponseURL: url, StackId: 'stack', RequestId: 'request', LogicalResourceId: 'Resource' },
  logGroupName: '/aws/lambda/function',
  error: new Error(reason)
});
console.log(response.status);
`
  );
  const built = await Bun.build({
    entrypoints: [entry],
    outdir: directory,
    target: 'node',
    format: 'esm',
    naming: 'entry.mjs'
  });
  expect(built.success).toBe(true);
  const child = Bun.spawn(['node', join(directory, 'entry.mjs'), url, reason], { stdout: 'pipe', stderr: 'pipe' });
  cleanups.push(() => child.kill());
  const exitCode = await Promise.race([child.exited, Bun.sleep(10_000).then(() => 'timed out')]);
  if (exitCode === 'timed out') child.kill();
  return { exitCode, stdout: await new Response(child.stdout).text() };
};

describe('responding to a CloudFormation custom resource', () => {
  test('delivers a complete failure response whose reason is not ASCII', async () => {
    const received: { contentLength: string | null; body: string }[] = [];
    const server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch: async (request) => {
        received.push({ contentLength: request.headers.get('content-length'), body: await request.text() });
        return new Response(null);
      }
    });
    cleanups.push(() => server.stop(true));
    const reason = 'Cannot extract the function package: bin/é-escape points to ../日本/outside.';

    const result = await respondFromNode({ url: `http://127.0.0.1:${server.port}/response`, reason });

    expect(result).toEqual({ exitCode: 0, stdout: '200\n' });
    expect(received).toHaveLength(1);
    const body = JSON.parse(received[0]!.body) as { Status: string; Reason: string };
    expect(body.Status).toBe('FAILED');
    expect(body.Reason).toContain(reason);
    expect(Number(received[0]!.contentLength)).toBe(Buffer.byteLength(received[0]!.body));
  }, 20_000);
});
