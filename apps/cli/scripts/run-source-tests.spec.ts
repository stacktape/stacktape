import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { discoverSourceTests, runSourceTestFiles } from './run-source-tests';

const directories: string[] = [];
const githubActions = process.env.GITHUB_ACTIONS;
const messages: string[] = [];
let info: ReturnType<typeof spyOn>;
let error: ReturnType<typeof spyOn>;

beforeEach(() => {
  // Expected failures in child fixtures must not emit real CI failure annotations.
  delete process.env.GITHUB_ACTIONS;
  messages.length = 0;
  info = spyOn(console, 'info').mockImplementation((message) => messages.push(String(message)));
  error = spyOn(console, 'error').mockImplementation((message) => messages.push(String(message)));
});

const fixture = async (files: Record<string, string>) => {
  const cwd = await mkdtemp(join(tmpdir(), 'stacktape-source-tests-'));
  directories.push(cwd);
  await Promise.all(
    Object.entries(files).map(async ([file, content]) => {
      await mkdir(dirname(join(cwd, file)), { recursive: true });
      await writeFile(join(cwd, file), content);
    })
  );
  return cwd;
};

afterEach(async () => {
  info.mockRestore();
  error.mockRestore();
  if (githubActions === undefined) delete process.env.GITHUB_ACTIONS;
  else process.env.GITHUB_ACTIONS = githubActions;
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

test('discovers Bun source test names, including TSX, without dependencies or other lanes', async () => {
  const names = ['src/a.test.ts', 'src/b_spec.tsx', 'src/nested/c.spec.mjs', 'src/d_test.cts'];
  const cwd = await fixture(
    Object.fromEntries(
      [...names, 'src/plain.ts', 'tests/outside.spec.ts', 'src/node_modules/foreign.test.ts'].map((name) => [name, ''])
    )
  );
  expect(discoverSourceTests(cwd)).toEqual(names.toSorted());
});

test('uses distinct processes and reapplies the workspace preload for each test file', async () => {
  const code = `
    import { expect, test } from 'bun:test';
    import { writeFileSync } from 'node:fs';
    test('fresh process with preload', () => {
      expect(process.env.SOURCE_RUNNER_PRELOAD_PROOF).toBe('loaded');
      expect(process.env.SOURCE_RUNNER_LEAK).toBeUndefined();
      process.env.SOURCE_RUNNER_LEAK = 'must not survive';
      writeFileSync(import.meta.path + '.pid', String(process.pid));
    });
  `;
  const cwd = await fixture({
    'bunfig.toml': '[test]\npreload = ["./preload.ts"]\n',
    'preload.ts': 'process.env.SOURCE_RUNNER_PRELOAD_PROOF = "loaded";',
    'src/a.test.ts': code,
    'src/b.test.ts': code,
    'src/c.test.ts': code
  });
  const files = discoverSourceTests(cwd);
  expect(await runSourceTestFiles({ cwd, files })).toEqual([]);
  const pids = await Promise.all(files.map((file) => readFile(join(cwd, `${file}.pid`), 'utf8')));
  expect(new Set(pids).size).toBe(files.length);
});

test('reports assertion and import failures without dropping other files', async () => {
  const cwd = await fixture({
    'src/assertion.test.ts': 'import { test, expect } from "bun:test"; test("fails", () => expect(1).toBe(2));',
    'src/import.test.ts': 'throw new Error("import failure proof");',
    'src/pass.test.ts': 'import { test } from "bun:test"; test("passes", () => {});'
  });
  const failed = await runSourceTestFiles({ cwd, files: discoverSourceTests(cwd) });
  expect(failed.toSorted()).toEqual(['src/assertion.test.ts', 'src/import.test.ts']);
  expect(messages.join('\n')).toContain('import failure proof');
});

test('fails a hanging import within the process timeout', async () => {
  const cwd = await fixture({ 'src/hang.test.ts': 'await new Promise(() => { setInterval(() => {}, 100); });' });
  expect(await runSourceTestFiles({ cwd, files: discoverSourceTests(cwd), timeoutMs: 500 })).toEqual([
    'src/hang.test.ts'
  ]);
});

test('fails closed on an empty suite', async () => {
  await expect(runSourceTestFiles({ cwd: tmpdir(), files: [] })).rejects.toThrow('No CLI source test files');
});

test.skipIf(process.platform === 'win32')('interrupting the runner removes its active test process', async () => {
  const cwd = await fixture({
    'src/hang.test.ts': `
      import { writeFileSync } from 'node:fs';
      writeFileSync('active.pid', String(process.pid));
      await new Promise(() => { setInterval(() => {}, 100); });
    `,
    'launcher.ts': `
      import { runSourceTestFiles } from ${JSON.stringify(join(import.meta.dir, 'run-source-tests.ts'))};
      await runSourceTestFiles({ cwd: import.meta.dir, files: ['src/hang.test.ts'] });
    `
  });
  const runner = Bun.spawn([process.execPath, '--no-orphans', join(cwd, 'launcher.ts')], {
    cwd,
    stdout: 'ignore',
    stderr: 'ignore'
  });
  try {
    let pid: number | undefined;
    for (let attempt = 0; attempt < 100; attempt++) {
      try {
        pid = Number(await readFile(join(cwd, 'active.pid'), 'utf8'));
        break;
      } catch (error) {
        if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')) throw error;
        await Bun.sleep(20);
      }
    }
    expect(pid).toBeGreaterThan(0);
    runner.kill('SIGTERM');
    expect(await runner.exited).not.toBe(0);
    // The OS may reap the test just after the runner has exited.
    let running = true;
    for (let attempt = 0; attempt < 100 && running; attempt++) {
      try {
        process.kill(pid!, 0);
        await Bun.sleep(20);
      } catch (error) {
        if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ESRCH')) throw error;
        running = false;
      }
    }
    expect(running).toBe(false);
  } finally {
    runner.kill('SIGKILL');
    await runner.exited;
  }
});
