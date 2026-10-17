import { expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFsExtraSingleCopyPlugin } from '@scripts/support/fs-extra-single-copy-plugin';

// Bun's callback-style fs errors have no stack. Bundled like the CLI, a failing fs-extra call must name its caller,
// whether the caller awaits the promise or returns it.
test('stackless fs-extra errors get the stack of their caller in a bundled CLI', async () => {
  const outdir = await mkdtemp(join(tmpdir(), 'stacktape-file-error-stacks-build-'));
  try {
    const build = await Bun.build({
      entrypoints: [join(import.meta.dir, 'file-error-stacks.fixture.ts')],
      outdir,
      target: 'bun',
      plugins: [createFsExtraSingleCopyPlugin()]
    });
    expect(build.success).toBe(true);
    const child = Bun.spawn([process.execPath, build.outputs[0]!.path], { stdout: 'pipe', stderr: 'pipe' });
    const [output, exitCode] = await Promise.all([new Response(child.stdout).text(), child.exited]);
    expect(exitCode).toBe(0);
    const stacks = JSON.parse(output) as Record<string, string>;

    expect(stacks.awaitingCaller).toStartWith('Error: EEXIST');
    expect(stacks.awaitingCaller).toContain('at awaitingCaller');
    expect(stacks.returningCaller).toStartWith('Error: ENOENT');
    expect(stacks.returningCaller).toContain('at returningCaller');
  } finally {
    await rm(outdir, { recursive: true, force: true });
  }
});
