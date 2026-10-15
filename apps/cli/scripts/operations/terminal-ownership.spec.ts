import { afterAll, beforeAll, expect, test } from 'bun:test';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import stripAnsi from 'strip-ansi';
import { buildOperationsCli, createOperationsFixture } from './cli-process';

let terminalDriver: Awaited<ReturnType<typeof buildOperationsCli>>;
beforeAll(async () => {
  terminalDriver = await buildOperationsCli(join(import.meta.dir, 'terminal-driver.ts'));
}, 60_000);
afterAll(async () => {
  await terminalDriver?.close();
});

const waitForFile = async (path: string) => {
  const deadline = Date.now() + 10_000;
  while (!(await Bun.file(path).exists())) {
    if (Date.now() > deadline) throw new Error(`Terminal scenario did not write ${path}`);
    await Bun.sleep(20);
  }
};

test.skipIf(process.platform === 'win32')(
  'view requests wait for a real modal answer or inherited child before taking the terminal',
  async () => {
    for (const mode of ['prompt', 'child']) {
      const fixture = await createOperationsFixture(terminalDriver.path);
      try {
        const run = fixture.start([mode], { tty: true });
        await run.waitFor(mode === 'prompt' ? 'Answer while a view change waits:' : 'Inherited child ready');
        const cursor = run.output().length;
        await writeFile(join(fixture.directory, 'request-view'), 'requested');
        await waitForFile(join(fixture.directory, 'request-processed'));
        const waitingOutput = run.output().slice(cursor);
        // A pending prompt keeps its alternate screen; an inherited child keeps the primary screen.
        expect(waitingOutput).not.toContain(mode === 'prompt' ? '\x1b[?1049l' : '\x1b[?1049h');
        run.write('ownership-answer\r');
        await waitForFile(join(fixture.directory, 'answer'));
        expect(await readFile(join(fixture.directory, 'answer'), 'utf8')).toBe(
          mode === 'prompt' ? 'ownership-answer' : 'child-done'
        );
        if (mode === 'child') await run.waitFor('Child answer: ownership-answer');
        await waitForFile(join(fixture.directory, 'view-restored'));
        expect(await readFile(join(fixture.directory, 'view-restored'), 'utf8')).toBe(
          mode === 'prompt' ? 'stream' : 'dashboard'
        );
        if (mode === 'child') await run.waitFor('ACTIVITY');
        await writeFile(join(fixture.directory, 'finish'), 'done');
        const result = await run.finished;
        expect(result.exitCode, stripAnsi(result.stdout)).toBe(0);
        expect(stripAnsi(result.stdout)).toContain('Terminal ownership complete');
        expect(result.stderr).toBe('');
        expect(fixture.aws.requests).toEqual([]);
        expect(fixture.api.calls).toEqual([]);
      } finally {
        await fixture.close();
      }
    }
  },
  60_000
);

test.skipIf(process.platform === 'win32')(
  'SIGINT closes the real dev dashboard before durable cleanup output and releases raw stdin',
  async () => {
    for (const mode of ['dev', 'dev-no-picker']) {
      const fixture = await createOperationsFixture(terminalDriver.path);
      try {
        const run = fixture.start([mode], { tty: true });
        await run.waitFor('ownership-dev');
        await run.waitFor('worker');
        const cursor = run.output().length;
        run.child.kill('SIGINT');
        const result = await run.finished;
        expect(result.exitCode, stripAnsi(result.stdout)).toBe(0);
        expect(JSON.parse(await readFile(join(fixture.directory, 'cleanup-state.json'), 'utf8'))).toEqual({
          raw: false,
          running: false
        });
        const cleanup = result.stdout.slice(cursor);
        const screenExit = cleanup.indexOf('\x1b[?1049l');
        expect(screenExit).toBeGreaterThanOrEqual(0);
        expect(cleanup.indexOf('Stopping dev workloads...')).toBeGreaterThan(screenExit);
        expect(stripAnsi(cleanup)).toContain('Stopping dev workloads...\r\n  worker\r\nDev cleanup complete');
        expect(cleanup.match(/Dev cleanup complete/g)).toHaveLength(1);
        expect(cleanup.slice(screenExit)).toContain('\x1b[?25h');
        expect(cleanup.slice(screenExit)).not.toContain('\x1b[?1049h');
        expect(result.stderr).toBe('');
        expect(fixture.aws.requests).toEqual([]);
        expect(fixture.api.calls).toEqual([]);
      } finally {
        await fixture.close();
      }
    }
  },
  30_000
);
