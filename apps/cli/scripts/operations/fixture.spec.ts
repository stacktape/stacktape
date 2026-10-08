import { afterAll, beforeAll, expect, test } from 'bun:test';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { buildOperationsCli, createOperationsFixture, seedDeployedStack, targetArgs } from './cli-process';

let cli: Awaited<ReturnType<typeof buildOperationsCli>>;
beforeAll(async () => {
  cli = await buildOperationsCli();
}, 60_000);
afterAll(async () => {
  await cli?.close();
});

const running = async (pid: number) => {
  if (process.platform === 'linux') {
    const stat = await readFile(`/proc/${pid}/stat`, 'utf8').catch(() => '');
    return stat !== '' && !stat.slice(stat.lastIndexOf(')') + 2).startsWith('Z');
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};
const expectStopped = async (pids: number[]) => {
  const deadline = Date.now() + 2_000;
  while ((await Promise.all(pids.map(running))).some(Boolean) && Date.now() < deadline) await Bun.sleep(20);
  expect(await Promise.all(pids.map(running))).toEqual(pids.map(() => false));
};

for (const { tty, finish } of [
  { tty: false, finish: 'readiness failure' },
  { tty: true, finish: 'readiness failure' },
  { tty: false, finish: 'timeout' },
  { tty: false, finish: 'normal exit' }
]) {
  test.skipIf(process.platform === 'win32')(
    `fixture stops unregistered script descendants after ${finish} (${tty ? 'PTY' : 'pipes'})`,
    async () => {
      const fixture = await createOperationsFixture(cli.path);
      let pids: number[] = [];
      try {
        seedDeployedStack(fixture);
        await writeFile(
          join(fixture.directory, 'wait.ts'),
          `import { spawn } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
process.on('SIGHUP', () => {});
const grandchild = spawn(process.execPath, ['--no-env-file', '-e', "import { writeFileSync } from 'node:fs'; process.on('SIGHUP', () => {}); writeFileSync('grandchild.ready', 'ready'); setInterval(() => {}, 1000);"], { stdio: 'ignore' });
while (!existsSync('grandchild.ready')) await Bun.sleep(10);
writeFileSync('tree.json', JSON.stringify([process.pid, grandchild.pid]));
grandchild.unref();
${finish === 'normal exit' ? '' : 'setInterval(() => {}, 1000);'}
`
        );
        await writeFile(
          join(fixture.directory, 'stacktape.yml'),
          JSON.stringify({
            resources: {},
            scripts: { wait: { type: 'local-script', properties: { executeScript: 'wait.ts', stdioMode: 'capture' } } }
          })
        );
        const run = fixture.start(['script:run', '--scriptName', 'wait', ...targetArgs], {
          tty,
          timeoutMs: finish === 'timeout' ? 3_000 : 30_000
        });
        const deadline = Date.now() + 10_000;
        // Observe PIDs independently for the assertion; deliberately never register them with fixture teardown.
        while (!pids.length && Date.now() < deadline) {
          pids = await readFile(join(fixture.directory, 'tree.json'), 'utf8')
            .then((text) => JSON.parse(text) as number[])
            .catch(() => []);
          if (!pids.length) await Bun.sleep(20);
        }
        expect(pids).toHaveLength(2);
        if (finish === 'readiness failure') {
          expect(await Promise.all(pids.map(running))).toEqual([true, true]);
          try {
            await run.waitFor('j9-missing-readiness', 0, 100);
            throw new Error('Readiness unexpectedly succeeded');
          } catch (error) {
            expect(String(error)).toContain('CLI did not show j9-missing-readiness');
          } finally {
            await fixture.close();
          }
        } else {
          const result = await run.finished;
          expect(result.exitCode, result.stdout).toBe(finish === 'normal exit' ? 0 : 137);
          if (finish === 'normal exit') expect(await running(pids[1])).toBe(true);
          await fixture.close();
        }
        await expectStopped([run.child.pid, ...pids]);
      } finally {
        await fixture.close();
        // Keep the deliberate broken-teardown fault check from leaking its known owned processes.
        for (const pid of pids) {
          if (await running(pid)) process.kill(pid, 'SIGKILL');
        }
        await expectStopped(pids);
      }
    },
    30_000
  );
}
