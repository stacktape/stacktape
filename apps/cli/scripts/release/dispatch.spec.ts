import { expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';

// Substitute the external gh executable; parsing, dispatch construction, process launch and HTTP delivery are real.
test('release command dispatches the selected channel, immutable version and source to its owning workflow', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-release-dispatch-'));
  const requests: { path: string; body: unknown }[] = [];
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch: async (request) => {
      const path = new URL(request.url).pathname;
      requests.push({ path, body: await request.json() });
      return new Response(null, {
        status:
          request.method === 'POST' && path === '/repos/stacktape/stacktape/actions/workflows/release.yml/dispatches'
            ? 204
            : 404
      });
    }
  });
  try {
    const commands = join(root, 'commands');
    await mkdir(commands);
    const driver = join(root, 'gh-fixture.ts');
    await writeFile(
      driver,
      `
import assert from 'node:assert/strict';
import { parseArgs } from 'node:util';
const [group, action, workflow, ...args] = process.argv.slice(2);
assert.equal(group, 'workflow');
assert.equal(action, 'run');
const { values } = parseArgs({ args, options: { repo: { type: 'string' }, ref: { type: 'string' }, f: { type: 'string', multiple: true } } });
const inputs = Object.fromEntries((values.f ?? []).map(field => { const index = field.indexOf('='); return [field.slice(0, index), field.slice(index + 1)]; }));
const endpoint = new URL(process.env.RELEASE_DISPATCH_ENDPOINT);
assert.equal(endpoint.hostname, '127.0.0.1');
const response = await fetch(new URL('/repos/' + values.repo + '/actions/workflows/' + workflow + '/dispatches', endpoint), {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ref: values.ref ?? 'main', inputs })
});
assert.equal(response.status, 204);
`
    );
    const build = await Bun.build({
      entrypoints: [driver],
      compile: { outfile: join(commands, process.platform === 'win32' ? 'gh.exe' : 'gh') }
    });
    expect(build.success, build.logs.map((log) => log.message).join('\n')).toBe(true);
    for (const args of [
      ['--channel', 'preview', '4.0.0-preview.23', '--ref', 'review/selected-source'],
      ['--channel', 'stable', '--version', '4.0.0']
    ]) {
      const child = Bun.spawn({
        cmd: [
          process.execPath,
          '--preload',
          resolve(import.meta.dir, '../network-guard-preload.ts'),
          join(import.meta.dir, 'trigger-release.ts'),
          ...args
        ],
        env: {
          PATH: [commands, process.env.PATH].join(delimiter),
          HOME: root,
          USERPROFILE: root,
          SYSTEMROOT: process.env.SYSTEMROOT,
          GH_CONFIG_DIR: root,
          HTTP_PROXY: 'http://127.0.0.1:9',
          HTTPS_PROXY: 'http://127.0.0.1:9',
          NO_PROXY: '127.0.0.1',
          RELEASE_DISPATCH_ENDPOINT: server.url.origin
        },
        stdout: 'pipe',
        stderr: 'pipe'
      });
      const deadline = setTimeout(() => child.kill('SIGKILL'), 10_000);
      try {
        const [exitCode, stdout, stderr] = await Promise.all([
          child.exited,
          new Response(child.stdout).text(),
          new Response(child.stderr).text()
        ]);
        expect(exitCode, stdout + stderr).toBe(0);
      } finally {
        clearTimeout(deadline);
      }
    }
    expect(requests).toEqual([
      {
        path: '/repos/stacktape/stacktape/actions/workflows/release.yml/dispatches',
        body: { ref: 'review/selected-source', inputs: { channel: 'preview', version: '4.0.0-preview.23' } }
      },
      {
        path: '/repos/stacktape/stacktape/actions/workflows/release.yml/dispatches',
        body: { ref: 'main', inputs: { channel: 'stable', version: '4.0.0' } }
      }
    ]);
  } finally {
    server.stop(true);
    await rm(root, { recursive: true, force: true });
  }
}, 30_000);
